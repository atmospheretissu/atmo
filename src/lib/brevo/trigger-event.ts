import { getAutomationRule } from "@/lib/db/automation-rules";
import { getActiveAlertsForEvent } from "@/lib/db/event-alerts";
import { matchesCriteria } from "@/lib/db/event-alerts-shared";
import type { AlertCriteria, CriteriaContext, EventAlert } from "@/lib/db/event-alerts-shared";
import { sendSmsForTemplate, firstNameOf } from "./send-sms";
import { sendEmailForTemplate } from "./send-email";
import { sendBrevoSms, sendBrevoEmail, isBrevoConfigured } from "./client";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { DEFAULT_SENDER } from "@/lib/db/sms-templates-shared";
import type { EventKey } from "@/lib/db/automation-rules-shared";

export type TriggerContext = {
  toPhone?: string | null;
  toEmail?: string | null;
  toName?: string | null;
  clientId?: string | null;
  vars?: Record<string, string | number | undefined | null>;
  /** Contexte pour évaluer les critères des alertes internes. */
  criteriaContext?: CriteriaContext;
  /** Origine de l'appel (webhook, action, cron, manual…). Loggé dans sms_log / email_log. */
  triggerSource?: string;
};

export type TriggerEventResult = {
  eventKey: string;
  sms: { fired: boolean; ok?: boolean; message?: string; duplicate?: boolean } | null;
  email: { fired: boolean; ok?: boolean; message?: string } | null;
  ruleFound: boolean;
  alertsTotal: number;
  alertsMatched: number;
  alertsSent: { sms: number; email: number };
};

function interpolate(template: string, vars: Record<string, string | number | undefined | null>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    const v = vars[name];
    return v == null ? "" : String(v);
  });
}

/**
 * Dispatche une alerte interne à 1+ destinataires.
 * Best-effort : un destinataire qui échoue n'empêche pas les suivants.
 */
async function dispatchAlert(
  alert: EventAlert,
  vars: Record<string, string | number | undefined | null>,
  ctx: { eventKey: string; triggerSource?: string },
): Promise<{ sms: number; email: number }> {
  let smsCount = 0;
  let emailCount = 0;
  const supabaseAdmin = createServiceRoleClient();

  // SMS
  if (alert.send_sms) {
    for (const phone of alert.recipient_phones) {
      try {
        if (alert.sms_template_key) {
          const r = await sendSmsForTemplate({
            templateKey: alert.sms_template_key,
            toPhone: phone,
            vars,
            eventKey: ctx.eventKey,
            triggerSource: ctx.triggerSource ? `${ctx.triggerSource}+alert:${alert.id}` : `alert:${alert.id}`,
          });
          if (r.ok) smsCount += 1;
        } else if (alert.sms_body) {
          const body = interpolate(alert.sms_body, vars);
          const { data: logRow } = await supabaseAdmin
            .from("sms_log")
            .insert({
              template_key: null,
              to_phone: phone,
              body,
              status: "pending",
              event_key: ctx.eventKey,
              trigger_source: ctx.triggerSource ? `${ctx.triggerSource}+alert:${alert.id}` : `alert:${alert.id}`,
            })
            .select("id")
            .single();
          if (!isBrevoConfigured()) {
            if (logRow)
              await supabaseAdmin
                .from("sms_log")
                .update({ status: "skipped", error: "BREVO_API_KEY absent" })
                .eq("id", logRow.id);
            continue;
          }
          const sender = process.env.BREVO_SMS_SENDER ?? DEFAULT_SENDER;
          const r = await sendBrevoSms({
            recipient: phone,
            content: body,
            sender,
            tag: `alert:${alert.id}`,
          });
          if (logRow) {
            await supabaseAdmin
              .from("sms_log")
              .update(
                r.ok
                  ? {
                      status: "sent",
                      brevo_message_id: r.messageId,
                      sent_at: new Date().toISOString(),
                    }
                  : { status: "failed", error: r.message },
              )
              .eq("id", logRow.id);
          }
          if (r.ok) smsCount += 1;
        }
      } catch (err) {
        console.warn("[alert SMS]", phone, err);
      }
    }
  }

  // Email
  if (alert.send_email) {
    for (const email of alert.recipient_emails) {
      try {
        if (alert.email_template_key) {
          const r = await sendEmailForTemplate({
            templateKey: alert.email_template_key,
            toEmail: email,
            vars,
            eventKey: ctx.eventKey,
            triggerSource: ctx.triggerSource ? `${ctx.triggerSource}+alert:${alert.id}` : `alert:${alert.id}`,
          });
          if (r.ok) emailCount += 1;
        } else if (alert.email_html) {
          const subject = interpolate(alert.email_subject ?? "Alerte Atmosphère Tissus", vars);
          const html = interpolate(alert.email_html, vars);
          const { data: logRow } = await supabaseAdmin
            .from("email_log")
            .insert({
              template_key: null,
              to_email: email,
              subject,
              body_html: html,
              status: "pending",
              event_key: ctx.eventKey,
              trigger_source: ctx.triggerSource ? `${ctx.triggerSource}+alert:${alert.id}` : `alert:${alert.id}`,
            })
            .select("id")
            .single();
          if (!isBrevoConfigured()) {
            if (logRow)
              await supabaseAdmin
                .from("email_log")
                .update({ status: "skipped", error: "BREVO_API_KEY absent" })
                .eq("id", logRow.id);
            continue;
          }
          const r = await sendBrevoEmail({
            to: [{ email }],
            subject,
            htmlContent: html,
          });
          if (logRow) {
            await supabaseAdmin
              .from("email_log")
              .update(
                r.ok
                  ? {
                      status: "sent",
                      brevo_message_id: r.messageId,
                      sent_at: new Date().toISOString(),
                    }
                  : { status: "failed", error: r.message },
              )
              .eq("id", logRow.id);
          }
          if (r.ok) emailCount += 1;
        }
      } catch (err) {
        console.warn("[alert Email]", email, err);
      }
    }
  }

  return { sms: smsCount, email: emailCount };
}

/**
 * Déclencheur d'événement automatique.
 *
 *   1. Communication client (automation_rules) : SMS et/ou email selon config
 *   2. Alertes internes (event_alerts) : N alertes filtrées par critères,
 *      chacune envoyant vers ses propres destinataires
 *
 * Toutes les étapes sont best-effort.
 */
export async function triggerEvent(
  eventKey: EventKey | string,
  ctx: TriggerContext,
): Promise<TriggerEventResult> {
  const result: TriggerEventResult = {
    eventKey,
    sms: null,
    email: null,
    ruleFound: false,
    alertsTotal: 0,
    alertsMatched: 0,
    alertsSent: { sms: 0, email: 0 },
  };

  // 1. Communication client
  const rule = await getAutomationRule(eventKey);
  result.ruleFound = Boolean(rule);

  if (rule) {
    // SMS branch — always set result.sms with the reason
    if (!rule.sms_enabled) {
      result.sms = { fired: false, message: "SMS désactivé dans Architecture" };
    } else if (!rule.sms_template_key) {
      result.sms = { fired: false, message: "Aucun template SMS sélectionné" };
    } else if (!ctx.toPhone) {
      result.sms = { fired: false, message: "Pas de téléphone client" };
    } else {
      const r = await sendSmsForTemplate({
        templateKey: rule.sms_template_key,
        toPhone: ctx.toPhone,
        clientId: ctx.clientId ?? null,
        vars: ctx.vars,
        eventKey,
        triggerSource: ctx.triggerSource ?? null,
      });
      result.sms = {
        fired: true,
        ok: r.ok,
        message: r.ok ? undefined : r.message,
        duplicate: !r.ok && r.duplicate === true,
      };
    }

    // Email branch — always set result.email with the reason
    if (!rule.email_enabled) {
      result.email = { fired: false, message: "Email désactivé dans Architecture" };
    } else if (!rule.email_template_key) {
      result.email = { fired: false, message: "Aucun template email sélectionné" };
    } else if (!ctx.toEmail) {
      result.email = { fired: false, message: "Pas d'email client" };
    } else {
      const r = await sendEmailForTemplate({
        templateKey: rule.email_template_key,
        toEmail: ctx.toEmail,
        toName: ctx.toName ?? undefined,
        clientId: ctx.clientId ?? null,
        vars: ctx.vars,
        eventKey,
        triggerSource: ctx.triggerSource ?? null,
      });
      result.email = { fired: true, ok: r.ok, message: r.ok ? undefined : r.message };
    }
  }

  // 2. Alertes internes
  const alerts = await getActiveAlertsForEvent(eventKey);
  result.alertsTotal = alerts.length;

  // Vars enrichies pour les alertes internes
  const alertVars = {
    ...(ctx.vars ?? {}),
    event_key: eventKey,
    client_email: ctx.toEmail ?? "",
    client_phone: ctx.toPhone ?? "",
    client_nom: ctx.toName ?? "",
    montant: ctx.criteriaContext?.amount ?? "",
    canal: ctx.criteriaContext?.channel ?? "",
  };

  for (const alert of alerts) {
    if (!matchesCriteria(alert.criteria as AlertCriteria, ctx.criteriaContext)) continue;
    result.alertsMatched += 1;
    const sent = await dispatchAlert(alert, alertVars, {
      eventKey,
      triggerSource: ctx.triggerSource,
    });
    result.alertsSent.sms += sent.sms;
    result.alertsSent.email += sent.email;
  }

  return result;
}

export { firstNameOf };
