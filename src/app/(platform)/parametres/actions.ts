"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupplierInsert, SupplierUpdate } from "@/lib/db/suppliers";
import type { ProfileUpdate, UserRole } from "@/lib/db/profiles";
import type { SmsTemplate, SmsTemplateUpdate } from "@/lib/db/sms-templates";
import type { EmailTemplate, EmailTemplateUpdate } from "@/lib/db/email-templates-shared";
import type { AutomationRuleUpdate } from "@/lib/db/automation-rules-shared";
import type { EventAlertInsert, EventAlertUpdate, AlertCriteria } from "@/lib/db/event-alerts-shared";
import type { UserRole as RoleEnum } from "@/lib/db/profiles-shared";
import { sendSmsForTemplate } from "@/lib/brevo/send-sms";

type Result = { ok: true } | { ok: false; message: string };

export async function createSupplierAction(input: SupplierInsert): Promise<Result> {
  const supabase = await createClient();
  if (!input.name?.trim()) return { ok: false, message: "Nom requis" };
  if (!input.type) return { ok: false, message: "Type requis" };
  if (!input.country?.trim()) return { ok: false, message: "Pays requis" };
  const { error } = await supabase.from("suppliers").insert({
    name: input.name.trim(),
    type: input.type,
    country: input.country.trim().toUpperCase(),
    language: input.language ?? "FR",
    contact_email: input.contact_email?.trim() || null,
    contact_phone: input.contact_phone?.trim() || null,
    franco_ht: input.franco_ht ?? 0,
    notes: input.notes?.trim() || null,
    portal_url: input.portal_url?.trim() || null,
    active: input.active ?? true,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  return { ok: true };
}

export async function updateSupplierAction(
  id: string,
  patch: SupplierUpdate
): Promise<Result> {
  const supabase = await createClient();
  const sanitized: SupplierUpdate = {};
  if (patch.name !== undefined) sanitized.name = patch.name.trim();
  if (patch.type !== undefined) sanitized.type = patch.type;
  if (patch.country !== undefined) sanitized.country = patch.country.trim().toUpperCase();
  if (patch.language !== undefined) sanitized.language = patch.language;
  if (patch.contact_email !== undefined)
    sanitized.contact_email = patch.contact_email?.toString().trim() || null;
  if (patch.contact_phone !== undefined)
    sanitized.contact_phone = patch.contact_phone?.toString().trim() || null;
  if (patch.franco_ht !== undefined) sanitized.franco_ht = patch.franco_ht;
  if (patch.notes !== undefined) sanitized.notes = patch.notes?.toString().trim() || null;
  if (patch.portal_url !== undefined)
    sanitized.portal_url = patch.portal_url?.toString().trim() || null;
  if (patch.active !== undefined) sanitized.active = patch.active;

  const { error } = await supabase.from("suppliers").update(sanitized).eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  revalidatePath("/commandes");
  return { ok: true };
}

export async function toggleSupplierActiveAction(
  id: string,
  active: boolean
): Promise<Result> {
  return updateSupplierAction(id, { active });
}

export async function updateProfileAction(
  id: string,
  patch: { full_name?: string; phone?: string | null; role?: UserRole }
): Promise<Result> {
  const supabase = await createClient();
  const sanitized: ProfileUpdate = {};
  if (patch.full_name !== undefined) {
    if (!patch.full_name.trim()) return { ok: false, message: "Nom requis" };
    sanitized.full_name = patch.full_name.trim();
    // avatar_initial est une colonne GENERATED ALWAYS — Postgres la calcule
    // depuis full_name, on ne la set pas manuellement.
  }
  if (patch.phone !== undefined) sanitized.phone = patch.phone?.trim() || null;
  if (patch.role !== undefined) sanitized.role = patch.role;
  const { error } = await supabase.from("profiles").update(sanitized).eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  return { ok: true };
}

export async function toggleProfileActiveAction(
  id: string,
  active: boolean
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ active }).eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  return { ok: true };
}

export async function updateSmsTemplateAction(
  id: string,
  patch: {
    body?: string;
    active?: boolean;
    label?: string;
    trigger_description?: string | null;
    sender?: string | null;
  },
): Promise<Result> {
  const supabase = await createClient();
  const sanitized: SmsTemplateUpdate = {};
  if (patch.body !== undefined) {
    if (!patch.body.trim()) return { ok: false, message: "Corps du SMS requis" };
    sanitized.body = patch.body.trim();
  }
  if (patch.active !== undefined) sanitized.active = patch.active;
  if (patch.label !== undefined && patch.label.trim()) sanitized.label = patch.label.trim();
  if (patch.trigger_description !== undefined)
    sanitized.trigger_description = patch.trigger_description?.trim() || null;
  if (patch.sender !== undefined) {
    const s = patch.sender?.trim();
    if (s && (s.length < 3 || s.length > 11)) {
      return { ok: false, message: "Expéditeur : 3 à 11 caractères" };
    }
    if (s && !/^[A-Za-z0-9 _-]+$/.test(s)) {
      return { ok: false, message: "Expéditeur : lettres, chiffres, espace, _ ou - uniquement" };
    }
    sanitized.sender = s || null;
  }
  const { error } = await supabase.from("sms_templates").update(sanitized).eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  return { ok: true };
}

export async function deleteSupplierAction(id: string): Promise<Result> {
  const supabase = await createClient();
  // Bloque la suppression si un BC référence ce fournisseur
  const { count } = await supabase
    .from("bons_commande")
    .select("*", { count: "exact", head: true })
    .eq("supplier_id", id);
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      message: `Impossible : ${count} BC référence(nt) ce fournisseur. Désactive-le plutôt.`,
    };
  }
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  return { ok: true };
}

/**
 * Envoie un SMS de test pour un template donné (utilisé depuis l'UI Paramètres).
 * Les variables sont remplies avec des valeurs factices pour la démo.
 */
export async function sendTestSmsAction(
  templateId: string,
  phone: string,
): Promise<{ ok: true; messageId: string } | { ok: false; message: string }> {
  if (!/^\+[1-9]\d{6,14}$/.test(phone.trim())) {
    return { ok: false, message: "Format attendu : +33612345678 (E.164)" };
  }
  const supabase = await createClient();
  const { data: template } = await supabase
    .from("sms_templates")
    .select("key")
    .eq("id", templateId)
    .maybeSingle();
  if (!template) return { ok: false, message: "Template introuvable" };

  const r = await sendSmsForTemplate({
    templateKey: template.key,
    toPhone: phone.trim(),
    vars: {
      prenom: "Hélène",
      produit: "Rideau salon",
      date: "lundi 26 mai",
      heure: "10h",
      poseur: "Romain",
      acompte: "490",
      lien_pdf: "https://atmospheretissus.fr/d/abc",
      lien_avis: "https://g.page/atmospheretissus/review",
    },
    triggerSource: "test:templates-sms-button",
  });
  if (!r.ok) return { ok: false, message: r.message };
  return { ok: true, messageId: r.messageId };
}

/**
 * Envoi de test 100% configurable (Test tab).
 * Permet de fournir body / sender / vars custom au lieu de tirer du template.
 */
export async function sendCustomSmsAction(input: {
  phone: string;
  body: string;
  sender?: string;
  templateKey?: string | null;
  vars?: Record<string, string>;
}): Promise<{ ok: true; messageId: string; bodyInterpolated: string } | { ok: false; message: string }> {
  if (!/^\+[1-9]\d{6,14}$/.test(input.phone.trim())) {
    return { ok: false, message: "Format attendu : +33612345678 (E.164)" };
  }
  if (!input.body.trim()) return { ok: false, message: "Corps du SMS vide" };
  if (input.sender && (input.sender.length < 3 || input.sender.length > 11)) {
    return { ok: false, message: "Expéditeur : 3 à 11 caractères" };
  }

  const { sendBrevoSms, isBrevoConfigured } = await import("@/lib/brevo/client");
  const { DEFAULT_SENDER } = await import("@/lib/db/sms-templates-shared");
  const { createServiceRoleClient } = await import("@/lib/supabase/server");

  const interpolated = input.body.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    return input.vars?.[name] ?? "";
  });

  const sender = input.sender?.trim() || process.env.BREVO_SMS_SENDER || DEFAULT_SENDER;

  const supabaseAdmin = createServiceRoleClient();
  const { data: logRow } = await supabaseAdmin
    .from("sms_log")
    .insert({
      template_key: input.templateKey ?? null,
      to_phone: input.phone.trim(),
      body: interpolated,
      status: "pending",
      trigger_source: "test:sms-tab",
    })
    .select("id")
    .single();

  if (!isBrevoConfigured()) {
    if (logRow) {
      await supabaseAdmin
        .from("sms_log")
        .update({ status: "skipped", error: "BREVO_API_KEY absent" })
        .eq("id", logRow.id);
    }
    revalidatePath("/parametres");
    return { ok: false, message: "BREVO_API_KEY non configurée" };
  }

  const r = await sendBrevoSms({
    recipient: input.phone.trim(),
    content: interpolated,
    sender,
    tag: input.templateKey ?? "test",
  });

  if (r.ok) {
    if (logRow) {
      await supabaseAdmin
        .from("sms_log")
        .update({
          status: "sent",
          brevo_message_id: r.messageId,
          sent_at: new Date().toISOString(),
        })
        .eq("id", logRow.id);
    }
    revalidatePath("/parametres");
    return { ok: true, messageId: r.messageId, bodyInterpolated: interpolated };
  } else {
    if (logRow) {
      await supabaseAdmin
        .from("sms_log")
        .update({ status: "failed", error: r.message })
        .eq("id", logRow.id);
    }
    revalidatePath("/parametres");
    return { ok: false, message: r.message };
  }
}

export async function refreshBrevoStatusAction(): Promise<{ ok: true }> {
  revalidatePath("/parametres");
  return { ok: true };
}

/**
 * Charge à la demande les données du Test tab (Brevo account + log).
 * Évite le blocking call HTTP à Brevo sur chaque SSR de /parametres.
 */
export async function loadTestTabDataAction(): Promise<{
  brevoAccount: import("@/lib/brevo/account").BrevoAccountInfo;
  recentSmsLog: import("@/lib/db/sms-log").SmsLogWithMeta[];
}> {
  const { getBrevoAccount } = await import("@/lib/brevo/account");
  const { listRecentSmsLog } = await import("@/lib/db/sms-log");
  const [brevoAccount, recentSmsLog] = await Promise.all([
    getBrevoAccount(),
    listRecentSmsLog(20),
  ]);
  return { brevoAccount, recentSmsLog };
}

export async function updateEmailTemplateAction(
  id: string,
  patch: {
    subject?: string;
    html_body?: string;
    text_body?: string | null;
    sender_email?: string | null;
    sender_name?: string | null;
    label?: string;
    trigger_description?: string | null;
    active?: boolean;
  },
): Promise<Result> {
  const supabase = await createClient();
  const sanitized: EmailTemplateUpdate = {};
  if (patch.subject !== undefined) {
    if (!patch.subject.trim()) return { ok: false, message: "Sujet requis" };
    sanitized.subject = patch.subject.trim();
  }
  if (patch.html_body !== undefined) {
    if (!patch.html_body.trim()) return { ok: false, message: "Corps HTML requis" };
    sanitized.html_body = patch.html_body;
  }
  if (patch.text_body !== undefined) sanitized.text_body = patch.text_body?.trim() || null;
  if (patch.sender_email !== undefined)
    sanitized.sender_email = patch.sender_email?.trim() || null;
  if (patch.sender_name !== undefined)
    sanitized.sender_name = patch.sender_name?.trim() || null;
  if (patch.label !== undefined && patch.label.trim()) sanitized.label = patch.label.trim();
  if (patch.trigger_description !== undefined)
    sanitized.trigger_description = patch.trigger_description?.trim() || null;
  if (patch.active !== undefined) sanitized.active = patch.active;

  const { error } = await supabase.from("email_templates").update(sanitized).eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  return { ok: true };
}

export async function updateAutomationRuleAction(
  id: string,
  patch: {
    sms_enabled?: boolean;
    sms_template_key?: string | null;
    email_enabled?: boolean;
    email_template_key?: string | null;
  },
): Promise<Result> {
  const supabase = await createClient();
  const sanitized: AutomationRuleUpdate = {};
  if (patch.sms_enabled !== undefined) sanitized.sms_enabled = patch.sms_enabled;
  if (patch.sms_template_key !== undefined)
    sanitized.sms_template_key = patch.sms_template_key || null;
  if (patch.email_enabled !== undefined) sanitized.email_enabled = patch.email_enabled;
  if (patch.email_template_key !== undefined)
    sanitized.email_template_key = patch.email_template_key || null;
  sanitized.updated_at = new Date().toISOString();

  const { error } = await supabase.from("automation_rules").update(sanitized).eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  return { ok: true };
}

export async function sendCustomEmailAction(input: {
  toEmail: string;
  toName?: string;
  subject: string;
  htmlBody: string;
  templateKey?: string | null;
  vars?: Record<string, string>;
}): Promise<
  { ok: true; messageId: string; bodyHtml: string; subject: string }
  | { ok: false; message: string }
> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.toEmail.trim())) {
    return { ok: false, message: "Email destinataire invalide" };
  }
  if (!input.subject.trim()) return { ok: false, message: "Sujet vide" };
  if (!input.htmlBody.trim()) return { ok: false, message: "Corps HTML vide" };

  const { sendBrevoEmail, isBrevoConfigured } = await import("@/lib/brevo/client");
  const { createServiceRoleClient } = await import("@/lib/supabase/server");

  const interpolated = {
    subject: input.subject.replace(/\{\{(\w+)\}\}/g, (_, k) => input.vars?.[k] ?? ""),
    html: input.htmlBody.replace(/\{\{(\w+)\}\}/g, (_, k) => input.vars?.[k] ?? ""),
  };

  const supabaseAdmin = createServiceRoleClient();
  const { data: logRow } = await supabaseAdmin
    .from("email_log")
    .insert({
      template_key: input.templateKey ?? null,
      to_email: input.toEmail.trim(),
      subject: interpolated.subject,
      body_html: interpolated.html,
      status: "pending",
      trigger_source: "test:email-tab",
    })
    .select("id")
    .single();

  if (!isBrevoConfigured()) {
    if (logRow) {
      await supabaseAdmin
        .from("email_log")
        .update({ status: "skipped", error: "BREVO_API_KEY absent" })
        .eq("id", logRow.id);
    }
    revalidatePath("/parametres");
    return { ok: false, message: "BREVO_API_KEY non configurée" };
  }

  const r = await sendBrevoEmail({
    to: [{ email: input.toEmail.trim(), name: input.toName }],
    subject: interpolated.subject,
    htmlContent: interpolated.html,
  });

  if (r.ok) {
    if (logRow) {
      await supabaseAdmin
        .from("email_log")
        .update({
          status: "sent",
          brevo_message_id: r.messageId,
          sent_at: new Date().toISOString(),
        })
        .eq("id", logRow.id);
    }
    revalidatePath("/parametres");
    return {
      ok: true,
      messageId: r.messageId,
      bodyHtml: interpolated.html,
      subject: interpolated.subject,
    };
  } else {
    if (logRow) {
      await supabaseAdmin
        .from("email_log")
        .update({ status: "failed", error: r.message })
        .eq("id", logRow.id);
    }
    revalidatePath("/parametres");
    return { ok: false, message: r.message };
  }
}

export async function loadEmailLogAction(): Promise<{
  rows: import("@/lib/db/email-log").EmailLogWithMeta[];
}> {
  const { listRecentEmailLog } = await import("@/lib/db/email-log");
  const rows = await listRecentEmailLog(20);
  return { rows };
}

/* ============================ EVENT ALERTS CRUD ============================ */

function sanitizePhones(raw: string): string[] {
  return raw
    .split(/[\n,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function sanitizeEmails(raw: string): string[] {
  return raw
    .split(/[\n,;]/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

export async function createEventAlertAction(input: {
  event_key: string;
  label: string;
  send_sms: boolean;
  send_email: boolean;
  recipient_phones: string; // raw textarea content
  recipient_emails: string; // raw textarea content
  sms_template_key?: string | null;
  email_template_key?: string | null;
  sms_body?: string;
  email_subject?: string;
  email_html?: string;
  criteria?: AlertCriteria;
  active?: boolean;
}): Promise<Result> {
  if (!input.event_key) return { ok: false, message: "event_key requis" };
  if (!input.label.trim()) return { ok: false, message: "Libellé requis" };
  const phones = sanitizePhones(input.recipient_phones);
  const emails = sanitizeEmails(input.recipient_emails);
  if (input.send_sms && phones.length === 0)
    return { ok: false, message: "SMS activé : au moins un numéro requis" };
  if (input.send_email && emails.length === 0)
    return { ok: false, message: "Email activé : au moins un email requis" };
  if (input.send_sms && !input.sms_template_key && !input.sms_body?.trim())
    return { ok: false, message: "SMS : template ou corps requis" };
  if (input.send_email && !input.email_template_key && !input.email_html?.trim())
    return { ok: false, message: "Email : template ou corps HTML requis" };

  const supabase = await createClient();
  const payload: EventAlertInsert = {
    event_key: input.event_key,
    label: input.label.trim(),
    send_sms: input.send_sms,
    send_email: input.send_email,
    recipient_phones: phones,
    recipient_emails: emails,
    sms_template_key: input.sms_template_key || null,
    email_template_key: input.email_template_key || null,
    sms_body: input.sms_body?.trim() || null,
    email_subject: input.email_subject?.trim() || null,
    email_html: input.email_html?.trim() || null,
    criteria: (input.criteria as Record<string, unknown>) ?? {},
    active: input.active ?? true,
  };
  const { error } = await supabase.from("event_alerts").insert(payload);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  return { ok: true };
}

export async function updateEventAlertAction(
  id: string,
  input: Partial<{
    label: string;
    active: boolean;
    send_sms: boolean;
    send_email: boolean;
    recipient_phones: string;
    recipient_emails: string;
    sms_template_key: string | null;
    email_template_key: string | null;
    sms_body: string;
    email_subject: string;
    email_html: string;
    criteria: AlertCriteria;
  }>,
): Promise<Result> {
  const supabase = await createClient();
  const sanitized: EventAlertUpdate = {};
  if (input.label !== undefined) {
    if (!input.label.trim()) return { ok: false, message: "Libellé requis" };
    sanitized.label = input.label.trim();
  }
  if (input.active !== undefined) sanitized.active = input.active;
  if (input.send_sms !== undefined) sanitized.send_sms = input.send_sms;
  if (input.send_email !== undefined) sanitized.send_email = input.send_email;
  if (input.recipient_phones !== undefined)
    sanitized.recipient_phones = sanitizePhones(input.recipient_phones);
  if (input.recipient_emails !== undefined)
    sanitized.recipient_emails = sanitizeEmails(input.recipient_emails);
  if (input.sms_template_key !== undefined)
    sanitized.sms_template_key = input.sms_template_key || null;
  if (input.email_template_key !== undefined)
    sanitized.email_template_key = input.email_template_key || null;
  if (input.sms_body !== undefined) sanitized.sms_body = input.sms_body?.trim() || null;
  if (input.email_subject !== undefined)
    sanitized.email_subject = input.email_subject?.trim() || null;
  if (input.email_html !== undefined) sanitized.email_html = input.email_html?.trim() || null;
  if (input.criteria !== undefined)
    sanitized.criteria = input.criteria as Record<string, unknown>;
  sanitized.updated_at = new Date().toISOString();

  const { error } = await supabase.from("event_alerts").update(sanitized).eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  return { ok: true };
}

export async function deleteEventAlertAction(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("event_alerts").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  return { ok: true };
}

/* ============================ TEMPLATES CRUD ============================ */

function sanitizeKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function createSmsTemplateAction(input: {
  key: string;
  label: string;
  body: string;
  sender?: string;
  trigger_description?: string;
  active?: boolean;
}): Promise<{ ok: true; template: SmsTemplate } | { ok: false; message: string }> {
  const key = sanitizeKey(input.key);
  if (!key) return { ok: false, message: "Clé requise (lettres/chiffres/_)" };
  if (!input.label.trim()) return { ok: false, message: "Libellé requis" };
  if (!input.body.trim()) return { ok: false, message: "Corps requis" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sms_templates")
    .insert({
      key,
      label: input.label.trim(),
      body: input.body.trim(),
      sender: input.sender?.trim() || null,
      trigger_description: input.trigger_description?.trim() || null,
      active: input.active ?? true,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, message: `La clé "${key}" existe déjà` };
    return { ok: false, message: error.message };
  }
  revalidatePath("/templates");
  revalidatePath("/architecture");
  return { ok: true, template: data as SmsTemplate };
}

export async function deleteSmsTemplateAction(id: string): Promise<Result> {
  const supabase = await createClient();
  // Vérifie qu'il n'est pas utilisé par une règle ou une alerte
  const { data: tmpl } = await supabase
    .from("sms_templates")
    .select("key")
    .eq("id", id)
    .maybeSingle();
  if (!tmpl) return { ok: false, message: "Template introuvable" };
  const [{ count: ruleUsage }, { count: alertUsage }] = await Promise.all([
    supabase
      .from("automation_rules")
      .select("*", { count: "exact", head: true })
      .eq("sms_template_key", tmpl.key),
    supabase
      .from("event_alerts")
      .select("*", { count: "exact", head: true })
      .eq("sms_template_key", tmpl.key),
  ]);
  const total = (ruleUsage ?? 0) + (alertUsage ?? 0);
  if (total > 0) {
    return {
      ok: false,
      message: `Template utilisé par ${ruleUsage ?? 0} règle(s) et ${alertUsage ?? 0} alerte(s) — désactive-le plutôt`,
    };
  }
  const { error } = await supabase.from("sms_templates").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/templates");
  return { ok: true };
}

export async function createEmailTemplateAction(input: {
  key: string;
  label: string;
  subject: string;
  html_body: string;
  text_body?: string;
  sender_email?: string;
  sender_name?: string;
  trigger_description?: string;
  active?: boolean;
}): Promise<{ ok: true; template: EmailTemplate } | { ok: false; message: string }> {
  const key = sanitizeKey(input.key);
  if (!key) return { ok: false, message: "Clé requise (lettres/chiffres/_)" };
  if (!input.label.trim()) return { ok: false, message: "Libellé requis" };
  if (!input.subject.trim()) return { ok: false, message: "Sujet requis" };
  if (!input.html_body.trim()) return { ok: false, message: "Corps HTML requis" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_templates")
    .insert({
      key,
      label: input.label.trim(),
      subject: input.subject.trim(),
      html_body: input.html_body,
      text_body: input.text_body?.trim() || null,
      sender_email: input.sender_email?.trim() || null,
      sender_name: input.sender_name?.trim() || null,
      trigger_description: input.trigger_description?.trim() || null,
      active: input.active ?? true,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, message: `La clé "${key}" existe déjà` };
    return { ok: false, message: error.message };
  }
  revalidatePath("/templates");
  revalidatePath("/architecture");
  return { ok: true, template: data as EmailTemplate };
}

export async function deleteEmailTemplateAction(id: string): Promise<Result> {
  const supabase = await createClient();
  const { data: tmpl } = await supabase
    .from("email_templates")
    .select("key")
    .eq("id", id)
    .maybeSingle();
  if (!tmpl) return { ok: false, message: "Template introuvable" };
  const [{ count: ruleUsage }, { count: alertUsage }] = await Promise.all([
    supabase
      .from("automation_rules")
      .select("*", { count: "exact", head: true })
      .eq("email_template_key", tmpl.key),
    supabase
      .from("event_alerts")
      .select("*", { count: "exact", head: true })
      .eq("email_template_key", tmpl.key),
  ]);
  const total = (ruleUsage ?? 0) + (alertUsage ?? 0);
  if (total > 0) {
    return {
      ok: false,
      message: `Template utilisé par ${ruleUsage ?? 0} règle(s) et ${alertUsage ?? 0} alerte(s) — désactive-le plutôt`,
    };
  }
  const { error } = await supabase.from("email_templates").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/templates");
  return { ok: true };
}

/* ============================ AUTH : INVITE + PASSWORD RESET ============================ */

/**
 * Admin invite : crée un user Supabase Auth + son profil avec rôle choisi.
 * Envoie un magic link au nouvel utilisateur (premier login → définit son mot de passe).
 */
export async function inviteUserAction(input: {
  email: string;
  full_name: string;
  role: RoleEnum;
  phone?: string;
}): Promise<{ ok: true; userId: string } | { ok: false; message: string }> {
  if (!input.email?.trim()) return { ok: false, message: "Email requis" };
  if (!input.full_name?.trim()) return { ok: false, message: "Nom complet requis" };
  if (!input.role) return { ok: false, message: "Rôle requis" };

  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Email invalide" };
  }

  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const supabaseAdmin = createServiceRoleClient();

  const redirectTo =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "https://atmospheretissus.fr");

  // 1. Invite via email (crée user + envoie magic link)
  const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email,
    { redirectTo: `${redirectTo}/auth/callback` },
  );

  if (inviteErr) return { ok: false, message: inviteErr.message };
  if (!invited?.user) return { ok: false, message: "Échec de l'invitation" };

  // 2. Crée le profil (ou met à jour si l'user existait déjà)
  const { error: profileErr } = await supabaseAdmin.from("profiles").upsert(
    {
      id: invited.user.id,
      email,
      full_name: input.full_name.trim(),
      role: input.role,
      phone: input.phone?.trim() || null,
      active: true,
    },
    { onConflict: "id" },
  );

  if (profileErr) {
    return { ok: false, message: `User créé mais profil échec : ${profileErr.message}` };
  }

  revalidatePath("/parametres");
  return { ok: true, userId: invited.user.id };
}

/**
 * Renvoie un magic link pour reset de mot de passe.
 */
export async function sendPasswordResetAction(
  email: string,
): Promise<Result> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return { ok: false, message: "Email invalide" };
  }
  const redirectTo =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "https://atmospheretissus.fr");

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${redirectTo}/auth/callback?reset=1`,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
