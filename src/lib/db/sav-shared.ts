export type SavStatus = "nouveau" | "en_cours" | "resolu" | "annule";
export type SavPriority = "normale" | "haute" | "urgente";

export type SavTicket = {
  id: string;
  number: string;
  client_id: string | null;
  devis_id: string | null;
  dossier_id: string | null;
  title: string;
  description: string | null;
  priority: SavPriority;
  status: SavStatus;
  assigned_to: string | null;
  store_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export type SavTicketWithRefs = SavTicket & {
  client_name: string | null;
  devis_number: string | null;
  dossier_number: string | null;
  assigned_name: string | null;
};

export type SavTicketNoteVM = {
  id: string;
  body: string;
  created_at: string;
  author_name: string | null;
};

export const SAV_STATUS_LABELS: Record<SavStatus, string> = {
  nouveau: "Nouveau",
  en_cours: "En cours",
  resolu: "Résolu",
  annule: "Annulé",
};

export const SAV_STATUS_TONES: Record<SavStatus, "pink" | "amber" | "emerald" | "neutral"> = {
  nouveau: "pink",
  en_cours: "amber",
  resolu: "emerald",
  annule: "neutral",
};

export const SAV_PRIORITY_LABELS: Record<SavPriority, string> = {
  normale: "Normale",
  haute: "Haute",
  urgente: "Urgente",
};

export const KANBAN_ORDER: SavStatus[] = ["nouveau", "en_cours", "resolu", "annule"];
