/**
 * Modèle d'une commande de confection Collection Atmosphère.
 *
 * Types et calculs purs, séparés de la requête (src/lib/db/collection-orders)
 * parce que le tableau de suivi est un composant client : importer le module
 * de requête y entraînerait `@/lib/supabase/server`, que Turbopack refuse —
 * à juste titre — d'envoyer au navigateur.
 *
 * Les statuts reprennent ceux du suivi tenu jusqu'ici par l'équipe, pas un
 * vocabulaire inventé : c'est ce que les gens lisent déjà dans leur tableau.
 */

export type CollectionStatut =
  | "En cours"
  | "Terminée"
  | "Archivée"
  | "SAV"
  | "Annulé";

export const STATUTS: CollectionStatut[] = [
  "En cours",
  "Terminée",
  "Archivée",
  "SAV",
  "Annulé",
];

export type CollectionSource = "import" | "devis" | "manuel";

export type CollectionOrder = {
  id: string;
  source: CollectionSource;
  statut: CollectionStatut;
  ref: string | null;
  clientName: string;
  clientId: string | null;
  devisId: string | null;
  dossierId: string | null;
  dateCommande: string | null;
  atelier: string | null;
  description: string | null;
  fournisseur: string | null;
  dateEnvoi: string | null;
  datePrevue: string | null;
  dateButoir: string | null;
  retardSource: string | null;
  dateReception: string | null;
  dateReceptionTissu: string | null;
  dateExpeditionUsine: string | null;
  commentaire: string | null;
  commentaireSav: string | null;
};

/**
 * Statut affiché. Le SAV prime sur tout ; sinon, dès qu'Atmosphère
 * renseigne une date de réception, la commande est archivée — c'est la
 * règle du suivi existant, conservée telle quelle.
 */
export function statutEffectif(o: CollectionOrder): CollectionStatut {
  if (o.statut === "SAV") return "SAV";
  if (o.statut === "Annulé") return "Annulé";
  return o.dateReception ? "Archivée" : o.statut;
}

/** Nombre de jours de retard tel qu'il figurait dans le suivi repris. */
function retardSourceDays(retard: string | null): number | null {
  if (!retard) return null;
  const m = retard.match(/(\d+)\s*jour/);
  return m ? Number(m[1]) : null;
}

/**
 * Jours de retard : uniquement pour une commande encore en cours dont la
 * date butoir est passée. Une commande terminée n'est jamais « en retard »,
 * même livrée tard — le tableau sert à savoir quoi relancer aujourd'hui.
 */
export function joursDeRetard(
  o: CollectionOrder,
  today: Date = new Date(),
): number | null {
  if (statutEffectif(o) !== "En cours") return null;
  if (!o.dateButoir) return retardSourceDays(o.retardSource);
  const butoir = new Date(o.dateButoir);
  if (Number.isNaN(butoir.getTime())) return retardSourceDays(o.retardSource);
  const diff = Math.floor((today.getTime() - butoir.getTime()) / 86_400_000);
  return diff > 0 ? diff : null;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]!.slice(2)}`;
}

export type CollectionStats = {
  enCours: number;
  enRetard: number;
  terminees: number;
  archivees: number;
  sav: number;
  annulees: number;
  total: number;
};

export function collectionStats(orders: CollectionOrder[]): CollectionStats {
  const s: CollectionStats = {
    enCours: 0,
    enRetard: 0,
    terminees: 0,
    archivees: 0,
    sav: 0,
    annulees: 0,
    total: orders.length,
  };
  for (const o of orders) {
    const st = statutEffectif(o);
    if (st === "En cours") {
      s.enCours++;
      if (joursDeRetard(o)) s.enRetard++;
    } else if (st === "Terminée") s.terminees++;
    else if (st === "Archivée") s.archivees++;
    else if (st === "SAV") s.sav++;
    else s.annulees++;
  }
  return s;
}

export function collectionAteliers(orders: CollectionOrder[]): string[] {
  const set = new Set<string>();
  for (const o of orders) if (o.atelier) set.add(o.atelier);
  return Array.from(set).sort();
}
