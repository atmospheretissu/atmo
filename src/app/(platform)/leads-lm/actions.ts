"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { triggerEvent, firstNameOf } from "@/lib/brevo/trigger-event";

export type LeadAlertResult =
  | {
      ok: true;
      smsFired: boolean;
      smsOk?: boolean;
      smsMessage?: string;
      emailFired: boolean;
      emailOk?: boolean;
      emailMessage?: string;
      alertsMatched: number;
      alertsSent: { sms: number; email: number };
    }
  | { ok: false; message: string };

/**
 * Déclenche manuellement l'événement "lead_lm_received" pour un lead existant.
 * Utilisé pour :
 *   - relancer un lead reçu avant le branchement du webhook
 *   - tester le flow SMS/email/alertes sans attendre un nouveau lead
 */
export async function triggerLeadAlertAction(leadId: string): Promise<LeadAlertResult> {
  const supabase = await createClient();

  const { data: lead, error } = await supabase
    .from("lm_leads")
    .select("id, number, region, product_summary, amount, client_id")
    .eq("id", leadId)
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!lead) return { ok: false, message: "Lead introuvable" };

  // Récupère le client lié (pour avoir téléphone/email du contact LM)
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
      acompte: "",
    },
    criteriaContext: {
      amount: Number(lead.amount ?? 0),
    },
  });

  revalidatePath("/leads-lm");
  revalidatePath("/feed");

  return {
    ok: true,
    smsFired: result.sms?.fired ?? false,
    smsOk: result.sms?.ok,
    smsMessage: result.sms?.message,
    emailFired: result.email?.fired ?? false,
    emailOk: result.email?.ok,
    emailMessage: result.email?.message,
    alertsMatched: result.alertsMatched,
    alertsSent: result.alertsSent,
  };
}
