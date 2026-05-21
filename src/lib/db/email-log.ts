import { createClient } from "@/lib/supabase/server";
import type { EmailLogRow } from "./email-templates-shared";

export type EmailLogWithMeta = EmailLogRow & {
  client_name: string | null;
  template_label: string | null;
};

export async function listRecentEmailLog(limit = 20): Promise<EmailLogWithMeta[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("email_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const clientIds = Array.from(new Set(rows.map((r) => r.client_id).filter(Boolean) as string[]));
  const templateKeys = Array.from(new Set(rows.map((r) => r.template_key).filter(Boolean) as string[]));

  const [{ data: clients }, { data: templates }] = await Promise.all([
    clientIds.length
      ? supabase.from("clients").select("id, display_name").in("id", clientIds)
      : Promise.resolve({ data: [] }),
    templateKeys.length
      ? supabase.from("email_templates").select("key, label").in("key", templateKeys)
      : Promise.resolve({ data: [] }),
  ]);

  const clientsById = new Map((clients ?? []).map((c) => [c.id, c.display_name]));
  const templatesByKey = new Map((templates ?? []).map((t) => [t.key, t.label]));

  return rows.map((r) => ({
    ...r,
    client_name: r.client_id ? clientsById.get(r.client_id) ?? null : null,
    template_label: r.template_key ? templatesByKey.get(r.template_key) ?? null : null,
  }));
}
