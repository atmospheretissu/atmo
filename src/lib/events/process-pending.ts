import { createServiceRoleClient } from "@/lib/supabase/server";
import { triggerEvent, firstNameOf } from "@/lib/brevo/trigger-event";

/**
 * Processeur poll-based : déclenche les SMS/email/alertes pour tous les
 * leads LM qui n'ont pas encore été traités (`alerts_sent_at IS NULL`).
 *
 * Appelé :
 *   1. En fire-and-forget depuis /leads-lm/page.tsx (chaque visite)
 *   2. Depuis l'endpoint /api/cron/process-pending-events (cron externe possible)
 *
 * Idempotent : une fois traité, le lead est marqué (`alerts_sent_at = now()`)
 * et ne sera plus repris au prochain run.
 */
export async function processPendingLmLeadAlerts(opts: { batchSize?: number } = {}): Promise<{
  processed: number;
  triggered: number;
  errors: number;
}> {
  const batchSize = opts.batchSize ?? 25;
  const supabase = createServiceRoleClient();

  const { data: pending, error } = await supabase
    .from("lm_leads")
    .select("id, number, region, product_summary, amount, client_id")
    .is("alerts_sent_at", null)
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (error) {
    console.warn("[processPendingLmLeadAlerts] DB error", error.message);
    return { processed: 0, triggered: 0, errors: 1 };
  }

  if (!pending || pending.length === 0) {
    return { processed: 0, triggered: 0, errors: 0 };
  }

  let triggered = 0;
  let errors = 0;

  for (const lead of pending) {
    try {
      const { data: client } = lead.client_id
        ? await supabase
            .from("clients")
            .select("display_name, phone, email")
            .eq("id", lead.client_id)
            .maybeSingle()
        : { data: null };

      const r = await triggerEvent("lead_lm_received", {
        toPhone: client?.phone ?? null,
        toEmail: client?.email ?? null,
        toName: client?.display_name ?? null,
        clientId: lead.client_id ?? null,
        vars: {
          prenom: firstNameOf(client?.display_name ?? ""),
          nom: client?.display_name ?? "",
          numero_devis: lead.number,
          produit: lead.product_summary,
          total_ttc: lead.amount ? String(Math.round(Number(lead.amount))) : "",
        },
        criteriaContext: { amount: Number(lead.amount ?? 0) },
      });

      // Marque traité même si Brevo a échoué (évite re-trigger en boucle)
      await supabase
        .from("lm_leads")
        .update({ alerts_sent_at: new Date().toISOString() })
        .eq("id", lead.id);

      if (
        r.sms?.fired ||
        r.email?.fired ||
        r.alertsSent.sms > 0 ||
        r.alertsSent.email > 0
      ) {
        triggered += 1;
      }
    } catch (err) {
      console.warn(`[processPendingLmLeadAlerts] lead ${lead.id} failed:`, err);
      errors += 1;
    }
  }

  return { processed: pending.length, triggered, errors };
}
