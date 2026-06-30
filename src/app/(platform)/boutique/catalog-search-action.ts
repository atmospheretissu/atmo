"use server";

import { createClient } from "@/lib/supabase/server";

export type TissuSearchResult = {
  id: string;
  ref: string;
  name: string;
  unit_price_ht: number;
  width_cm: number | null;
  raccord_cm: number | null;
};

export type CollectionTissu = {
  id: string;
  ref: string;
  name: string;
  unit_price_ht: number;
  width_cm: number | null;
  raccord_cm: number | null;
};

/**
 * Liste tous les tissus de la Collection Atmosphère (catalog_products
 * avec is_collection = true). Trié par nom.
 */
export async function listCollectionTissusAction(): Promise<CollectionTissu[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("catalog_products")
    .select("id, ref, name, unit_price_ht, width_cm, raccord_cm")
    .eq("active", true)
    .eq("is_collection", true)
    .order("name", { ascending: true })
    .limit(500);
  return (data ?? []).map((p) => ({
    id: p.id,
    ref: p.ref,
    name: p.name,
    unit_price_ht: Number(p.unit_price_ht ?? 0),
    width_cm: (p as { width_cm?: number | null }).width_cm ?? null,
    raccord_cm: (p as { raccord_cm?: number | null }).raccord_cm ?? null,
  }));
}

/**
 * Recherche les tissus dans le catalogue par nom ou référence.
 * Limité à 15 résultats pour une autocomplétion fluide.
 */
export async function searchCatalogTissusAction(
  query: string,
): Promise<TissuSearchResult[]> {
  const term = query.trim();
  if (term.length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("catalog_products")
    .select("id, ref, name, unit_price_ht, width_cm, raccord_cm")
    .eq("active", true)
    .or(`name.ilike.%${term}%,ref.ilike.%${term}%`)
    .order("name", { ascending: true })
    .limit(15);
  return (data ?? []).map((p) => ({
    id: p.id,
    ref: p.ref,
    name: p.name,
    unit_price_ht: Number(p.unit_price_ht ?? 0),
    width_cm: (p as { width_cm?: number | null }).width_cm ?? null,
    raccord_cm: (p as { raccord_cm?: number | null }).raccord_cm ?? null,
  }));
}
