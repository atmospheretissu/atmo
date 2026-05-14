import type { Database } from "@/lib/supabase/types";

export type SmsTemplate = Database["public"]["Tables"]["sms_templates"]["Row"];
export type SmsTemplateUpdate = Database["public"]["Tables"]["sms_templates"]["Update"];

export const SMS_VARIABLES = [
  "prenom",
  "produit",
  "date",
  "heure",
  "poseur",
  "acompte",
  "lien_pdf",
  "lien_avis",
] as const;
