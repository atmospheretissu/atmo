import tarifs from "./new-collection-tarifs.json";

export type NewCollectionCategory = "rideau" | "store_bateau" | "store_enrouleur" | "store_screen";
export type NewCollectionFamily = "LIN" | "POLYESTER" | "POLYESTER_DOUBLE" | "COLLECTION";
export type ConfectionKey = "pli_simple" | "wave" | "oeillet" | "store" | string;

export type TarifGrid = {
  largeurs: number[];
  hauteurs: number[];
  grid: number[][];
};

export type Tissu = {
  name: string;
  family: NewCollectionFamily;
  laize: number | null;
  coefficient: number | null;
  confections: Record<ConfectionKey, TarifGrid>;
};

export type TarifsData = Record<NewCollectionCategory, { tissus: Tissu[] }>;

export const NEW_COLLECTION_TARIFS = tarifs as unknown as TarifsData;

/** Trouve le prix correspondant aux dimensions demandées.
 *  On prend le premier seuil largeur ≥ largeur_req ET hauteur ≥ hauteur_req.
 *  Retourne null si les dimensions dépassent la grille.
 */
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

/** Retourne les tissus d'une catégorie, groupés par famille. */
export function tissusByFamily(
  category: NewCollectionCategory,
): Record<NewCollectionFamily, Tissu[]> {
  const out: Record<NewCollectionFamily, Tissu[]> = {
    LIN: [],
    POLYESTER: [],
    POLYESTER_DOUBLE: [],
    COLLECTION: [],
  };
  for (const t of NEW_COLLECTION_TARIFS[category].tissus) {
    if (out[t.family]) out[t.family].push(t);
  }
  return out;
}
