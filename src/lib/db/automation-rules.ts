import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { AutomationRule } from "./automation-rules-shared";

export type { AutomationRule, AutomationRuleUpdate, EventKey } from "./automation-rules-shared";
export { EVENT_KEYS, MODULE_LABELS, MODULE_TONES } from "./automation-rules-shared";

export async function listAutomationRules(): Promise<AutomationRule[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("automation_rules")
    .select("*")
    .order("module", { ascending: true })
    .order("event_key", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * Lit une règle d'automatisation par event_key — utilisé par triggerEvent()
 * dans le code des actions/webhooks. Utilise le service_role pour bypasser
 * RLS (les triggers sont serveur, pas authentifiés en tant qu'utilisateur).
 */
export async function getAutomationRule(eventKey: string): Promise<AutomationRule | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("automation_rules")
    .select("*")
    .eq("event_key", eventKey)
    .maybeSingle();
  return data ?? null;
}
