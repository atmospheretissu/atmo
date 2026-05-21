import { getAutomationRule } from "@/lib/db/automation-rules";
import { sendSmsForTemplate, firstNameOf } from "./send-sms";
import { sendEmailForTemplate } from "./send-email";
import type { EventKey } from "@/lib/db/automation-rules-shared";

export type TriggerContext = {
  toPhone?: string | null;
  toEmail?: string | null;
  toName?: string | null;
  clientId?: string | null;
  vars?: Record<string, string | number | undefined | null>;
};

export type TriggerEventResult = {
  eventKey: string;
  sms: { fired: boolean; ok?: boolean; message?: string } | null;
  email: { fired: boolean; ok?: boolean; message?: string } | null;
  ruleFound: boolean;
};

/**
 * Déclencheur d'événement automatique.
 *
 *   1. Lit la règle dans automation_rules pour cet event_key
 *   2. Si sms_enabled + sms_template_key + toPhone → envoie SMS
 *   3. Si email_enabled + email_template_key + toEmail → envoie email
 *   4. Best-effort : un échec SMS n'empêche pas l'email
 *
 * Tous les anciens triggers hardcodés (`sendSmsForTemplate({ templateKey: "devis_envoye", ... })`)
 * passent maintenant par cette fonction — l'admin contrôle SMS/email/templates
 * depuis l'onglet Architecture sans changer de code.
 */
export async function triggerEvent(
  eventKey: EventKey | string,
  ctx: TriggerContext,
): Promise<TriggerEventResult> {
  const rule = await getAutomationRule(eventKey);

  const result: TriggerEventResult = {
    eventKey,
    sms: null,
    email: null,
    ruleFound: Boolean(rule),
  };

  if (!rule) {
    return result;
  }

  // SMS
  if (rule.sms_enabled && rule.sms_template_key) {
    if (ctx.toPhone) {
      const r = await sendSmsForTemplate({
        templateKey: rule.sms_template_key,
        toPhone: ctx.toPhone,
        clientId: ctx.clientId ?? null,
        vars: ctx.vars,
      });
      result.sms = { fired: true, ok: r.ok, message: r.ok ? undefined : r.message };
    } else {
      result.sms = { fired: false, message: "Pas de toPhone fourni" };
    }
  }

  // Email
  if (rule.email_enabled && rule.email_template_key) {
    if (ctx.toEmail) {
      const r = await sendEmailForTemplate({
        templateKey: rule.email_template_key,
        toEmail: ctx.toEmail,
        toName: ctx.toName ?? undefined,
        clientId: ctx.clientId ?? null,
        vars: ctx.vars,
      });
      result.email = { fired: true, ok: r.ok, message: r.ok ? undefined : r.message };
    } else {
      result.email = { fired: false, message: "Pas de toEmail fourni" };
    }
  }

  return result;
}

export { firstNameOf };
