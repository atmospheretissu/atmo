"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupplierInsert, SupplierUpdate } from "@/lib/db/suppliers";
import type { ProfileUpdate, UserRole } from "@/lib/db/profiles";
import type { SmsTemplateUpdate } from "@/lib/db/sms-templates";
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
