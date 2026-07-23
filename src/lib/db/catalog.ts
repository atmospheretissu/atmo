import { createClient } from "@/lib/supabase/server";
import type { CatalogProduct } from "@/components/parametres/catalog-tab";

/**
 * Page de produits — server-side pagination (la table fait 45k+ lignes).
 */
export async function listCatalogProductsPage(opts: {
  q?: string;
  category?: string | null;
  supplier?: string | null;
  source?: "atmo" | "external" | null;
  page?: number;
  pageSize?: number;
}): Promise<{
  products: CatalogProduct[];
  total: number;
  categories: string[];
  suppliers: string[];
}> {
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
  if (opts.supplier && opts.supplier !== "all") {
    q = (q as unknown as { eq: (c: string, v: string) => typeof q }).eq(
      "supplier_name",
      opts.supplier,
    );
  }
  if (opts.source) {
    q = (q as unknown as { eq: (c: string, v: string) => typeof q }).eq(
      "catalog_source",
      opts.source,
    );
  }
  if (opts.q) {
    const term = opts.q.trim();
    if (term) {
      q = q.or(
        `ref.ilike.%${term}%,name.ilike.%${term}%,description.ilike.%${term}%,supplier_name.ilike.%${term}%`,
      );
    }
  }

  const { data, count, error } = await q;
  if (error) throw error;

  const { data: cats } = await supabase
    .from("catalog_products")
    .select("category")
    .order("category", { ascending: true })
    .limit(2000);
  const categories = Array.from(
    new Set((cats ?? []).map((c) => c.category).filter(Boolean)),
  );

  // Fournisseurs distincts — utilise DISTINCT côté DB pour éviter de scanner 45K rows.
  const { data: sups } = await (
    supabase as unknown as {
      rpc: (
        name: string,
      ) => Promise<{ data: { supplier_name: string }[] | null }>;
    }
  ).rpc("distinct_catalog_suppliers");
  let suppliers: string[] = [];
  if (sups && Array.isArray(sups)) {
    suppliers = sups
      .map((s: { supplier_name: string }) => s.supplier_name)
      .filter(Boolean);
  } else {
    // Fallback : scan limité si la RPC n'est pas encore déployée.
    const { data: fallback } = await supabase
      .from("catalog_products")
      .select("supplier_name")
      .limit(5000);
    suppliers = Array.from(
      new Set(
        (fallback ?? [])
          .map(
            (r) =>
              (r as unknown as { supplier_name?: string | null }).supplier_name,
          )
          .filter((v): v is string => Boolean(v)),
      ),
    ).sort((a, b) => a.localeCompare(b, "fr"));
  }

  return {
    products: (data ?? []) as unknown as CatalogProduct[],
    total: count ?? 0,
    categories,
    suppliers,
  };
}

/** @deprecated — utiliser listCatalogProductsPage. Conservé pour rétrocompat. */
export async function listCatalogProducts(): Promise<CatalogProduct[]> {
  const { products } = await listCatalogProductsPage({ pageSize: 100 });
  return products;
}
