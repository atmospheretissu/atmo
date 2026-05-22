import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { triggerEvent, firstNameOf } from "@/lib/brevo/trigger-event";
import { tryClaimLmLead } from "@/lib/events/lm-lead-claim";

/**
 * Webhook : appelé par Supabase Database Webhooks à chaque INSERT dans lm_leads.
 *
 * Configuration côté Supabase :
 *   Dashboard → Database → Webhooks → Create a new hook
 *   - Name: lm_lead_created
 *   - Table: public.lm_leads
 *   - Events: INSERT
 *   - Type: HTTP Request
 *   - URL: https://atmo-production.up.railway.app/api/webhooks/lm-lead-created
 *   - Method: POST
 *   - Headers: x-webhook-secret = <random secret>
 *
 * Sécurité : on vérifie `x-webhook-secret` contre la variable d'env
 * SUPABASE_WEBHOOK_SECRET. Sans secret configuré côté serveur, le webhook
 * accepte tout (mode dev) — penser à le définir en prod.
 *
 * Le scraper Atmolead peut aussi appeler ce endpoint directement après insert.
 *
 * Body attendu (format Supabase Database Webhook) :
 *   { type: "INSERT", table: "lm_leads", record: { id, number, ... }, ... }
 * OU body custom :
 *   { lead_id: "uuid" }
 */
export async function POST(request: NextRequest) {
  // 1. Auth optionnelle par secret
  const expectedSecret = process.env.SUPABASE_WEBHOOK_SECRET;
  if (expectedSecret) {
    const provided = request.headers.get("x-webhook-secret");
    if (provided !== expectedSecret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  // 2. Extrait le lead_id (2 formats supportés)
  let leadId: string | null = null;
  if (typeof body === "object" && body !== null) {
    const b = body as Record<string, unknown>;
    if (typeof b.lead_id === "string") {
      leadId = b.lead_id;
    } else if (b.type === "INSERT" && b.table === "lm_leads") {
      const rec = b.record as Record<string, unknown> | undefined;
      if (rec && typeof rec.id === "string") leadId = rec.id;
    }
  }
  if (!leadId) {
    return NextResponse.json(
      { error: "lead_id missing — expected { lead_id } or Supabase webhook payload" },
      { status: 400 },
    );
  }

  // 3. Charge le lead
  const supabase = createServiceRoleClient();
  const { data: lead } = await supabase
    .from("lm_leads")
    .select("id, number, region, product_summary, amount, client_id, alerts_sent_at")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) {
    return NextResponse.json({ error: "lead not found", lead_id: leadId }, { status: 404 });
  }

  // 4. Atomic claim — empêche les doublons si plusieurs sources notifient.
  // Si le lead a déjà été traité (par le poller ou un précédent webhook),
  // on skip et on retourne already_processed.
  const claimed = await tryClaimLmLead(leadId);
  if (!claimed) {
    return NextResponse.json({
      ok: true,
      lead_id: leadId,
      already_processed: true,
      previously_processed_at: lead.alerts_sent_at,
    });
  }

  const { data: client } = lead.client_id
    ? await supabase
        .from("clients")
        .select("display_name, phone, email")
        .eq("id", lead.client_id)
        .maybeSingle()
    : { data: null };

  // 5. Trigger
  try {
    const result = await triggerEvent("lead_lm_received", {
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
      criteriaContext: {
        amount: Number(lead.amount ?? 0),
      },
      triggerSource: "webhook:lm-lead-created",
    });

    return NextResponse.json({
      ok: true,
      lead_id: leadId,
      sms: result.sms,
      email: result.email,
      alerts_matched: result.alertsMatched,
      alerts_sent: result.alertsSent,
    });
  } catch (err) {
    console.error("[lm-lead-created webhook]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "trigger failed" },
      { status: 500 },
    );
  }
}
