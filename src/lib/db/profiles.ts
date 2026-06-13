import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "./profiles-shared";

export type { Profile, ProfileUpdate, UserRole } from "./profiles-shared";
export { ROLE_LABELS, ROLE_PERMISSIONS, ROLE_COLORS } from "./profiles-shared";

export async function listProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("active", { ascending: false })
    .order("full_name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getRoleCounts(): Promise<Record<UserRole, number>> {
  const profiles = await listProfiles();
  const counts: Record<UserRole, number> = {
    admin: 0,
    resp_magasin: 0,
    commercial: 0,
    resp_confection: 0,
    couturiere: 0,
    poseur: 0,
    decoratrice: 0,
    consultation_lm: 0,
  };
  for (const p of profiles) {
    if (p.active !== false) counts[p.role] += 1;
  }
  return counts;
}
