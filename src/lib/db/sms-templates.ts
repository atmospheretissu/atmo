import { createClient } from "@/lib/supabase/server";
import type { SmsTemplate } from "./sms-templates-shared";

export type { SmsTemplate, SmsTemplateUpdate } from "./sms-templates-shared";
export { SMS_VARIABLES } from "./sms-templates-shared";

export async function listSmsTemplates(): Promise<SmsTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sms_templates")
    .select("*")
    .order("key", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
