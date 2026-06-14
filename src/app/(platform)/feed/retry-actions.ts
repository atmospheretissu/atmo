"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendBrevoSms, sendBrevoEmail } from "@/lib/brevo/client";

export type RetryResult =
  | { ok: true; messageId: string }
  | { ok: false; message: string };

/** Relance un SMS échoué (lit le log, envoie à nouveau via Brevo, met à jour le log). */
export async function retrySmsAction(logId: string): Promise<RetryResult> {
  const supabase = await createClient();
  const { data: log, error } = await supabase
    .from("sms_log")
    .select("id, to_phone, body, template_key, trigger_source, client_id")
    .eq("id", logId)
    .maybeSingle();
  if (error || !log) return { ok: false, message: "Log SMS introuvable." };
  if (!log.body || !log.to_phone) return { ok: false, message: "Données du log incomplètes." };

  const r = await sendBrevoSms({
    recipient: log.to_phone,
    content: log.body,
    tag: log.trigger_source ?? "retry",
  });

  // Crée un NOUVEAU log (on garde l'historique d'échec)
  await supabase.from("sms_log").insert({
    template_key: log.template_key,
    client_id: log.client_id,
    to_phone: log.to_phone,
    body: log.body,
    brevo_message_id: r.ok ? r.messageId : null,
    status: r.ok ? "sent" : "failed",
    error: r.ok ? null : r.message,
    sent_at: r.ok ? new Date().toISOString() : null,
    trigger_source: `retry:${log.trigger_source ?? "manual"}`,
  });

  revalidatePath("/feed");
  return r;
}

/** Relance un email échoué. */
export async function retryEmailAction(logId: string): Promise<RetryResult> {
  const supabase = await createClient();
  const { data: log, error } = await supabase
    .from("email_log")
    .select("id, to_email, subject, body_html, template_key, trigger_source, client_id")
    .eq("id", logId)
    .maybeSingle();
  if (error || !log) return { ok: false, message: "Log email introuvable." };
  if (!log.to_email || !log.subject || !log.body_html)
    return { ok: false, message: "Données du log incomplètes." };

  // Récupère le nom du client si dispo
  let toName: string | undefined;
  if (log.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("display_name")
      .eq("id", log.client_id)
      .maybeSingle();
    toName = (client as { display_name?: string } | null)?.display_name;
  }

  const r = await sendBrevoEmail({
    to: [{ email: log.to_email, name: toName }],
    subject: log.subject,
    htmlContent: log.body_html,
  });

  await supabase.from("email_log").insert({
    template_key: log.template_key,
    client_id: log.client_id,
    to_email: log.to_email,
    subject: log.subject,
    body_html: log.body_html,
    brevo_message_id: r.ok ? r.messageId : null,
    status: r.ok ? "sent" : "failed",
    error: r.ok ? null : r.message,
    sent_at: r.ok ? new Date().toISOString() : null,
    trigger_source: `retry:${log.trigger_source ?? "manual"}`,
  });

  revalidatePath("/feed");
  return r;
}
