/**
 * Modèle d'une commande Collection Atmosphère — types et calculs purs.
 *
 * Séparé de la requête (src/lib/db/collection-orders.ts) parce que le
 * tableau de suivi est un composant client : importer le module de requête
 * y entraînait `@/lib/supabase/server`, et le build Turbopack refuse —
 * à juste titre — de faire passer du code serveur côté navigateur.
 */

/** Statut métier affiché dans le tableau, dérivé de la ligne. */
export type CollectionStatut =
  | "En attente"
  | "En confection"
  | "Terminée"
  | "Archivée"
  | "SAV";

export type CollectionOrder = {
  itemId: string;
  dossierId: string;
  dossierNumber: string;
  devisId: string | null;
  /** Référence de confection : la réf. article, sinon le numéro de dossier. */
  ref: string;
  clientId: string;
  clientName: string;
  /** Statut brut de la ligne, pour les actions. */
  rawStatus: string;
  statut: CollectionStatut;
  label: string;
  notes: string | null;
  matiere: string | null;
  qty: number;
  unitLabel: string;
  atelierId: string | null;
  atelierName: string | null;
  supplierName: string | null;
  /** Commande = acceptation du devis, donc création du dossier. */
  dateCommande: string | null;
  /** Envoi à l'atelier. */
  dateEnvoiAtelier: string | null;
  /** Livraison attendue de la ligne. */
  datePrevue: string | null;
  /** Échéance atelier du dossier. */
  dateButoir: string | null;
  /** Réception constatée par Atmosphère — archive la ligne. */
  dateReception: string | null;
  /** Renseigné par l'usine. */
  dateReceptionTissu: string | null;
  /** Renseigné par l'usine. */
  dateExpeditionUsine: string | null;
  savComment: string | null;
};

/**
 * Jours de retard : seulement pour une ligne encore en cours dont
 * l'échéance est passée. Une ligne terminée n'est jamais « en retard »,
 * même livrée tard — le tableau sert à savoir quoi relancer aujourd'hui.
 */
export function joursDeRetard(
  o: CollectionOrder,
  today: Date = new Date(),
): number | null {
  if (o.statut === "Terminée" || o.statut === "Archivée") return null;
  if (!o.dateButoir) return null;
  const butoir = new Date(o.dateButoir);
  if (Number.isNaN(butoir.getTime())) return null;
  const diff = Math.floor((today.getTime() - butoir.getTime()) / 86_400_000);
  return diff > 0 ? diff : null;
}

export function toStatut(
  rawStatus: string,
  dateReception: string | null,
): CollectionStatut {
  if (rawStatus === "probleme") return "SAV";
  // Dès qu'Atmosphère constate la réception, la ligne est archivée.
  if (dateReception) return "Archivée";
  if (rawStatus === "recu") return "Terminée";
  if (rawStatus === "confection" || rawStatus === "expedie") return "En confection";
  return "En attente";
}
