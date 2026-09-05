import type { Database } from "@/lib/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
export type UserRole = Database["public"]["Enums"]["user_role"];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrateur",
  resp_magasin: "Responsable magasin",
  commercial: "Commercial · Back-office",
  resp_confection: "Resp. confection",
  couturiere: "Couturière",
  couturiere_externe: "Couturière externe",
  poseur: "Poseur",
  poseur_externe: "Poseur externe",
  decoratrice: "Décoratrice",
  consultation_lm: "Consultation Leroy Merlin",
};

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ["Accès complet", "Paramétrage", "Utilisateurs", "Rapports", "Clôtures de caisse"],
  resp_magasin: ["Devis & factures de son magasin", "Caisse", "Clients", "Tarifs paramétrables", "Rapports magasin"],
  commercial: ["Simulateur", "Devis", "Fiches clients", "Suivi commandes", "Tableau de bord"],
  resp_confection: ["Suivi confections", "Assignation couturières", "Réception colis", "Bons de travail"],
  couturiere: ["Ses bons de travail", "Mise à jour statut confection"],
  couturiere_externe: ["Toutes les fiches de confection (lecture)", "Mise à jour statut confection (externe à l'entreprise)"],
  poseur: ["Interventions à planifier", "Contact client", "Confirmation pose"],
  poseur_externe: ["Ses interventions de pose uniquement", "Confirmation pose (externe à l'entreprise)"],
  decoratrice: ["Ses rendez-vous", "Fiches clients", "Historique", "Consultation Atmoleads"],
  consultation_lm: ["Tableau de bord", "Atmoleads", "Activité", "Templates", "Architecture"],
};

export const ROLE_COLORS: Record<UserRole, "ink" | "violet" | "orange" | "pink" | "emerald" | "blue" | "amber"> = {
  admin: "ink",
  resp_magasin: "violet",
  commercial: "violet",
  resp_confection: "orange",
  couturiere: "pink",
  couturiere_externe: "pink",
  poseur: "emerald",
  poseur_externe: "emerald",
  decoratrice: "blue",
  consultation_lm: "amber",
};

/**
 * Routes accessibles par rôle. Une route est accessible si :
 *   - elle est dans `ROLE_ROUTES[role].allowed` (préfixes exacts), OU
 *   - elle est une route "any signed-in" (ex: /auth/sign-out)
 *
 * L'admin a accès à tout sans devoir lister chaque route.
 * Les autres rôles sont restreints à un sous-ensemble.
 */
export type RouteAccess = {
  /** Si true, accès à toutes les routes (admin). */
  all?: boolean;
  /** Préfixes de routes autorisées. Match : pathname.startsWith(prefix). */
  allowed?: string[];
  /** Route de redirection si l'utilisateur tape une URL interdite. */
  homeRoute: string;
};

export const ROLE_ROUTES: Record<UserRole, RouteAccess> = {
  admin: { all: true, homeRoute: "/dashboard" },
  resp_magasin: {
    allowed: [
      "/dashboard",
      "/boutique",
      "/devis",
      "/confections",
      "/commandes",
      "/clients",
      "/caisse",
      "/feed",
      "/leads-lm",
      "/parametres",
      "/poses",
      "/agenda",
      "/reception",
      "/collection",
      "/virements",
    ],
    homeRoute: "/dashboard",
  },
  commercial: {
    allowed: [
      "/dashboard",
      "/boutique",
      "/devis",
      "/confections",
      "/commandes",
      "/clients",
      "/feed",
      "/leads-lm",
    ],
    homeRoute: "/dashboard",
  },
  resp_confection: {
    allowed: ["/dashboard", "/confections", "/commandes", "/reception", "/poses", "/feed"],
    homeRoute: "/confections",
  },
  couturiere: {
    allowed: ["/confections", "/feed"],
    homeRoute: "/confections",
  },
  couturiere_externe: {
    allowed: ["/confections"],
    homeRoute: "/confections",
  },
  poseur: {
    allowed: ["/poses", "/agenda", "/feed"],
    homeRoute: "/poses",
  },
  poseur_externe: {
    allowed: ["/poses"],
    homeRoute: "/poses",
  },
  decoratrice: {
    allowed: ["/clients", "/devis", "/boutique", "/agenda", "/feed", "/leads-lm"],
    homeRoute: "/clients",
  },
  consultation_lm: {
    allowed: ["/dashboard", "/leads-lm", "/feed", "/templates", "/architecture"],
    homeRoute: "/dashboard",
  },
};

/**
 * Routes toujours accessibles à un utilisateur connecté quel que soit son rôle.
 * (Auth, profile, API webhooks/cron sont gérés ailleurs.)
 */
export const ROUTES_ALWAYS_ALLOWED = ["/403", "/auth/sign-out", "/api/health"];

/**
 * Renvoie true si l'utilisateur avec ce rôle peut accéder à ce pathname.
 */
export function canAccess(role: UserRole, pathname: string): boolean {
  if (ROUTES_ALWAYS_ALLOWED.some((r) => pathname.startsWith(r))) return true;
  const access = ROLE_ROUTES[role];
  if (!access) return false;
  if (access.all) return true;
  return (access.allowed ?? []).some((p) => pathname.startsWith(p));
}
