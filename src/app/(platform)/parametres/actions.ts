"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupplierInsert, SupplierUpdate } from "@/lib/db/suppliers";

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
