"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { STORE_COOKIE } from "@/lib/db/stores";

export type StoreActionResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

function slugify(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export async function createStoreAction(input: {
  name: string;
  short_name?: string;
  city?: string;
  postal_code?: string;
  address?: string;
  phone?: string;
  email?: string;
  color?: string;
}): Promise<StoreActionResult> {
  const supabase = await createClient();
  const name = input.name?.trim();
  if (!name) return { ok: false, message: "Nom requis" };

  // Slug unique
  const baseSlug = slugify(input.short_name?.trim() || name) || `store_${Date.now()}`;
  let slug = baseSlug;
  let i = 1;
  while (true) {
    const { data: existing } = await supabase
      .from("stores")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    i += 1;
    slug = `${baseSlug}_${i}`;
  }

  const { count: positionCount } = await supabase
    .from("stores")
    .select("*", { count: "exact", head: true });

  const { data, error } = await supabase
    .from("stores")
    .insert({
      slug,
      name,
      short_name: input.short_name?.trim() || null,
      city: input.city?.trim() || null,
      postal_code: input.postal_code?.trim() || null,
      address: input.address?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      color: input.color || "violet",
      position: positionCount ?? 0,
      active: true,
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };

  revalidatePath("/parametres");
  return { ok: true, id: data.id };
}

export async function updateStoreAction(
  id: string,
  patch: {
    name?: string;
    short_name?: string | null;
    city?: string | null;
    postal_code?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    color?: string;
    active?: boolean;
  },
): Promise<StoreActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("stores")
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.short_name !== undefined ? { short_name: patch.short_name || null } : {}),
      ...(patch.city !== undefined ? { city: patch.city || null } : {}),
      ...(patch.postal_code !== undefined ? { postal_code: patch.postal_code || null } : {}),
      ...(patch.address !== undefined ? { address: patch.address || null } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone || null } : {}),
      ...(patch.email !== undefined ? { email: patch.email || null } : {}),
      ...(patch.color !== undefined ? { color: patch.color } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
    })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteStoreAction(id: string): Promise<StoreActionResult> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("devis")
    .select("*", { count: "exact", head: true })
    .eq("store_id", id);
  if (count && count > 0) {
    return {
      ok: false,
      message: `Ce magasin a ${count} devis. Désactive-le plutôt que de le supprimer.`,
    };
  }
  const { error } = await supabase.from("stores").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  return { ok: true };
}

/** Switch d'entité depuis la sidebar (cookie 30j). */
export async function setCurrentStoreAction(
  storeId: string | "all",
): Promise<{ ok: true }> {
  const c = await cookies();
  c.set(STORE_COOKIE, storeId, {
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: false, // accessible JS pour les indicateurs visuels
    path: "/",
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
