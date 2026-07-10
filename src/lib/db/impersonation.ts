import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/db/profiles-shared";

const COOKIE_NAME = "atmo_impersonated_profile";

export type EffectiveProfile = {
  actualUserId: string;
  actualRole: UserRole | null;
  effectiveUserId: string;
  effectiveRole: UserRole | null;
  isImpersonating: boolean;
  impersonatedName: string | null;
};

/**
 * Résolution du profil "effectif" — celui utilisé pour l'affichage/les droits.
 * Si un admin a activé une impersonation, on retourne le profil ciblé ;
 * sinon on retourne le profil réel de l'utilisateur connecté.
 *
 * Sécurité : le cookie n'est jamais accepté si l'utilisateur réel n'est pas
 * admin (on refetch le rôle réel à chaque appel).
 */
export async function getEffectiveProfile(): Promise<EffectiveProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: actualProfile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .maybeSingle();
  const actualRole = (actualProfile?.role as UserRole | undefined) ?? null;

  const cookieStore = await cookies();
  const impersonatedId = cookieStore.get(COOKIE_NAME)?.value;

  // Impersonation valide uniquement pour un admin réel + cookie présent + id != self
  if (actualRole === "admin" && impersonatedId && impersonatedId !== user.id) {
    const { data: target } = await supabase
      .from("profiles")
      .select("id, role, full_name, active")
      .eq("id", impersonatedId)
      .maybeSingle();
    if (target && target.active !== false) {
      return {
        actualUserId: user.id,
        actualRole,
        effectiveUserId: target.id,
        effectiveRole: target.role as UserRole,
        isImpersonating: true,
        impersonatedName: target.full_name,
      };
    }
  }

  return {
    actualUserId: user.id,
    actualRole,
    effectiveUserId: user.id,
    effectiveRole: actualRole,
    isImpersonating: false,
    impersonatedName: null,
  };
}

export const IMPERSONATION_COOKIE_NAME = COOKIE_NAME;
