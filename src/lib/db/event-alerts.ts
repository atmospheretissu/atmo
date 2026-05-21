import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { EventAlert } from "./event-alerts-shared";

export type { EventAlert, EventAlertInsert, EventAlertUpdate, AlertCriteria, CriteriaContext } from "./event-alerts-shared";
export { matchesCriteria } from "./event-alerts-shared";

export async function listEventAlerts(eventKey?: string): Promise<EventAlert[]> {
  const supabase = await createClient();
  let q = supabase
    .from("event_alerts")
    .select("*")
    .order("event_key", { ascending: true })
    .order("created_at", { ascending: true });
  if (eventKey) q = q.eq("event_key", eventKey);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/**
 * Server-side : récupère toutes les alertes actives pour un event_key.
 * Utilisé par triggerEvent → service_role pour bypass RLS.
 */
export async function getActiveAlertsForEvent(eventKey: string): Promise<EventAlert[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("event_alerts")
    .select("*")
    .eq("event_key", eventKey)
    .eq("active", true);
  return data ?? [];
}
