/**
 * Source de vérité du workflow Atmosphère — 8 statuts + SAV.
 *
 * Référence : Review client (PDF) page 2 + flowchart final.
 *
 *   1. DEVIS                              (côté devis, n'apparaît pas ici)
 *   2. COMMANDE VALIDE - ACOMPTE REÇU    → commande_validee
 *   3. ATTENTE MATIÈRE                    → attente_matiere       (alerte >10j)
 *   4. CONFECTION EN COURS                → confection_en_cours   (alerte >12j)
 *   5. PRÊT POUR LA POSE                  → pret_pose
 *   6. POSE À PLANIFIER - SOLDE REÇU      → pose_a_planifier
 *   7. POSE À VENIR                       → pose_a_venir
 *   8. CLÔTURE                            → cloture
 *   SAV                                   → sav (état parallèle, hors flow linéaire)
 */

export const WORKFLOW_STATUSES = [
  "commande_validee",
  "attente_matiere",
  "confection_en_cours",
  "pret_pose",
  "pose_a_planifier",
  "pose_a_venir",
  "cloture",
  "sav",
] as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

/** Statuts historiques (rétrocompat avec l'enum, après migration ne sont plus utilisés). */
export const LEGACY_STATUSES = [
  "en_cours",
  "tout_commande",
  "reception_partielle",
  "en_confection",
  "planifie",
  "pose",
] as const;

export type AnyDossierStatus = WorkflowStatus | (typeof LEGACY_STATUSES)[number];

export type StatusMeta = {
  label: string;
  shortLabel: string;
  description: string;
  tone: "muted" | "blue" | "amber" | "violet" | "emerald" | "pink" | "yellow" | "neutral" | "orange";
  dot: string;
  /** Ordre dans le workflow (-1 si hors flow). */
  order: number;
  /** Délai max en jours avant alerte. null = pas d'alerte temps. */
  alertDays: number | null;
  /** Colonne timestamp de l'entrée dans ce statut (pour calcul d'âge). */
  enteredAtColumn: keyof DossierTimestampColumns | null;
};

type DossierTimestampColumns = {
  attente_matiere_at: string | null;
  confection_started_at: string | null;
  pret_pose_at: string | null;
  cloture_at: string | null;
  acompte_paid_at: string | null;
  solde_paid_at: string | null;
};

export const STATUS_META: Record<WorkflowStatus, StatusMeta> = {
  commande_validee: {
    label: "Commande validée",
    shortLabel: "Commande",
    description: "Acompte reçu, commande lancée",
    tone: "blue",
    dot: "bg-blue",
    order: 1,
    alertDays: null,
    enteredAtColumn: "acompte_paid_at",
  },
  attente_matiere: {
    label: "Attente matière",
    shortLabel: "Attente matière",
    description: "Commandes fournisseurs en cours, en attente de réception",
    tone: "amber",
    dot: "bg-amber",
    order: 2,
    alertDays: 10,
    enteredAtColumn: "attente_matiere_at",
  },
  confection_en_cours: {
    label: "Confection en cours",
    shortLabel: "Confection",
    description: "Tissus reçus, fiche envoyée à l'atelier",
    tone: "violet",
    dot: "bg-violet",
    order: 3,
    alertDays: 12,
    enteredAtColumn: "confection_started_at",
  },
  pret_pose: {
    label: "Prêt pour la pose",
    shortLabel: "Prêt",
    description: "Confection terminée, tous éléments réceptionnés",
    tone: "emerald",
    dot: "bg-emerald",
    order: 4,
    alertDays: null,
    enteredAtColumn: "pret_pose_at",
  },
  pose_a_planifier: {
    label: "Pose à planifier (solde reçu)",
    shortLabel: "À planifier",
    description: "Solde réglé, prêt à fixer le créneau de pose",
    tone: "pink",
    dot: "bg-pink",
    order: 5,
    alertDays: null,
    enteredAtColumn: "solde_paid_at",
  },
  pose_a_venir: {
    label: "Pose à venir",
    shortLabel: "Planifiée",
    description: "Créneau confirmé avec le client",
    tone: "orange",
    dot: "bg-orange",
    order: 6,
    alertDays: null,
    enteredAtColumn: null,
  },
  cloture: {
    label: "Clôturé",
    shortLabel: "Clôturé",
    description: "Pose effectuée, dossier terminé",
    tone: "neutral",
    dot: "bg-muted-2",
    order: 7,
    alertDays: null,
    enteredAtColumn: "cloture_at",
  },
  sav: {
    label: "SAV",
    shortLabel: "SAV",
    description: "Service après-vente en cours",
    tone: "yellow",
    dot: "bg-yellow",
    order: -1, // hors flow principal
    alertDays: null,
    enteredAtColumn: null,
  },
};

/** Pour les statuts legacy (avant migration) qui pourraient encore apparaître. */
export const LEGACY_STATUS_LABELS: Record<string, string> = {
  en_cours: "En cours (legacy)",
  tout_commande: "Tout commandé (legacy)",
  reception_partielle: "Réception partielle (legacy)",
  en_confection: "En confection (legacy)",
  planifie: "Planifié (legacy)",
  pose: "Posé (legacy)",
};

/** Label sûr d'un statut (gère aussi les statuts legacy). */
export function statusLabel(s: string): string {
  if (s in STATUS_META) return STATUS_META[s as WorkflowStatus].label;
  if (s in LEGACY_STATUS_LABELS) return LEGACY_STATUS_LABELS[s];
  return s;
}

/** Tone sûr (fallback muted pour les statuts inconnus). */
export function statusTone(s: string): StatusMeta["tone"] {
  if (s in STATUS_META) return STATUS_META[s as WorkflowStatus].tone;
  return "muted";
}

/**
 * Renvoie le nombre de jours depuis l'entrée dans le statut courant, et
 * indique si on a dépassé le seuil d'alerte (>10j pour attente_matiere, >12j
 * pour confection_en_cours, etc.).
 */
export function ageInStatus(
  status: string,
  dossier: Partial<DossierTimestampColumns> & { created_at: string; updated_at?: string | null },
): { days: number; isOverdue: boolean; threshold: number | null } | null {
  const meta = STATUS_META[status as WorkflowStatus];
  if (!meta) return null;

  const col = meta.enteredAtColumn;
  const enteredAt =
    (col && dossier[col]) ? dossier[col] : dossier.updated_at ?? dossier.created_at;
  if (!enteredAt) return null;

  const days = Math.floor((Date.now() - new Date(enteredAt).getTime()) / 86400000);
  const threshold = meta.alertDays;
  return {
    days,
    threshold,
    isOverdue: threshold !== null && days > threshold,
  };
}

/** Ordre du kanban (les colonnes affichées de gauche à droite). */
export const KANBAN_ORDER: WorkflowStatus[] = [
  "commande_validee",
  "attente_matiere",
  "confection_en_cours",
  "pret_pose",
  "pose_a_planifier",
  "pose_a_venir",
  "cloture",
  "sav",
];
