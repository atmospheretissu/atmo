"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupplierInsert, SupplierUpdate } from "@/lib/db/suppliers";
import type { ProfileUpdate, UserRole } from "@/lib/db/profiles";
import type { SmsTemplateUpdate } from "@/lib/db/sms-templates";
import type { EmailTemplateUpdate } from "@/lib/db/email-templates-shared";
import type { AutomationRuleUpdate } from "@/lib/db/automation-rules-shared";
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
    sanitized.avatar_initial = patch.full_name.trim()[0]?.toUpperCase() ?? null;
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
