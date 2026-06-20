import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendBrevoSms, isBrevoConfigured } from "./client";
import { normalizePhone } from "./normalize-phone";
import { DEFAULT_SENDER } from "@/lib/db/sms-templates-shared";

export type SmsVars = Record<string, string | number | undefined | null>;

const LEAD_ANCHORED_EVENTS: ReadonlySet<string> = new Set(["lead_lm_received"]);

export function firstNameOf(displayName: string | null | undefined): string {
  if (!displayName) return "";
  const cut = displayName.split(",");
  if (cut.length > 1) return cut[1].trim().split(/\s+/)[0] ?? "";
  return displayName.trim().split(/\s+/)[0] ?? "";
}

function interpolate(template: string, vars: SmsVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    const v = vars[name];
    return v == null ? "" : String(v);
  });
}

export type SmsSendResult =
  | { ok: true; messageId: string; body: string; sender: string; smsLogId: string }
  | { ok: false; message: string; smsLogId?: string; duplicate?: boolean };

/**
 * Envoie un SMS basé sur un template.
 *
 *   1. Charge le template (actif)
 *   2. Normalise le numéro en E.164
 *   3. Si event_key est dans LEAD_ANCHORED_EVENTS → dédup strict :
 *      si un SMS déjà sent/delivered existe pour ce (event_key, to_phone),
 *      on log "skipped_duplicate" et on n'appelle pas Brevo
 *   4. Sinon : insère pending, appelle Brevo, met à jour le statut
 */
export async function sendSmsForTemplate(args: {
  templateKey: string;
  toPhone: string;
  vars?: SmsVars;
  clientId?: string | null;
  overrideSender?: string;
  eventKey?: string | null;
  triggerSource?: string | null;
}): Promise<SmsSendResult> {
  const supabase = createServiceRoleClient();

  const { data: template, error: tErr } = await supabase
    .from("sms_templates")
    .select("id, key, body, sender, active")
    .eq("key", args.templateKey)
    .maybeSingle();

  if (tErr) return { ok: false, message: `DB error: ${tErr.message}` };
  if (!template) return { ok: false, message: `Template "${args.templateKey}" introuvable` };
  if (!template.active) return { ok: false, message: `Template "${args.templateKey}" désactivé` };

  const normalizedPhone = normalizePhone(args.toPhone) ?? args.toPhone;
  const body = interpolate(template.body, args.vars ?? {});
  const sender =
    args.overrideSender ??
    template.sender ??
    process.env.BREVO_SMS_SENDER ??
    DEFAULT_SENDER;

  // Dédup strict pour les events ancrés au lead (= ancrés au numéro)
  if (args.eventKey && LEAD_ANCHORED_EVENTS.has(args.eventKey)) {
    const { data: prior } = await supabase
      .from("sms_log")
      .select("id, sent_at, created_at, brevo_message_id, status")
      .eq("event_key", args.eventKey)
      .eq("to_phone", normalizedPhone)
      .in("status", ["sent", "delivered"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (prior) {
      const priorWhen = prior.sent_at ?? prior.created_at;
      const errorMsg = `SMS déjà envoyé le ${priorWhen} (msg ${prior.brevo_message_id ?? "n/a"})`;
      const { data: skipRow } = await supabase
        .from("sms_log")
        .insert({
          template_key: template.key,
          client_id: args.clientId ?? null,
          to_phone: normalizedPhone,
          body,
          status: "skipped_duplicate",
          error: errorMsg,
          event_key: args.eventKey ?? null,
          trigger_source: args.triggerSource ?? null,
        })
        .select("id")
        .single();

      return {
        ok: false,
        message: errorMsg,
        smsLogId: skipRow?.id ?? "",
        duplicate: true,
      };
    }
  }

  const { data: logRow } = await supabase
    .from("sms_log")
    .insert({
      template_key: template.key,
      client_id: args.clientId ?? null,
      to_phone: normalizedPhone,
      body,
      status: "pending",
      event_key: args.eventKey ?? null,
      trigger_source: args.triggerSource ?? null,
    })
    .select("id")
    .single();

  const smsLogId = logRow?.id ?? "";

  if (!isBrevoConfigured()) {
    if (smsLogId) {
      await supabase
        .from("sms_log")
        .update({ status: "skipped", error: "BREVO_API_KEY absent" })
        .eq("id", smsLogId);
    }
    return { ok: false, message: "BREVO_API_KEY non configurée", smsLogId };
  }

  const res = await sendBrevoSms({
    recipient: normalizedPhone,
    content: body,
    sender,
    tag: template.key,
  });

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
