"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SourceActionResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

function slugify(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export async function createSourceAction(input: {
  label: string;
  color?: string;
}): Promise<SourceActionResult> {
  const supabase = await createClient();
  const label = input.label?.trim();
  if (!label) return { ok: false, message: "Label requis" };

  const baseKey = slugify(label) || `source_${Date.now()}`;
  // S'assurer de l'unicité de la clé
  let key = baseKey;
  let i = 1;
  while (true) {
    const { data: existing } = await supabase
      .from("sources")
      .select("id")
      .eq("key", key)
      .maybeSingle();
    if (!existing) break;
    i += 1;
    key = `${baseKey}_${i}`;
  }

  const { count: positionCount } = await supabase
    .from("sources")
    .select("*", { count: "exact", head: true });

  const { data, error } = await supabase
    .from("sources")
    .insert({
      key,
      label,
      color: input.color?.trim() || "muted",
      position: positionCount ?? 0,
      active: true,
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };

  revalidatePath("/parametres");
  return { ok: true, id: data.id };
}

export async function updateSourceAction(
  id: string,
  patch: { label?: string; color?: string; active?: boolean; position?: number },
): Promise<SourceActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sources")
    .update({
      ...(patch.label !== undefined ? { label: patch.label.trim() } : {}),
      ...(patch.color !== undefined ? { color: patch.color } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
      ...(patch.position !== undefined ? { position: patch.position } : {}),
    })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  revalidatePath("/devis");
  return { ok: true };
}

export async function deleteSourceAction(id: string): Promise<SourceActionResult> {
  const supabase = await createClient();
  // Sécurité : empêcher la suppression si en cours d'utilisation
  const { count } = await supabase
    .from("devis")
    .select("*", { count: "exact", head: true })
    .eq("source_id", id);
  if (count && count > 0) {
    return {
      ok: false,
      message: `Cette source est utilisée par ${count} devis. Désactive-la plutôt que de la supprimer.`,
    };
  }
  const { error } = await supabase.from("sources").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  return { ok: true };
}

/**
 * Réassigne la source d'un devis depuis sa fiche (corrige une étiquette LM
 * erronée par exemple).
 */
export async function setDevisSourceAction(
  devisId: string,
  sourceId: string | null,
): Promise<SourceActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("devis")
    .update({ source_id: sourceId })
    .eq("id", devisId);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/devis/${devisId}`);
  revalidatePath("/devis");
  return { ok: true };
}
