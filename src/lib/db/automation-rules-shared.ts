import type { Database } from "@/lib/supabase/types";

export type AutomationRule = Database["public"]["Tables"]["automation_rules"]["Row"];
export type AutomationRuleUpdate = Database["public"]["Tables"]["automation_rules"]["Update"];

/**
 * Liste de tous les événements connus côté code. Toute modification ici doit
 * être reflétée dans la migration `20260521130000_email_and_automations.sql`
 * (seed) ET dans le code qui appelle `triggerEvent(eventKey, ...)`.
 */
export const EVENT_KEYS = [
  "lead_lm_received",
  "devis_created",
  "devis_envoye",
  "acompte_recu",
  "article_pret",
  "tous_recus",
  "pose_planifiee_j1",
  "pose_effectuee",
  "caisse_ticket",
  "bc_envoye_fournisseur",
] as const;

export type EventKey = (typeof EVENT_KEYS)[number];

export const MODULE_LABELS: Record<string, string> = {
  leads: "Leads",
  devis: "Devis",
  paiements: "Paiements",
  reception: "Réception",
  poses: "Poses",
  caisse: "Caisse",
  commandes: "Commandes",
};

export const MODULE_TONES: Record<string, "violet" | "pink" | "emerald" | "blue" | "amber" | "orange"> = {
  leads: "orange",
  devis: "pink",
  paiements: "emerald",
  reception: "blue",
  poses: "violet",
  caisse: "amber",
  commandes: "blue",
};
