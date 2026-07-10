import { POSE_RIDEAUX, POSE_STORES, type PoseTarif } from "./data";

/** Convertit une plage "100-200" → { min: 100, max: 200 }. */
function parseRange(range: string): { min: number; max: number } {
  const m = range.match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return { min: 0, max: Infinity };
  return { min: Number(m[1]), max: Number(m[2]) };
}

/** Trouve le tarif pose correspondant aux dimensions. */
function lookupInGrid(
  grid: PoseTarif[],
  largeurCm: number,
  hauteurCm: number,
): number | null {
  for (const row of grid) {
    const l = parseRange(row.plageLargeur);
    const h = parseRange(row.plageHauteur);
    if (largeurCm > l.min && largeurCm <= l.max && hauteurCm > h.min && hauteurCm <= h.max) {
      return row.prix;
    }
  }
  return null;
}

export function lookupPosePrice(
  category: "rideau" | "store_bateau" | "store_enrouleur" | "store_screen",
  largeurCm: number,
  hauteurCm: number,
): number | null {
  const grid = category === "rideau" ? POSE_RIDEAUX : POSE_STORES;
  return lookupInGrid(grid, largeurCm, hauteurCm);
}
