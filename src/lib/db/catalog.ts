import { createClient } from "@/lib/supabase/server";
import type { CatalogProduct } from "@/components/parametres/catalog-tab";

/**
 * Page de produits — server-side pagination (la table fait 45k+ lignes).
 */
export async function listCatalogProductsPage(opts: {
  q?: string;
  category?: string | null;
  page?: number;
  pageSize?: number;
}): Promise<{ products: CatalogProduct[]; total: number; categories: string[] }> {
  const supabase = await createClient();
  const page = Math.max(0, opts.page ?? 0);
  const pageSize = Math.min(200, Math.max(10, opts.pageSize ?? 50));
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("catalog_products")
    .select("*", { count: "exact" })
    .order("category", { ascending: true })
    .order("name", { ascending: true })
    .range(from, to);

  if (opts.category && opts.category !== "all") {
    q = q.eq("category", opts.category);
  }
  if (opts.q) {
    const term = opts.q.trim();
    if (term) {
      // ilike sur ref + name + description
      q = q.or(
        `ref.ilike.%${term}%,name.ilike.%${term}%,description.ilike.%${term}%`,
      );
    }
  }

  const { data, count, error } = await q;
  if (error) throw error;

  // Liste des catégories distinctes (pour le filtre)
  const { data: cats } = await supabase
    .from("catalog_products")
    .select("category")
    .order("category", { ascending: true })
    .limit(2000);
  const categories = Array.from(
    new Set((cats ?? []).map((c) => c.category).filter(Boolean)),
  );

  return {
    products: (data ?? []) as CatalogProduct[],
    total: count ?? 0,
    categories,
  };
}

/** @deprecated — utiliser listCatalogProductsPage. Conservé pour rétrocompat. */
export async function listCatalogProducts(): Promise<CatalogProduct[]> {
  const { products } = await listCatalogProductsPage({ pageSize: 100 });
  return products;
}
