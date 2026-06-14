"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { listCatalogProductsPage } from "@/lib/db/catalog";
import type { CatalogProduct } from "@/components/parametres/catalog-tab";

export async function searchCatalogPageAction(opts: {
  q?: string;
  category?: string | null;
  page?: number;
  pageSize?: number;
}): Promise<{ products: CatalogProduct[]; total: number }> {
  const r = await listCatalogProductsPage(opts);
  return { products: r.products, total: r.total };
}

export type CatalogProductInput = {
  ref: string;
  name: string;
  category: string;
  description?: string | null;
  unit_price_ht: number;
  unit_label?: string;
  width_cm?: number | null;
  raccord_cm?: number | null;
  is_collection?: boolean;
  stock_poland?: number;
  stock_ukraine?: number;
  active?: boolean;
};

function sanitize(input: CatalogProductInput): CatalogProductInput {
  return {
    ref: input.ref.trim(),
    name: input.name.trim(),
    category: input.category.trim() || "Autre",
    description: input.description?.trim() || null,
    unit_price_ht:
      Number.isFinite(input.unit_price_ht) && input.unit_price_ht >= 0
        ? Math.round(input.unit_price_ht * 100) / 100
        : 0,
    unit_label: input.unit_label?.trim() || "u",
    width_cm: input.width_cm != null && Number.isFinite(input.width_cm) ? input.width_cm : null,
    raccord_cm:
      input.raccord_cm != null && Number.isFinite(input.raccord_cm) ? input.raccord_cm : null,
    is_collection: Boolean(input.is_collection),
    stock_poland:
      Number.isFinite(input.stock_poland ?? 0) ? Math.max(0, Math.floor(input.stock_poland ?? 0)) : 0,
    stock_ukraine:
      Number.isFinite(input.stock_ukraine ?? 0) ? Math.max(0, Math.floor(input.stock_ukraine ?? 0)) : 0,
    active: input.active ?? true,
  };
}

function validate(input: CatalogProductInput): string | null {
  if (!input.ref) return "Référence requise.";
  if (input.ref.length > 60) return "Référence trop longue.";
  if (!input.name) return "Nom requis.";
  if (input.unit_price_ht < 0) return "Prix HT invalide.";
  return null;
}

export async function createCatalogProductAction(
  input: CatalogProductInput,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const clean = sanitize(input);
  const err = validate(clean);
  if (err) return { ok: false, message: err };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catalog_products")
    .insert(clean)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return {
      ok: false,
      message:
        error?.message?.includes("duplicate")
          ? `Référence "${clean.ref}" déjà utilisée.`
          : error?.message ?? "Échec création",
    };
  }
  revalidatePath("/parametres");
  return { ok: true, id: data.id };
}

export async function updateCatalogProductAction(
  id: string,
  input: CatalogProductInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const clean = sanitize(input);
  const err = validate(clean);
  if (err) return { ok: false, message: err };

  const supabase = await createClient();
  const { error } = await supabase.from("catalog_products").update(clean).eq("id", id);
  if (error) {
    return {
      ok: false,
      message:
        error.message?.includes("duplicate")
          ? `Référence "${clean.ref}" déjà utilisée.`
          : error.message,
    };
  }
  revalidatePath("/parametres");
  return { ok: true };
}

export async function deleteCatalogProductAction(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("catalog_products").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  return { ok: true };
}

export async function toggleCatalogProductActiveAction(
  id: string,
  active: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("catalog_products")
    .update({ active })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  return { ok: true };
}
