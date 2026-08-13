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
  /** Nom du profil impersonné, OU rôle simulé si mode « rôle nu ». */
  impersonatedName: string | null;
  /** True si on simule juste un rôle (sans profil utilisateur ciblé). */
  isRoleOnlySimulation: boolean;
};

const ROLE_COOKIE_PREFIX = "role:";
const VALID_ROLES: UserRole[] = [
  "admin",
  "commercial",
  "resp_confection",
  "couturiere",
  "couturiere_externe",
  "poseur",
  "poseur_externe",
  "decoratrice",
  "consultation_lm",
  "resp_magasin",
];

const ROLE_LABELS_FR: Record<UserRole, string> = {
  admin: "Admin",
  commercial: "Commercial",
  resp_confection: "Responsable confection",
  resp_magasin: "Responsable magasin",
  couturiere: "Couturière",
  couturiere_externe: "Couturière externe",
  poseur: "Poseur",
  poseur_externe: "Poseur externe",
  decoratrice: "Décoratrice",
  consultation_lm: "Consultation LM",
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
  const cookieValue = cookieStore.get(COOKIE_NAME)?.value;

  // Impersonation valide uniquement pour un admin réel + cookie présent
  if (actualRole === "admin" && cookieValue) {
    // Mode 1 — « role only » : on simule un rôle sans profil ciblé.
    //   Cookie de la forme `role:poseur` — l'UI navigue avec ce rôle,
    //   mais effectiveUserId reste l'admin (pour ne pas casser la RLS).
    if (cookieValue.startsWith(ROLE_COOKIE_PREFIX)) {
      const role = cookieValue.slice(ROLE_COOKIE_PREFIX.length) as UserRole;
      if ((VALID_ROLES as string[]).includes(role)) {
        return {
          actualUserId: user.id,
          actualRole,
          effectiveUserId: user.id,
          effectiveRole: role,
          isImpersonating: true,
          impersonatedName: `Simulation · ${ROLE_LABELS_FR[role]}`,
          isRoleOnlySimulation: true,
        };
      }
    }

    // Mode 2 — impersonation d'un profil précis (id UUID)
    if (cookieValue !== user.id) {
      const { data: target } = await supabase
        .from("profiles")
        .select("id, role, full_name, active")
        .eq("id", cookieValue)
        .maybeSingle();
      if (target && target.active !== false) {
        return {
          actualUserId: user.id,
          actualRole,
          effectiveUserId: target.id,
          effectiveRole: target.role as UserRole,
          isImpersonating: true,
          impersonatedName: target.full_name,
          isRoleOnlySimulation: false,
        };
      }
    }
  }

  return {
    actualUserId: user.id,
    actualRole,
    effectiveUserId: user.id,
    effectiveRole: actualRole,
    isImpersonating: false,
    impersonatedName: null,
    isRoleOnlySimulation: false,
  };
}

export const IMPERSONATION_COOKIE_NAME = COOKIE_NAME;
export const IMPERSONATION_ROLE_PREFIX = ROLE_COOKIE_PREFIX;
