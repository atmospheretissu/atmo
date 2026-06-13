import { createClient } from "@/lib/supabase/server";

// Re-export pour rétro-compat
export {
  sourceColorToTone,
  resolveSourceLabel,
  type Source,
  type SourceColor,
} from "./sources-shared";
import type { Source } from "./sources-shared";

export async function listSources(opts?: { activeOnly?: boolean }): Promise<Source[]> {
  const supabase = await createClient();
  let q = supabase.from("sources").select("*").order("position", { ascending: true });
  if (opts?.activeOnly) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}
