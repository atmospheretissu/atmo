import { supabase } from './supabase.js';
import { logger } from './logger.js';
import { env } from './env.js';
import type { ScrapedLead } from './scraper.js';

/**
 * Notifie Atmo qu'un lead vient d'être inséré → déclenche SMS/email/alertes
 * configurés dans /architecture côté Atmo. Fire-and-forget (timeout 3s) :
 *   - succès → SMS partent dans la seconde
 *   - erreur → le poller côté Atmo reprendra le lead (idempotent via alerts_sent_at)
 */
async function notifyAtmo(leadId: string): Promise<void> {
  if (!env.atmoWebhookUrl) return;
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 3000);
  try {
    const res = await fetch(env.atmoWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.atmoWebhookSecret ? { 'x-webhook-secret': env.atmoWebhookSecret } : {}),
      },
      body: JSON.stringify({ lead_id: leadId }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logger.warn({ status: res.status, body: text.slice(0, 200), leadId }, 'atmo webhook returned non-ok');
    } else {
      const data = (await res.json().catch(() => null)) as
        | { sms?: { ok?: boolean }; email?: { ok?: boolean }; alerts_matched?: number; alerts_sent?: { sms: number; email: number } }
        | null;
      logger.info(
        {
          leadId,
          sms_ok: data?.sms?.ok,
          email_ok: data?.email?.ok,
          alerts_matched: data?.alerts_matched,
          alerts_sent: data?.alerts_sent,
        },
        'atmo notified',
      );
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message, leadId }, 'atmo webhook call failed');
  } finally {
    clearTimeout(timeout);
  }
}

type PersistOutcome = {
  inserted: number;
  skipped: number;
};

function ymOfNow(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function nextLmNumber(): Promise<string> {
  const { data } = await supabase
    .from('lm_leads')
    .select('number')
    .like('number', `LM-${ymOfNow()}-%`)
    .order('number', { ascending: false })
    .limit(1);
  const lastSeq = data?.[0]?.number?.split('-').pop() ?? '0000';
  const next = String(Number(lastSeq) + 1).padStart(4, '0');
  return `LM-${ymOfNow()}-${next}`;
}

async function findOrCreateClient(lead: ScrapedLead): Promise<string | null> {
  if (!lead.display_name) return null;

  if (lead.email) {
    const { data } = await supabase
      .from('clients')
      .select('id')
      .eq('email', lead.email)
      .limit(1);
    if (data?.[0]?.id) return data[0].id as string;
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({
      display_name: lead.display_name,
      email: lead.email,
      phone: lead.phone,
      address_pose: lead.address,
      city: lead.city,
      postal_code: lead.postal_code,
      channel: 'leroy_merlin',
      source_notes: `Atmolead scrape — ${lead.source_url}`,
    })
    .select('id')
    .single();
  if (error) {
    logger.error({ err: error, lead: lead.external_ref }, 'failed to create client');
    return null;
  }
  return data.id as string;
}

export async function persistLeads(
  executionId: string,
  leads: ScrapedLead[],
): Promise<PersistOutcome> {
  let inserted = 0;
  let skipped = 0;

  for (const lead of leads) {
    if (!lead.external_ref) {
      await supabase.from('atmolead_leads_raw').insert({
        execution_id: executionId,
        raw_data: lead.raw_data,
        source_url: lead.source_url,
        inserted: false,
        skip_reason: 'missing_external_ref',
      });
      skipped++;
      continue;
    }

    const { data: existing } = await supabase
      .from('atmolead_leads_raw')
      .select('id, lm_lead_id')
      .eq('external_ref', lead.external_ref)
      .limit(1);

    if (existing?.[0]?.lm_lead_id) {
      await supabase.from('atmolead_leads_raw').insert({
        execution_id: executionId,
        external_ref: `${lead.external_ref}__seen_${Date.now()}`,
        raw_data: lead.raw_data,
        source_url: lead.source_url,
        inserted: false,
        skip_reason: 'duplicate',
      });
      skipped++;
      continue;
    }

    const clientId = await findOrCreateClient(lead);
    const lmNumber = await nextLmNumber();

    const { data: lmLead, error: lmErr } = await supabase
      .from('lm_leads')
      .insert({
        number: lmNumber,
        client_id: clientId,
        region: lead.region ?? 'inconnu',
        product_summary: lead.product_summary ?? '—',
        status: lead.status,
        amount: lead.amount,
        notes: `Atmolead ref: ${lead.external_ref}${lead.status_label ? ` · LM status: ${lead.status_label}` : ''}`,
      })
      .select('id')
      .single();

    if (lmErr || !lmLead) {
      logger.error({ err: lmErr, ref: lead.external_ref }, 'failed to insert lm_lead');
      await supabase.from('atmolead_leads_raw').insert({
        execution_id: executionId,
        external_ref: lead.external_ref,
        raw_data: lead.raw_data,
        source_url: lead.source_url,
        client_id: clientId,
        inserted: false,
        skip_reason: lmErr?.message ?? 'unknown',
      });
      skipped++;
      continue;
    }

    await supabase.from('atmolead_leads_raw').insert({
      execution_id: executionId,
      external_ref: lead.external_ref,
      raw_data: lead.raw_data,
      source_url: lead.source_url,
      client_id: clientId,
      lm_lead_id: lmLead.id,
      inserted: true,
    });

    // Notify Atmo instantanément — déclenche SMS/email/alertes.
    // fire-and-forget : on n'attend pas la réponse pour ne pas ralentir le scrape.
    void notifyAtmo(lmLead.id);

    inserted++;
  }

  return { inserted, skipped };
}
