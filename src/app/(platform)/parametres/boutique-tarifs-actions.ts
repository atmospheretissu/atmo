"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { listTarifTissusByCategory, type Tissu } from "@/lib/db/boutique-tarifs";

export async function listAllTarifTissusAction(): Promise<Tissu[]> {
  const all: Tissu[] = [];
  const categories = ["rideau", "store_bateau", "store_enrouleur", "store_screen"] as const;
  for (const c of categories) {
    const list = await listTarifTissusByCategory(c);
    all.push(...list);
  }
  return all;
}

export async function updateGridAction(
  tissuId: string,
  confection: string,
  largeurs: number[],
  hauteurs: number[],
  grid: number[][],
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const { error } = await (supabase as unknown as {
    from: (t: string) => { update: (row: unknown) => { eq: (k: string, v: unknown) => { eq: (k: string, v: unknown) => Promise<{ error: { message: string } | null }> } } };
  })
    .from("boutique_tarif_grids")
    .update({ largeurs, hauteurs, grid, updated_at: new Date().toISOString() })
    .eq("tissu_id", tissuId)
    .eq("confection", confection);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  return { ok: true };
}

/**
 * Import CSV d'une grille tarifaire.
 * Format attendu : première colonne = hauteur ; première ligne = largeurs.
 * Séparateurs supportés : `;` (Excel FR, priorité) OU `,`.
 * BOM UTF-8 toléré en tête.
 */
export async function importGridCsvAction(
  tissuId: string,
  confection: string,
  csvText: string,
): Promise<{ ok: boolean; message?: string; rows?: number; cols?: number }> {
  const text = csvText.replace(/^﻿/, "").trim();
  if (!text) return { ok: false, message: "CSV vide" };

  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (rawLines.length < 2) {
    return { ok: false, message: "Au moins 2 lignes attendues (en-tête + une ligne de données)" };
  }
  // Détecte le séparateur — priorité au `;`
  const sep = rawLines[0].includes(";") ? ";" : ",";
  const rows = rawLines.map((l) => l.split(sep).map((c) => c.trim()));

  // Ligne 0 : cellule (0,0) vide + largeurs
  const header = rows[0];
  const largeurs = header.slice(1).map((v) => Number(v.replace(",", ".")));
  if (largeurs.some((n) => !Number.isFinite(n) || n <= 0)) {
    return { ok: false, message: "Ligne d'en-tête : largeurs invalides" };
  }
  const dataRows = rows.slice(1);
  const hauteurs: number[] = [];
  const grid: number[][] = [];
  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    const h = Number(r[0].replace(",", "."));
    if (!Number.isFinite(h) || h <= 0) {
      return {
        ok: false,
        message: `Ligne ${i + 2} : hauteur invalide (« ${r[0]} »)`,
      };
    }
    const priceRow = r
      .slice(1, largeurs.length + 1)
      .map((v) => Number(v.replace(",", ".")));
    if (priceRow.length !== largeurs.length) {
      return {
        ok: false,
        message: `Ligne ${i + 2} : ${priceRow.length} prix attendus, ${largeurs.length} reçus`,
      };
    }
    if (priceRow.some((n) => !Number.isFinite(n) || n < 0)) {
      return {
        ok: false,
        message: `Ligne ${i + 2} : prix invalide (non numérique ou négatif)`,
      };
    }
    hauteurs.push(h);
    grid.push(priceRow.map((n) => Math.round(n * 100) / 100));
  }

  const supabase = await createClient();
  const { error } = await (
    supabase as unknown as {
      from: (t: string) => {
        update: (row: unknown) => {
          eq: (
            k: string,
            v: unknown,
          ) => {
            eq: (
              k: string,
              v: unknown,
            ) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
    }
  )
    .from("boutique_tarif_grids")
    .update({
      largeurs,
      hauteurs,
      grid,
      updated_at: new Date().toISOString(),
    })
    .eq("tissu_id", tissuId)
    .eq("confection", confection);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  return { ok: true, rows: hauteurs.length, cols: largeurs.length };
}

export async function updateTissuMetaAction(
  tissuId: string,
  patch: { active?: boolean; laize_cm?: number | null; coefficient?: number | null },
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const { error } = await (supabase as unknown as {
    from: (t: string) => { update: (row: unknown) => { eq: (k: string, v: unknown) => Promise<{ error: { message: string } | null }> } };
  })
    .from("boutique_tarif_tissus")
    .update(patch)
    .eq("id", tissuId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  return { ok: true };
}
