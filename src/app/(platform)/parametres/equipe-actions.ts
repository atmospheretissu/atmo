"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

// ════════════════════════════════ POSEURS ════════════════════════════════

export async function createPoseurAction(input: {
  name: string;
  phone?: string;
  email?: string;
  zone?: string;
  internal?: boolean;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const name = input.name?.trim();
  if (!name) return { ok: false, message: "Nom requis" };

  const { data, error } = await supabase
    .from("poseurs")
    .insert({
      name,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      zone: input.zone?.trim() || null,
      internal: input.internal ?? true,
      active: true,
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };

  revalidatePath("/parametres");
  revalidatePath("/poses");
  return { ok: true, id: data.id };
}

export async function updatePoseurAction(
  id: string,
  patch: { name?: string; phone?: string | null; email?: string | null; zone?: string | null; internal?: boolean; active?: boolean; notes?: string | null },
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("poseurs")
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone || null } : {}),
      ...(patch.email !== undefined ? { email: patch.email || null } : {}),
      ...(patch.zone !== undefined ? { zone: patch.zone || null } : {}),
      ...(patch.internal !== undefined ? { internal: patch.internal } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes || null } : {}),
    })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  revalidatePath("/poses");
  return { ok: true };
}

export async function deletePoseurAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("poseurs").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  revalidatePath("/poses");
  return { ok: true };
}

// ════════════════════════════════ ATELIERS ════════════════════════════════

export async function createAtelierAction(input: {
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  city?: string;
  internal?: boolean;
  specialties?: string[];
}): Promise<ActionResult> {
  const supabase = await createClient();
  const name = input.name?.trim();
  if (!name) return { ok: false, message: "Nom de l'atelier requis" };

  const { data, error } = await supabase
    .from("ateliers")
    .insert({
      name,
      contact_name: input.contact_name?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      city: input.city?.trim() || null,
      internal: input.internal ?? false,
      specialties: input.specialties ?? [],
      active: true,
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };

  revalidatePath("/parametres");
  revalidatePath("/confections");
  return { ok: true, id: data.id };
}

export async function updateAtelierAction(
  id: string,
  patch: {
    name?: string;
    contact_name?: string | null;
    phone?: string | null;
    email?: string | null;
    city?: string | null;
    internal?: boolean;
    specialties?: string[];
    active?: boolean;
    notes?: string | null;
  },
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ateliers")
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.contact_name !== undefined ? { contact_name: patch.contact_name || null } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone || null } : {}),
      ...(patch.email !== undefined ? { email: patch.email || null } : {}),
      ...(patch.city !== undefined ? { city: patch.city || null } : {}),
      ...(patch.internal !== undefined ? { internal: patch.internal } : {}),
      ...(patch.specialties !== undefined ? { specialties: patch.specialties } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes || null } : {}),
    })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  revalidatePath("/confections");
  return { ok: true };
}

export async function deleteAtelierAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("ateliers").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  revalidatePath("/confections");
  return { ok: true };
}

// ════════════════════════════ ASSIGN ATELIER ════════════════════════════

export async function assignAtelierToDossierAction(
  dossierId: string,
  atelierId: string | null,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("dossiers")
    .update({
      atelier_id: atelierId,
      atelier_sent_at: atelierId ? new Date().toISOString() : null,
    })
    .eq("id", dossierId);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/confections/${dossierId}`);
  revalidatePath("/confections");
  return { ok: true };
}
