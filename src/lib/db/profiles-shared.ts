import type { Database } from "@/lib/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
export type UserRole = Database["public"]["Enums"]["user_role"];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrateur",
  commercial: "Commercial · Back-office",
  resp_confection: "Resp. confection",
  couturiere: "Couturière",
  poseur: "Poseur",
  decoratrice: "Décoratrice",
};

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ["Accès complet", "Paramétrage", "Utilisateurs", "Rapports", "Clôtures de caisse"],
  commercial: ["Simulateur", "Devis", "Fiches clients", "Suivi commandes", "Tableau de bord"],
  resp_confection: ["Suivi confections", "Assignation couturières", "Réception colis", "Bons de travail"],
  couturiere: ["Ses bons de travail", "Mise à jour statut confection"],
  poseur: ["Interventions à planifier", "Contact client", "Confirmation pose"],
  decoratrice: ["Ses rendez-vous", "Fiches clients", "Historique"],
};

export const ROLE_COLORS: Record<UserRole, "ink" | "violet" | "orange" | "pink" | "emerald" | "blue"> = {
  admin: "ink",
  commercial: "violet",
  resp_confection: "orange",
  couturiere: "pink",
  poseur: "emerald",
  decoratrice: "blue",
};
