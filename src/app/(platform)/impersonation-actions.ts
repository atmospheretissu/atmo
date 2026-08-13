"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  IMPERSONATION_COOKIE_NAME,
  IMPERSONATION_ROLE_PREFIX,
} from "@/lib/db/impersonation";
import type { UserRole } from "@/lib/db/profiles-shared";

const VALID_ROLES: UserRole[] = [
  "admin",
  "commercial",
  "resp_confection",
  "resp_magasin",
  "couturiere",
  "couturiere_externe",
  "poseur",
  "poseur_externe",
  "decoratrice",
  "consultation_lm",
];

export type SwitchableProfile = {
  id: string;
  full_name: string;
  role: string;
  email: string;
};

/** Liste des profils vers lesquels un admin peut switcher. */
export async function listSwitchableProfilesAction(): Promise<SwitchableProfile[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "admin") return [];

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, email")
    .neq("id", user.id)
    .eq("active", true)
    .order("full_name", { ascending: true });
  return (data ?? []) as SwitchableProfile[];
}

/** Active/désactive l'impersonation. `null` désactive. */
export async function setImpersonatedProfileAction(
  targetProfileId: string | null,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée" };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "admin") {
    return { ok: false, message: "Seul un admin peut activer le mode simulation." };
  }

  const cookieStore = await cookies();
  if (targetProfileId === null || targetProfileId === user.id) {
    cookieStore.delete(IMPERSONATION_COOKIE_NAME);
  } else {
    // Vérifie que le profil cible existe et est actif
    const { data: target } = await supabase
      .from("profiles")
      .select("id, active")
      .eq("id", targetProfileId)
      .maybeSingle();
    if (!target || target.active === false) {
      return { ok: false, message: "Profil cible introuvable ou inactif." };
    }
    cookieStore.set(IMPERSONATION_COOKIE_NAME, targetProfileId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 4, // 4h
    });
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Sortie rapide du mode simulation via un redirect vers /dashboard. */
export async function stopImpersonationAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATION_COOKIE_NAME);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Version "cookie only" — efface simplement le cookie sans redirect.
 * Utilisée par le client qui gère lui-même la redirection avec un
 * window.location.href (évite les cas où le cookie effacé ne se
 * propage pas correctement avec les redirects Next).
 */
export async function clearImpersonationCookieAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATION_COOKIE_NAME);
}

/**
 * Active la simulation d'un rôle sans passer par un profil précis. Le
 * cookie contient `role:<role>` — la navigation, les permissions
 * client-side et l'affichage utilisent ce rôle, mais l'user id reste
 * celui de l'admin pour ne pas casser la RLS.
 */
export async function setImpersonatedRoleAction(
  role: UserRole,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée" };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "admin") {
    return { ok: false, message: "Seul un admin peut activer la simulation." };
  }
  if (!VALID_ROLES.includes(role)) {
    return { ok: false, message: "Rôle inconnu." };
  }

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATION_COOKIE_NAME, `${IMPERSONATION_ROLE_PREFIX}${role}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4,
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
