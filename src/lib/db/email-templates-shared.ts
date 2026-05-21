import type { Database } from "@/lib/supabase/types";

export type EmailTemplate = Database["public"]["Tables"]["email_templates"]["Row"];
export type EmailTemplateUpdate = Database["public"]["Tables"]["email_templates"]["Update"];

export type EmailLogRow = Database["public"]["Tables"]["email_log"]["Row"];

/** Variables interpolables identiques aux SMS pour cohérence. */
export const EMAIL_VARIABLES = [
  "prenom",
  "nom",
  "numero_devis",
  "produit",
  "total_ttc",
  "acompte",
  "date",
  "heure",
  "poseur",
  "lien_pdf",
  "lien_avis",
] as const;
