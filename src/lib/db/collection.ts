import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type CollectionProduct = Database["public"]["Tables"]["catalog_products"]["Row"];

export async function listCollectionProducts(): Promise<CollectionProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catalog_products")
    .select("*")
    .eq("is_collection", true)
    .eq("active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type CollectionStats = {
  totalRefs: number;
  stockPL: number;
  stockUA: number;
  categories: string[];
  outOfStock: number;
  lowStock: number;
};

export async function getCollectionStats(): Promise<CollectionStats> {
  const products = await listCollectionProducts();
  const cats = new Set<string>();
  let stockPL = 0;
  let stockUA = 0;
  let outOfStock = 0;
  let lowStock = 0;
  for (const p of products) {
    cats.add(p.category);
    stockPL += p.stock_poland ?? 0;
    stockUA += p.stock_ukraine ?? 0;
    const total = (p.stock_poland ?? 0) + (p.stock_ukraine ?? 0);
    if (total === 0) outOfStock += 1;
    else if (total <= 5) lowStock += 1;
  }
  return {
    totalRefs: products.length,
    stockPL,
    stockUA,
    categories: Array.from(cats).sort(),
    outOfStock,
    lowStock,
  };
}
