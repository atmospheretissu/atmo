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
    couturiere_externe: 0,
    poseur: 0,
    poseur_externe: 0,
    decoratrice: 0,
    consultation_lm: 0,
    collection_atmosphere: 0,
  };
  for (const p of profiles) {
    if (p.active !== false) counts[p.role] += 1;
  }
  return counts;
}

/**
 * Métadonnées d'authentification d'un utilisateur, jointes au profil.
 * Permet à l'onglet Utilisateurs d'afficher l'état réel du compte :
 * email confirmé, dernière connexion, et surtout les comptes
 * « orphelins » présents dans auth.users mais sans ligne profiles —
 * jusqu'ici totalement invisibles dans l'UI.
 */
export type AuthUserRow = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  /** false = compte auth sans profil (à rattacher) */
  has_profile: boolean;
};

export async function listAuthUsers(): Promise<AuthUserRow[]> {
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const admin = createServiceRoleClient();

  // L'API admin pagine à 50 par défaut — on monte à 200, largement
  // au-dessus de la taille d'équipe actuelle (~18 comptes).
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error) throw error;

  const { data: profileRows } = await admin.from("profiles").select("id");
  const withProfile = new Set((profileRows ?? []).map((p) => p.id));

  return (data?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "",
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    email_confirmed_at: u.email_confirmed_at ?? null,
    has_profile: withProfile.has(u.id),
  }));
}
