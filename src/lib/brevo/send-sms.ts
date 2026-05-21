import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendBrevoSms, isBrevoConfigured } from "./client";
import { DEFAULT_SENDER } from "@/lib/db/sms-templates-shared";

export type SmsVars = Record<string, string | number | undefined | null>;

/**
 * Extrait le prénom depuis un display_name format "Nom, Prénom".
 * Si pas de virgule → retourne le premier mot.
 */
export function firstNameOf(displayName: string | null | undefined): string {
  if (!displayName) return "";
  const cut = displayName.split(",");
  if (cut.length > 1) return cut[1].trim().split(/\s+/)[0] ?? "";
  return displayName.trim().split(/\s+/)[0] ?? "";
}

/**
 * Interpole {{var}} dans un template.
 * Une variable absente devient une chaîne vide.
 */
function interpolate(template: string, vars: SmsVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    const v = vars[name];
    return v == null ? "" : String(v);
  });
}

export type SmsSendResult =
  | { ok: true; messageId: string; body: string; sender: string; smsLogId: string }
  | { ok: false; message: string; smsLogId?: string };

/**
 * Envoie un SMS basé sur un template stocké en DB.
 *
 *   1. Charge le template par `key` (doit exister + être actif)
 *   2. Interpole les variables
 *   3. Détermine le sender : template.sender || env BREVO_SMS_SENDER || DEFAULT_SENDER
 *   4. Insère une ligne pending dans sms_log
 *   5. Appelle Brevo
 *   6. Update sms_log avec le résultat
 *
 * Utilise le service_role : OK pour les server actions/webhooks/jobs côté serveur.
 * Les SMS partent uniquement si BREVO_API_KEY est configurée — sinon le log
 * est créé avec status='skipped' et aucun appel réseau n'est fait.
 */
export async function sendSmsForTemplate(args: {
  templateKey: string;
  toPhone: string;
  vars?: SmsVars;
  clientId?: string | null;
  overrideSender?: string;
}): Promise<SmsSendResult> {
  const supabase = createServiceRoleClient();

  // 1. Charge template
  const { data: template, error: tErr } = await supabase
    .from("sms_templates")
    .select("id, key, body, sender, active")
    .eq("key", args.templateKey)
    .maybeSingle();

  if (tErr) return { ok: false, message: `DB error: ${tErr.message}` };
  if (!template) return { ok: false, message: `Template "${args.templateKey}" introuvable` };
  if (!template.active) return { ok: false, message: `Template "${args.templateKey}" désactivé` };

  const body = interpolate(template.body, args.vars ?? {});
  const sender =
    args.overrideSender ??
    template.sender ??
    process.env.BREVO_SMS_SENDER ??
    DEFAULT_SENDER;

  // 2. Log pending
  const { data: logRow } = await supabase
    .from("sms_log")
    .insert({
      template_key: template.key,
      client_id: args.clientId ?? null,
      to_phone: args.toPhone,
      body,
      status: "pending",
    })
    .select("id")
    .single();

  const smsLogId = logRow?.id ?? "";

  // 3. Skip si Brevo pas configuré
  if (!isBrevoConfigured()) {
    if (smsLogId) {
      await supabase
        .from("sms_log")
        .update({ status: "skipped", error: "BREVO_API_KEY absent" })
        .eq("id", smsLogId);
    }
    return { ok: false, message: "BREVO_API_KEY non configurée", smsLogId };
  }

  // 4. Appel Brevo
  const res = await sendBrevoSms({
    recipient: args.toPhone,
    content: body,
    sender,
    tag: template.key,
  });

  // 5. Update log
  if (res.ok) {
    if (smsLogId) {
      await supabase
        .from("sms_log")
        .update({
          status: "sent",
          brevo_message_id: res.messageId,
          sent_at: new Date().toISOString(),
        })
        .eq("id", smsLogId);
    }
    return { ok: true, messageId: res.messageId, body, sender, smsLogId };
  } else {
    if (smsLogId) {
      await supabase
        .from("sms_log")
        .update({ status: "failed", error: res.message })
        .eq("id", smsLogId);
    }
    return { ok: false, message: res.message, smsLogId };
  }
}
