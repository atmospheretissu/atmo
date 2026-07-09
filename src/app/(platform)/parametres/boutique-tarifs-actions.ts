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
