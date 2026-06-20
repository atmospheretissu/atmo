"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { triggerEvent, firstNameOf } from "@/lib/brevo/trigger-event";
import { tryClaimLmLead, forceClaimLmLead } from "@/lib/events/lm-lead-claim";

export type LeadAlertResult =
  | {
      ok: true;
      alreadyProcessed: boolean;
      smsFired: boolean;
      smsOk?: boolean;
      smsMessage?: string;
      smsDuplicate?: boolean;
      emailFired: boolean;
      emailOk?: boolean;
      emailMessage?: string;
      alertsMatched: number;
      alertsSent: { sms: number; email: number };
    }
  | { ok: false; message: string };

/**
 * Déclenche manuellement l'événement "lead_lm_received" pour un lead.
 *
 *   - opts.force=false (défaut) : tente le claim atomique, retourne
 *     alreadyProcessed=true si le lead a déjà été traité (par webhook ou poller)
 *   - opts.force=true : force le re-déclenchement même si déjà traité
 */
export async function triggerLeadAlertAction(
  leadId: string,
  opts: { force?: boolean } = {},
): Promise<LeadAlertResult> {
  const supabase = await createClient();

  const { data: lead, error } = await supabase
    .from("lm_leads")
    .select("id, number, region, product_summary, amount, client_id")
    .eq("id", leadId)
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!lead) return { ok: false, message: "Lead introuvable" };

  // Claim atomique : empêche les doublons sauf si force=true
  let alreadyProcessed = false;
  if (opts.force) {
    await forceClaimLmLead(leadId);
  } else {
    const claimed = await tryClaimLmLead(leadId);
    if (!claimed) alreadyProcessed = true;
  }

  if (alreadyProcessed) {
    return {
      ok: true,
      alreadyProcessed: true,
      smsFired: false,
      smsMessage: "Déjà traité — utilisez force pour renvoyer",
      emailFired: false,
      emailMessage: "Déjà traité — utilisez force pour renvoyer",
      alertsMatched: 0,
      alertsSent: { sms: 0, email: 0 },
    };
  }

  const { data: client } = lead.client_id
    ? await supabase
        .from("clients")
        .select("display_name, phone, email")
        .eq("id", lead.client_id)
        .maybeSingle()
    : { data: null };

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
    triggerSource: opts.force ? "manual:leads-lm-button-force" : "manual:leads-lm-button",
  });

  revalidatePath("/leads-lm");
  revalidatePath("/feed");

  return {
    ok: true,
    alreadyProcessed: false,
    smsFired: result.sms?.fired ?? false,
    smsOk: result.sms?.ok,
    smsMessage: result.sms?.message,
    smsDuplicate: result.sms?.duplicate ?? false,
    emailFired: result.email?.fired ?? false,
    emailOk: result.email?.ok,
    emailMessage: result.email?.message,
    alertsMatched: result.alertsMatched,
    alertsSent: result.alertsSent,
  };
}
