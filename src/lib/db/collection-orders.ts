/**
 * Suivi des commandes Collection Atmosphère.
 *
 * L'onglet Collection montrait le catalogue des produits semi-finis. Ce
 * que David veut y voir (06/10/2026), c'est le suivi des commandes :
 * dès qu'un client accepte un devis, les articles issus de la Collection
 * doivent apparaître dans un tableau partagé avec l'usine.
 *
 * Aucune table nouvelle : l'acceptation d'un devis crée déjà un dossier
 * et ses `dossier_items`, dont ceux marqués `collection = true`. On lit
 * donc ces lignes, enrichies de leur dossier (client, échéance, atelier)
 * et de leur fournisseur de tissu.
 *
 * Les dates propres à l'usine (arrivée du tissu, départ des confections)
 * et le commentaire SAV sont portés par la ligne — migration
 * 20261006140000.
 */

import { createClient } from "@/lib/supabase/server";
import {
  type CollectionOrder,
  type CollectionStatut,
  joursDeRetard,
  toStatut,
} from "@/lib/collection/order-model";

export type { CollectionOrder, CollectionStatut };
export { joursDeRetard };

type Row = {
  id: string;
  dossier_id: string;
  label: string;
  ref: string | null;
  status: string;
  qty: number;
  unit_label: string;
  notes: string | null;
  matiere: string | null;
  atelier_id: string | null;
  atelier_sent_at: string | null;
  expected_at: string | null;
  received_at: string | null;
  collection_tissu_recu_at: string | null;
  collection_expedie_at: string | null;
  sav_comment: string | null;
  supplier_id: string | null;
  dossiers: {
    id: string;
    number: string;
    devis_id: string | null;
    client_id: string;
    created_at: string;
    atelier_id: string | null;
    atelier_deadline_at: string | null;
    clients: { display_name: string } | null;
    ateliers: { name: string } | null;
  } | null;
  suppliers: { name: string } | null;
  ateliers: { name: string } | null;
};

/** Ne garde que la date (YYYY-MM-DD) d'un timestamp ou d'une date. */
function dateOnly(v: string | null): string | null {
  return v ? v.slice(0, 10) : null;
}

export async function listCollectionOrders(): Promise<CollectionOrder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dossier_items")
    .select(
      `id, dossier_id, label, ref, status, qty, unit_label, notes, matiere,
       atelier_id, atelier_sent_at, expected_at, received_at,
       collection_tissu_recu_at, collection_expedie_at, sav_comment, supplier_id,
       dossiers!inner ( id, number, devis_id, client_id, created_at, atelier_id,
                        atelier_deadline_at, clients ( display_name ),
                        ateliers ( name ) ),
       suppliers ( name ),
       ateliers ( name )`,
    )
    .eq("collection", true)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as Row[]).map((r) => {
    const dossier = r.dossiers;
    const dateReception = dateOnly(r.received_at);
    const rawStatus = r.status;
    return {
      itemId: r.id,
      dossierId: r.dossier_id,
      dossierNumber: dossier?.number ?? "—",
      devisId: dossier?.devis_id ?? null,
      ref: r.ref?.trim() || dossier?.number || "—",
      clientId: dossier?.client_id ?? "",
      clientName: dossier?.clients?.display_name ?? "—",
      rawStatus,
      statut: toStatut(rawStatus, dateReception),
      label: r.label,
      notes: r.notes,
      matiere: r.matiere,
      qty: r.qty,
      unitLabel: r.unit_label,
      // L'atelier de la ligne prime sur celui du dossier : une ligne peut
      // partir chez un atelier différent (choix par ligne en confection).
      atelierId: r.atelier_id ?? dossier?.atelier_id ?? null,
      // Même repli que pour l'identifiant : l'atelier de la ligne d'abord,
      // celui du dossier ensuite.
      atelierName: r.ateliers?.name ?? dossier?.ateliers?.name ?? null,
      supplierName: r.suppliers?.name ?? null,
      dateCommande: dateOnly(dossier?.created_at ?? null),
      dateEnvoiAtelier: dateOnly(r.atelier_sent_at),
      datePrevue: dateOnly(r.expected_at),
      dateButoir: dateOnly(dossier?.atelier_deadline_at ?? null),
      dateReception,
      dateReceptionTissu: r.collection_tissu_recu_at,
      dateExpeditionUsine: r.collection_expedie_at,
      savComment: r.sav_comment,
    };
  });
}

export type CollectionOrderStats = {
  enAttente: number;
  enConfection: number;
  enRetard: number;
  terminees: number;
  archivees: number;
  sav: number;
  total: number;
};

export function collectionOrderStats(
  orders: CollectionOrder[],
): CollectionOrderStats {
  const s: CollectionOrderStats = {
    enAttente: 0,
    enConfection: 0,
    enRetard: 0,
    terminees: 0,
    archivees: 0,
    sav: 0,
    total: orders.length,
  };
  for (const o of orders) {
    if (joursDeRetard(o)) s.enRetard++;
    switch (o.statut) {
      case "En attente":
        s.enAttente++;
        break;
      case "En confection":
        s.enConfection++;
        break;
      case "Terminée":
        s.terminees++;
        break;
      case "Archivée":
        s.archivees++;
        break;
      case "SAV":
        s.sav++;
        break;
    }
  }
  return s;
}

/** Ateliers distincts présents dans les commandes, pour le filtre. */
export function collectionAteliers(orders: CollectionOrder[]): string[] {
  const set = new Set<string>();
  for (const o of orders) if (o.atelierName) set.add(o.atelierName);
  return Array.from(set).sort();
}
