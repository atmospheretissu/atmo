import { createClient } from "@/lib/supabase/server";

export type NewCollectionCategory =
  | "rideau"
  | "store_bateau"
  | "store_enrouleur"
  | "store_screen";
export type NewCollectionFamily =
  | "LIN"
  | "POLYESTER"
  | "POLYESTER_DOUBLE"
  | "COLLECTION";
export type ConfectionKey =
  | "pli_simple"
  | "wave"
  | "oeillet"
  | "store"
  | string;

export type TarifGrid = {
  largeurs: number[];
  hauteurs: number[];
  grid: number[][];
};

export type Tissu = {
  id: string;
  name: string;
  category: NewCollectionCategory;
  family: NewCollectionFamily;
  laize: number | null;
  coefficient: number | null;
  active: boolean;
  confections: Record<ConfectionKey, TarifGrid>;
};

/**
 * Liste tous les tissus d'une catégorie (ou toutes catégories si null)
 * avec leurs grilles préchargées. Un seul aller-retour.
 */
type TissuRow = {
  id: string;
  name: string;
  category: string;
  family: string;
  laize_cm: number | null;
  coefficient: number | string | null;
  active: boolean;
  position: number;
};
type GridRow = {
  tissu_id: string;
  confection: string;
  largeurs: number[];
  hauteurs: number[];
  grid: number[][];
};

export async function listTarifTissusByCategory(
  category: NewCollectionCategory | null,
): Promise<Tissu[]> {
  const supabase = await createClient();

  const tissusQ = supabase
    .from("boutique_tarif_tissus" as never)
    .select("id, name, category, family, laize_cm, coefficient, active, position")
    .eq("active", true)
    .order("position", { ascending: true });
  const { data: tissusRaw, error } = category
    ? await tissusQ.eq("category", category)
    : await tissusQ;
  if (error) throw error;
  const tissus = (tissusRaw ?? []) as unknown as TissuRow[];
  if (tissus.length === 0) return [];

  const ids = tissus.map((t) => t.id);
  const { data: gridsRaw } = await supabase
    .from("boutique_tarif_grids" as never)
    .select("tissu_id, confection, largeurs, hauteurs, grid")
    .in("tissu_id", ids);
  const grids = (gridsRaw ?? []) as unknown as GridRow[];

  const gridsByTissu = new Map<string, Record<string, TarifGrid>>();
  for (const g of grids) {
    if (!gridsByTissu.has(g.tissu_id)) gridsByTissu.set(g.tissu_id, {});
    gridsByTissu.get(g.tissu_id)![g.confection] = {
      largeurs: g.largeurs,
      hauteurs: g.hauteurs,
      grid: g.grid,
    };
  }

  return tissus.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category as NewCollectionCategory,
    family: t.family as NewCollectionFamily,
    laize: t.laize_cm ?? null,
    coefficient: t.coefficient == null ? null : Number(t.coefficient),
    active: t.active,
    confections: gridsByTissu.get(t.id) ?? {},
  }));
}

/** Trouve le prix correspondant aux dimensions demandées via seuils supérieurs. */
export function lookupPrice(
  grid: TarifGrid,
  largeurCm: number,
  hauteurCm: number,
): { price: number; largeurSeuil: number; hauteurSeuil: number } | null {
  const iLargeur = grid.largeurs.findIndex((l) => l >= largeurCm);
  const iHauteur = grid.hauteurs.findIndex((h) => h >= hauteurCm);
  if (iLargeur < 0 || iHauteur < 0) return null;
  const price = grid.grid[iHauteur]?.[iLargeur];
  if (!Number.isFinite(price) || price <= 0) return null;
  return {
    price,
    largeurSeuil: grid.largeurs[iLargeur],
    hauteurSeuil: grid.hauteurs[iHauteur],
  };
}
