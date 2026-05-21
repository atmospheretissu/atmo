import { createClient } from "@/lib/supabase/server";
import type { EmailTemplate } from "./email-templates-shared";

export type { EmailTemplate, EmailTemplateUpdate, EmailLogRow } from "./email-templates-shared";
export { EMAIL_VARIABLES } from "./email-templates-shared";

export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .order("key", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
