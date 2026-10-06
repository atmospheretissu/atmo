"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CollectionStatut } from "@/lib/collection/order-model";

type Result = { ok: true } | { ok: false; message: string };

/**
 * Champs que le rôle usine (`collection_atmosphere`) peut renseigner.
 *
 * Ce compte est extérieur à l'entreprise : il ne doit ni changer un statut,
 * ni déclarer un SAV, ni toucher au client. Le trigger
 * `guard_collection_viewer_update` pose la même limite côté base — ce
 * contrôle-ci existe pour rendre un message clair plutôt qu'une erreur SQL.
 */
const USINE_FIELDS = new Set<EditableField>([
  "date_reception_tissu",
  "date_expedition_usine",
]);

type Guard =
  | { ok: true; isUsine: boolean }
  | { ok: false; message: string };

/** Garde-fou : le suivi de production est réservé aux comptes connectés. */
async function assertAccess(): Promise<Guard> {
  const { getEffectiveProfile } = await import("@/lib/db/impersonation");
  const profile = await getEffectiveProfile();
  if (!profile) return { ok: false, message: "Session expirée." };
  return {
    ok: true,
    isUsine: profile.effectiveRole === "collection_atmosphere",
  };
}

/** Les actions réservées au staff : création, suppression, statut, SAV. */
async function assertStaff(): Promise<Result> {
  const guard = await assertAccess();
  if (!guard.ok) return guard;
  if (guard.isUsine) {
    return {
      ok: false,
      message:
        "Votre accès permet de renseigner la réception du tissu et l'expédition des confections, rien d'autre.",
    };
  }
  return { ok: true };
}

const revalidate = () => revalidatePath("/collection");

/**
 * Met à jour un champ du suivi.
 *
 * Une seule action plutôt qu'une par colonne : le tableau en modifie une
 * dizaine, et chacune se résume au même geste. La liste blanche empêche
 * d'écrire ailleurs que dans les champs destinés à l'édition — ni `source`,
 * ni les rattachements au devis, qui ne sont pas à la main de l'utilisateur.
 */
const EDITABLE = {
  statut: "statut",
  ref: "ref",
  client_name: "client_name",
  atelier: "atelier",
  description: "description",
  fournisseur: "fournisseur",
  date_commande: "date_commande",
  date_envoi: "date_envoi",
  date_prevue: "date_prevue",
  date_butoir: "date_butoir",
  date_reception: "date_reception",
  date_reception_tissu: "date_reception_tissu",
  date_expedition_usine: "date_expedition_usine",
  commentaire: "commentaire",
  commentaire_sav: "commentaire_sav",
} as const;

export type EditableField = keyof typeof EDITABLE;


export async function updateCollectionOrderAction(
  id: string,
  field: EditableField,
  value: string | null,
): Promise<Result> {
  const guard = await assertAccess();
  if (!guard.ok) return guard;
  if (!(field in EDITABLE)) return { ok: false, message: "Champ non modifiable." };
  if (guard.isUsine && !USINE_FIELDS.has(field)) {
    return {
      ok: false,
      message:
        "Votre accès permet de renseigner la réception du tissu et l'expédition des confections, rien d'autre.",
    };
  }

  const supabase = await createClient();
  const patch: Record<string, string | null> = {
    [EDITABLE[field]]: value === "" ? null : value,
  };

  // Renseigner une date de réception archive la commande : le statut
  // affiché le reflète déjà, mais on aligne aussi le statut stocké pour
  // que l'export et les filtres côté base disent la même chose.
  if (field === "date_reception" && value) {
    patch.statut = "Archivée";
  }

  const { error } = await (supabase as unknown as {
    from: (t: string) => {
      update: (v: unknown) => {
        eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
      };
    };
  })
    .from("collection_orders")
    .update(patch)
    .eq("id", id);

  if (error) return { ok: false, message: error.message };
  revalidate();
  return { ok: true };
}

/** Bascule SAV, avec le statut de retour. */
export async function toggleCollectionSavAction(
  id: string,
  enable: boolean,
  statutDeRetour: CollectionStatut = "En cours",
): Promise<Result> {
  return updateCollectionOrderAction(
    id,
    "statut",
    enable ? "SAV" : statutDeRetour,
  );
}

/** Création manuelle depuis l'onglet (bouton « Nouvelle commande »). */
export async function createCollectionOrderAction(input: {
  client_name: string;
  ref?: string;
  atelier?: string;
  description?: string;
  fournisseur?: string;
  date_commande?: string;
  date_butoir?: string;
  commentaire?: string;
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const guard = await assertStaff();
  if (!guard.ok) return guard;

  const clientName = (input.client_name ?? "").trim();
  if (!clientName) return { ok: false, message: "Le nom du client est requis." };

  const supabase = await createClient();
  const { data, error } = await (supabase as unknown as {
    from: (t: string) => {
      insert: (v: unknown) => {
        select: (s: string) => {
          single: () => Promise<{
            data: { id: string } | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  })
    .from("collection_orders")
    .insert({
      source: "manuel",
      statut: "En cours",
      client_name: clientName,
      ref: input.ref?.trim() || null,
      atelier: input.atelier?.trim() || null,
      description: input.description?.trim() || null,
      fournisseur: input.fournisseur?.trim() || null,
      date_commande: input.date_commande || null,
      date_butoir: input.date_butoir || null,
      commentaire: input.commentaire?.trim() || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message ?? "Échec de la création." };
  }
  revalidate();
  return { ok: true, id: data.id };
}

/**
 * Suppression. Réservée aux commandes saisies à la main : celles nées d'un
 * devis doivent suivre le sort de leur ligne de dossier, pas disparaître
 * du suivi d'un clic.
 */
export async function deleteCollectionOrderAction(id: string): Promise<Result> {
  const guard = await assertStaff();
  if (!guard.ok) return guard;

  const supabase = await createClient();
  const { data: row } = await (supabase as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          maybeSingle: () => Promise<{ data: { source: string } | null }>;
        };
      };
    };
  })
    .from("collection_orders")
    .select("source")
    .eq("id", id)
    .maybeSingle();

  if (row?.source === "devis") {
    return {
      ok: false,
      message:
        "Cette commande vient d'un devis accepté : elle se supprime depuis le dossier, pas d'ici.",
    };
  }

  const { error } = await (supabase as unknown as {
    from: (t: string) => {
      delete: () => {
        eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
      };
    };
  })
    .from("collection_orders")
    .delete()
    .eq("id", id);

  if (error) return { ok: false, message: error.message };
  revalidate();
  return { ok: true };
}
