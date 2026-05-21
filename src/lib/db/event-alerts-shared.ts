import type { Database } from "@/lib/supabase/types";

export type EventAlert = Database["public"]["Tables"]["event_alerts"]["Row"];
export type EventAlertInsert = Database["public"]["Tables"]["event_alerts"]["Insert"];
export type EventAlertUpdate = Database["public"]["Tables"]["event_alerts"]["Update"];

/**
 * Critères supportés dans `criteria` JSON.
 * Toute valeur absente = pas de filtre sur cette dimension.
 */
export type AlertCriteria = {
  min_amount?: number;
  max_amount?: number;
  channels?: string[]; // filtre devis.channel : ["magasin","leroy_merlin",...]
};

/** Contexte fourni par les callers de triggerEvent pour évaluer les critères. */
export type CriteriaContext = {
  amount?: number; // montant TTC du devis / ticket / etc.
  channel?: string; // canal du devis
};

/**
 * Évalue les critères : retourne true si l'alerte matche le contexte.
 */
export function matchesCriteria(
  criteria: AlertCriteria | undefined | null,
  ctx: CriteriaContext | undefined | null,
): boolean {
  if (!criteria || Object.keys(criteria).length === 0) return true;
  const amount = ctx?.amount;
  if (criteria.min_amount != null && (amount == null || amount < criteria.min_amount)) {
    return false;
  }
  if (criteria.max_amount != null && (amount == null || amount > criteria.max_amount)) {
    return false;
  }
  if (criteria.channels && criteria.channels.length > 0) {
    if (!ctx?.channel || !criteria.channels.includes(ctx.channel)) return false;
  }
  return true;
}
