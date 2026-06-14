import { createClient } from "@/lib/supabase/server";
import type { CatalogProduct } from "@/components/parametres/catalog-tab";

export async function listCatalogProducts(): Promise<CatalogProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catalog_products")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CatalogProduct[];
}
