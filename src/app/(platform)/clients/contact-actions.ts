"use server";

import { createClient } from "@/lib/supabase/server";
import { sendBrevoEmail, sendBrevoSms } from "@/lib/brevo/client";

export type SendContactResult =
  | { ok: true; messageId: string }
  | { ok: false; message: string };

/** Envoie un SMS libre à un client via Brevo + log dans sms_log. */
export async function sendClientSmsAction(
  clientId: string,
  body: string,
): Promise<SendContactResult> {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, message: "Message vide." };
  if (trimmed.length > 480)
    return { ok: false, message: "SMS trop long (480 caractères max)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée." };

  const { data: client } = await supabase
    .from("clients")
    .select("phone, display_name")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) return { ok: false, message: "Client introuvable." };
  if (!client.phone) return { ok: false, message: "Pas de téléphone enregistré." };

  const res = await sendBrevoSms({
    recipient: client.phone,
    content: trimmed,
    tag: "manual-client",
  });
  if (!res.ok) return { ok: false, message: res.message };

  try {
    await supabase.from("sms_log").insert({
      client_id: clientId,
      to_phone: client.phone,
      body: trimmed,
      brevo_message_id: res.messageId,
      status: "sent",
      sent_at: new Date().toISOString(),
      trigger_source: "manual:client-fiche",
    });
  } catch {
    // Pas bloquant
  }

  return { ok: true, messageId: res.messageId };
}

/** Envoie un email libre à un client via Brevo + log dans email_log. */
export async function sendClientEmailAction(
  clientId: string,
  subject: string,
  body: string,
): Promise<SendContactResult> {
  const trimmedSubject = subject.trim();
  const trimmedBody = body.trim();
  if (!trimmedSubject) return { ok: false, message: "Objet requis." };
  if (!trimmedBody) return { ok: false, message: "Message vide." };
  if (trimmedSubject.length > 200)
    return { ok: false, message: "Objet trop long." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée." };

  const { data: client } = await supabase
    .from("clients")
    .select("email, display_name")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) return { ok: false, message: "Client introuvable." };
  if (!client.email) return { ok: false, message: "Pas d'email enregistré." };

  const htmlBody = trimmedBody
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");

  const res = await sendBrevoEmail({
    to: [{ email: client.email, name: client.display_name }],
    subject: trimmedSubject,
    htmlContent: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111;line-height:1.5">${htmlBody}</div>`,
    textContent: trimmedBody,
  });
  if (!res.ok) return { ok: false, message: res.message };

  try {
    await supabase.from("email_log").insert({
      client_id: clientId,
      to_email: client.email,
      subject: trimmedSubject,
      body_html: htmlBody,
      brevo_message_id: res.messageId,
      status: "sent",
      sent_at: new Date().toISOString(),
      trigger_source: "manual:client-fiche",
    });
  } catch {
    // Pas bloquant
  }

  return { ok: true, messageId: res.messageId };
}
