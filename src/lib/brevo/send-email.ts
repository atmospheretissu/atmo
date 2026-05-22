import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendBrevoEmail, isBrevoConfigured } from "./client";

export type EmailVars = Record<string, string | number | undefined | null>;

function interpolate(template: string, vars: EmailVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    const v = vars[name];
    return v == null ? "" : String(v);
  });
}

export type EmailSendResult =
  | { ok: true; messageId: string; subject: string; html: string; emailLogId: string }
  | { ok: false; message: string; emailLogId?: string };

export async function sendEmailForTemplate(args: {
  templateKey: string;
  toEmail: string;
  toName?: string;
  vars?: EmailVars;
  clientId?: string | null;
  eventKey?: string | null;
  triggerSource?: string | null;
}): Promise<EmailSendResult> {
  const supabase = createServiceRoleClient();

  const { data: template, error: tErr } = await supabase
    .from("email_templates")
    .select("key, subject, html_body, text_body, sender_email, sender_name, active")
    .eq("key", args.templateKey)
    .maybeSingle();

  if (tErr) return { ok: false, message: `DB error: ${tErr.message}` };
  if (!template) return { ok: false, message: `Email template "${args.templateKey}" introuvable` };
  if (!template.active) return { ok: false, message: `Template "${args.templateKey}" désactivé` };

  const subject = interpolate(template.subject, args.vars ?? {});
  const html = interpolate(template.html_body, args.vars ?? {});
  const text = template.text_body ? interpolate(template.text_body, args.vars ?? {}) : undefined;

  const senderEmail =
    template.sender_email ?? process.env.BREVO_SENDER_EMAIL ?? "contact@atmospheretissus.fr";
  const senderName =
    template.sender_name ?? process.env.BREVO_SENDER_NAME ?? "Atmosphère Tissus";

  const { data: logRow } = await supabase
    .from("email_log")
    .insert({
      template_key: template.key,
      client_id: args.clientId ?? null,
      to_email: args.toEmail,
      subject,
      body_html: html,
      status: "pending",
      event_key: args.eventKey ?? null,
      trigger_source: args.triggerSource ?? null,
    })
    .select("id")
    .single();

  const emailLogId = logRow?.id ?? "";

  if (!isBrevoConfigured()) {
    if (emailLogId) {
      await supabase
        .from("email_log")
        .update({ status: "skipped", error: "BREVO_API_KEY absent" })
        .eq("id", emailLogId);
    }
    return { ok: false, message: "BREVO_API_KEY non configurée", emailLogId };
  }

  const res = await sendBrevoEmail({
    to: [{ email: args.toEmail, name: args.toName }],
    subject,
    htmlContent: html,
    textContent: text,
    sender: { email: senderEmail, name: senderName },
  });

  if (res.ok) {
    if (emailLogId) {
      await supabase
        .from("email_log")
        .update({
          status: "sent",
          brevo_message_id: res.messageId,
          sent_at: new Date().toISOString(),
        })
        .eq("id", emailLogId);
    }
    return { ok: true, messageId: res.messageId, subject, html, emailLogId };
  } else {
    if (emailLogId) {
      await supabase
        .from("email_log")
        .update({ status: "failed", error: res.message })
        .eq("id", emailLogId);
    }
    return { ok: false, message: res.message, emailLogId };
  }
}
