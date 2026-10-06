"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CollectionStatut } from "@/lib/collection/order-model";

type Result = { ok: true } | { ok: false; message: string };

/**
 * Le tableau de suivi affiche cinq statuts métier, la base en porte six
 * techniques. Cette table est la seule traduction entre les deux — elle
 * évite de disperser des chaînes magiques dans l'interface.
 *
 * « Archivée » n'a pas de statut propre : c'est la présence d'une date de
 * réception constatée par Atmosphère qui archive la ligne. On la traite
 * donc à part.
 */
const STATUT_TO_STATUS: Record<
  Exclude<CollectionStatut, "Archivée">,
  "en_attente" | "confection" | "recu" | "probleme"
> = {
  "En attente": "en_attente",
  "En confection": "confection",
  Terminée: "recu",
  SAV: "probleme",
};

/** Garde-fou : seul le staff touche au suivi de production. */
async function assertStaff(): Promise<Result> {
  const { getEffectiveProfile } = await import("@/lib/db/impersonation");
  const profile = await getEffectiveProfile();
  if (!profile) return { ok: false, message: "Session expirée." };
  return { ok: true };
}

function revalidate() {
  revalidatePath("/collection");
  revalidatePath("/confections");
}

/** Change le statut d'une ligne Collection. */
export async function setCollectionStatutAction(
  itemId: string,
  statut: CollectionStatut,
): Promise<Result> {
  const guard = await assertStaff();
  if (!guard.ok) return guard;

  const supabase = await createClient();

  if (statut === "Archivée") {
    // Archiver = constater la réception. La ligne est forcément terminée.
    const { error } = await supabase
      .from("dossier_items")
      .update({
        status: "recu",
        received_at: new Date().toISOString(),
      })
      .eq("id", itemId);
    if (error) return { ok: false, message: error.message };
    revalidate();
    return { ok: true };
  }

  const patch: { status: "en_attente" | "confection" | "recu" | "probleme"; received_at?: null } =
    { status: STATUT_TO_STATUS[statut] };
  // Sortir d'« Archivée » doit effacer la réception, sinon la ligne y
  // retombe immédiatement au prochain calcul de statut.
  if (statut !== "Terminée") patch.received_at = null;


  const { error } = await supabase
    .from("dossier_items")
    .update(patch)
    .eq("id", itemId);
  if (error) return { ok: false, message: error.message };
  revalidate();
  return { ok: true };
}

/**
 * Date de réception constatée par Atmosphère. La renseigner archive la
 * ligne, l'effacer la fait repasser en « Terminée ».
 */
export async function setCollectionReceptionAction(
  itemId: string,
  date: string | null,
): Promise<Result> {
  const guard = await assertStaff();
  if (!guard.ok) return guard;

  const supabase = await createClient();
  const { error } = await supabase
    .from("dossier_items")
    .update({
      received_at: date ? new Date(`${date}T12:00:00Z`).toISOString() : null,
      ...(date ? { status: "recu" as const } : {}),
    })
    .eq("id", itemId);
  if (error) return { ok: false, message: error.message };
  revalidate();
  return { ok: true };
}

/**
 * Les deux dates que l'usine renseigne elle-même : arrivée du tissu
 * d'éditeur chez elle, et départ des confections.
 */
export async function setCollectionUsineDateAction(
  itemId: string,
  field: "tissu_recu" | "expedie",
  date: string | null,
): Promise<Result> {
  const guard = await assertStaff();
  if (!guard.ok) return guard;

  const supabase = await createClient();
  const patch =
    field === "tissu_recu"
      ? { collection_tissu_recu_at: date || null }
      : { collection_expedie_at: date || null };
  const { error } = await supabase
    .from("dossier_items")
    .update(patch)
    .eq("id", itemId);
  if (error) return { ok: false, message: error.message };
  revalidate();
  return { ok: true };
}

/**
 * Bascule SAV. Repasser une ligne en production doit la remettre là où
 * elle en était : si l'usine a déjà expédié, c'est « Terminée », sinon
 * « En confection ».
 */
export async function toggleCollectionSavAction(
  itemId: string,
  enable: boolean,
): Promise<Result> {
  const guard = await assertStaff();
  if (!guard.ok) return guard;

  const supabase = await createClient();

  if (enable) {
    const { error } = await supabase
      .from("dossier_items")
      .update({ status: "probleme" })
      .eq("id", itemId);
    if (error) return { ok: false, message: error.message };
    revalidate();
    return { ok: true };
  }

  const { data: row, error: readErr } = await supabase
    .from("dossier_items")
    .select("collection_expedie_at, received_at")
    .eq("id", itemId)
    .maybeSingle();
  if (readErr) return { ok: false, message: readErr.message };

  const expedie = (row as { collection_expedie_at?: string | null } | null)
    ?.collection_expedie_at;
  const recu = (row as { received_at?: string | null } | null)?.received_at;

  const { error } = await supabase
    .from("dossier_items")
    .update({ status: recu || expedie ? "recu" : "confection" })
    .eq("id", itemId);
  if (error) return { ok: false, message: error.message };
  revalidate();
  return { ok: true };
}

/** Commentaire SAV d'Atmosphère, destiné à être lu par l'usine. */
export async function setCollectionSavCommentAction(
  itemId: string,
  comment: string,
): Promise<Result> {
  const guard = await assertStaff();
  if (!guard.ok) return guard;

  const supabase = await createClient();
  const { error } = await supabase
    .from("dossier_items")
    .update({ sav_comment: comment.trim() || null })
    .eq("id", itemId);
  if (error) return { ok: false, message: error.message };
  revalidate();
  return { ok: true };
}
