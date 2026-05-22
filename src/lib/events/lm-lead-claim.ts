import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Tente de "claim" un lead LM pour traitement : UPDATE atomique qui ne marque
 * `alerts_sent_at` QUE si la colonne était NULL. Postgres garantit que parmi
 * N appels concurrents, un seul gagne la course.
 *
 *   - returns true  → le caller est responsable de fire triggerEvent
 *   - returns false → le lead a déjà été traité par un autre caller, skip
 *
 * Utilisé par : webhook lm-lead-created, manual button, cron poller.
 */
export async function tryClaimLmLead(leadId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("lm_leads")
    .update({ alerts_sent_at: new Date().toISOString() })
    .eq("id", leadId)
    .is("alerts_sent_at", null)
    .select("id");
  return (data?.length ?? 0) > 0;
}

/**
 * Force le claim — utilisé pour les renvois manuels explicites depuis l'UI.
 * Met à jour alerts_sent_at = now() même si déjà non-null.
 */
export async function forceClaimLmLead(leadId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase
    .from("lm_leads")
    .update({ alerts_sent_at: new Date().toISOString() })
    .eq("id", leadId);
}
