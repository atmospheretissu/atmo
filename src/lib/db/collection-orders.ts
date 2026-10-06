/**
 * Lecture du suivi des commandes Collection Atmosphère.
 *
 * La table `collection_orders` réunit deux origines : le suivi repris de
 * l'existant (185 commandes, Pologne et Ukraine) et les commandes créées
 * automatiquement quand un client accepte un devis portant un article
 * Collection. Voir la migration 20261006180000.
 */

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type {
  CollectionOrder,
  CollectionSource,
  CollectionStatut,
} from "@/lib/collection/order-model";

export type {
  CollectionOrder,
  CollectionSource,
  CollectionStatut,
} from "@/lib/collection/order-model";

type Row = {
  id: string;
  source: string;
  statut: string;
  ref: string | null;
  client_name: string;
  client_id: string | null;
  devis_id: string | null;
  dossier_id: string | null;
  date_commande: string | null;
  atelier: string | null;
  description: string | null;
  fournisseur: string | null;
  date_envoi: string | null;
  date_prevue: string | null;
  date_butoir: string | null;
  retard_source: string | null;
  date_reception: string | null;
  date_reception_tissu: string | null;
  date_expedition_usine: string | null;
  commentaire: string | null;
  commentaire_sav: string | null;
};

function toOrder(r: Row): CollectionOrder {
  return {
    id: r.id,
    source: (r.source as CollectionSource) ?? "manuel",
    statut: (r.statut as CollectionStatut) ?? "En cours",
    ref: r.ref,
    clientName: r.client_name,
    clientId: r.client_id,
    devisId: r.devis_id,
    dossierId: r.dossier_id,
    dateCommande: r.date_commande,
    atelier: r.atelier,
    description: r.description,
    fournisseur: r.fournisseur,
    dateEnvoi: r.date_envoi,
    datePrevue: r.date_prevue,
    dateButoir: r.date_butoir,
    retardSource: r.retard_source,
    dateReception: r.date_reception,
    dateReceptionTissu: r.date_reception_tissu,
    dateExpeditionUsine: r.date_expedition_usine,
    commentaire: r.commentaire,
    commentaireSav: r.commentaire_sav,
  };
}

const SELECT =
  "id, source, statut, ref, client_name, client_id, devis_id, dossier_id, " +
  "date_commande, atelier, description, fournisseur, date_envoi, date_prevue, " +
  "date_butoir, retard_source, date_reception, date_reception_tissu, " +
  "date_expedition_usine, commentaire, commentaire_sav";

export async function listCollectionOrders(): Promise<CollectionOrder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collection_orders")
    .select(SELECT)
    // Les plus récentes d'abord ; celles sans date de commande en queue
    // plutôt qu'en tête, pour ne pas polluer le haut du tableau.
    .order("date_commande", { ascending: false, nullsFirst: false })
    .order("client_name", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as Row[]).map(toOrder);
}

/**
 * Crée les lignes de suivi pour les articles Collection d'un dossier.
 *
 * Appelée à l'acceptation du devis, juste après la création du dossier.
 * Idempotente : `dossier_item_id` est unique, un second passage ne crée
 * pas de doublon. Ne lève jamais — un échec ici ne doit pas empêcher
 * l'encaissement d'un acompte.
 */
export async function createCollectionOrdersForDossier(
  dossierId: string,
  client?: ReturnType<typeof createServiceRoleClient>,
): Promise<{ created: number }> {
  const supabase = client ?? createServiceRoleClient();

  try {
    const { data: items } = await supabase
      .from("dossier_items")
      .select(
        "id, label, ref, notes, matiere, expected_at, " +
          "dossiers!inner ( id, devis_id, client_id, created_at, atelier_deadline_at, " +
          "clients ( display_name ), ateliers ( name ) )",
      )
      .eq("dossier_id", dossierId)
      .eq("collection", true);

    if (!items || items.length === 0) return { created: 0 };

    const rows = (items as unknown as Array<{
      id: string;
      label: string;
      ref: string | null;
      notes: string | null;
      matiere: string | null;
      expected_at: string | null;
      dossiers: {
        id: string;
        devis_id: string | null;
        client_id: string;
        created_at: string;
        atelier_deadline_at: string | null;
        clients: { display_name: string } | null;
        ateliers: { name: string } | null;
      } | null;
    }>).map((it) => ({
      dossier_item_id: it.id,
      dossier_id: it.dossiers?.id ?? dossierId,
      devis_id: it.dossiers?.devis_id ?? null,
      client_id: it.dossiers?.client_id ?? null,
      source: "devis",
      statut: "En cours",
      ref: it.ref,
      client_name: it.dossiers?.clients?.display_name ?? "—",
      date_commande: it.dossiers?.created_at?.slice(0, 10) ?? null,
      atelier: it.dossiers?.ateliers?.name ?? null,
      description: it.notes ?? it.label,
      fournisseur: it.matiere ? `Collection Atmosphère · ${it.matiere}` : "Collection Atmosphère",
      date_prevue: it.expected_at?.slice(0, 10) ?? null,
      date_butoir: it.dossiers?.atelier_deadline_at?.slice(0, 10) ?? null,
    }));

    // onConflict sur dossier_item_id : rejouer ne duplique pas, et une
    // ligne déjà suivie (dates saisies par l'usine, SAV) n'est pas écrasée.
    const { error } = await supabase
      .from("collection_orders")
      .upsert(rows, { onConflict: "dossier_item_id", ignoreDuplicates: true });
    if (error) {
      console.warn("[collection_orders] création depuis dossier", error.message);
      return { created: 0 };
    }
    return { created: rows.length };
  } catch (err) {
    console.warn("[collection_orders] création depuis dossier", err);
    return { created: 0 };
  }
}
