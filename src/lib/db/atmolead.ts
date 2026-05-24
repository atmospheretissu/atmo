/**
 * Atmolead orchestration tables. Reads + writes go through here.
 * Uses `as never` casts because the atmolead_* tables aren't in the
 * generated Database types — they're managed by the lead repo, not Atmo.
 */
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export type AtmoleadExecutionStatus = "running" | "success" | "partial" | "failed";

export type AtmoleadExecution = {
  id: string;
  status: AtmoleadExecutionStatus;
  triggered_by: "cron" | "manual" | "startup";
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  leads_found: number;
  leads_inserted: number;
  leads_skipped: number;
  error_message: string | null;
  worker_version: string | null;
  logs: AtmoleadStep[] | null;
};

export type AtmoleadStep = {
  name: string;
  label: string;
  status: "ok" | "failed" | "partial";
  started_at: string;
  duration_ms: number;
  message?: string;
  data?: Record<string, unknown>;
};

export type AtmoleadRawLead = {
  id: string;
  execution_id: string | null;
  external_ref: string | null;
  raw_data: Record<string, unknown> | null;
  source_url: string | null;
  client_id: string | null;
  lm_lead_id: string | null;
  inserted: boolean;
  skip_reason: string | null;
  created_at: string;
};

export type AtmoleadConfig = {
  id: true;
  target_url: string;
  cron_expression: string;
  enabled: boolean;
  css_selectors: Record<string, string>;
  last_run_at: string | null;
  notes: string | null;
};

export async function listAtmoleadExecutions(opts: {
  page: number;
  pageSize: number;
}): Promise<{ rows: AtmoleadExecution[]; total: number }> {
  const supabase = await createClient();
  const offset = (opts.page - 1) * opts.pageSize;
  const { data, count, error } = await supabase
    .from("atmolead_executions" as never)
    .select("*", { count: "exact" })
    .order("started_at", { ascending: false })
    .range(offset, offset + opts.pageSize - 1);
  if (error) {
    // Migration probably not applied yet — return empty rather than crash.
    if (error.code === "PGRST205" || /relation .* does not exist/i.test(error.message)) {
      return { rows: [], total: 0 };
    }
    throw error;
  }
  return {
    rows: (data ?? []) as unknown as AtmoleadExecution[],
    total: count ?? 0,
  };
}

export async function getAtmoleadExecutionStats(): Promise<{
  total: number;
  success24h: number;
  failed24h: number;
  partial24h: number;
}> {
  const supabase = await createClient();
  const yesterday = new Date(Date.now() - 24 * 3_600_000).toISOString();
  try {
    const [{ count: total }, { count: success24h }, { count: failed24h }, { count: partial24h }] =
      await Promise.all([
        supabase
          .from("atmolead_executions" as never)
          .select("*", { count: "exact", head: true }),
        supabase
          .from("atmolead_executions" as never)
          .select("*", { count: "exact", head: true })
          .eq("status", "success")
          .gte("started_at", yesterday),
        supabase
          .from("atmolead_executions" as never)
          .select("*", { count: "exact", head: true })
          .eq("status", "failed")
          .gte("started_at", yesterday),
        supabase
          .from("atmolead_executions" as never)
          .select("*", { count: "exact", head: true })
          .eq("status", "partial")
          .gte("started_at", yesterday),
      ]);
    return {
      total: total ?? 0,
      success24h: success24h ?? 0,
      failed24h: failed24h ?? 0,
      partial24h: partial24h ?? 0,
    };
  } catch {
    return { total: 0, success24h: 0, failed24h: 0, partial24h: 0 };
  }
}

export async function getAtmoleadExecution(id: string): Promise<AtmoleadExecution | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("atmolead_executions" as never)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    if (error.code === "PGRST205" || /relation .* does not exist/i.test(error.message)) {
      return null;
    }
    throw error;
  }
  return (data as unknown as AtmoleadExecution) ?? null;
}

export async function listAtmoleadRawLeads(executionId: string): Promise<AtmoleadRawLead[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("atmolead_leads_raw" as never)
    .select(
      "id, execution_id, external_ref, raw_data, source_url, client_id, lm_lead_id, inserted, skip_reason, created_at",
    )
    .eq("execution_id", executionId)
    .order("created_at", { ascending: true });
  if (error) {
    if (error.code === "PGRST205" || /relation .* does not exist/i.test(error.message)) {
      return [];
    }
    throw error;
  }
  return (data ?? []) as unknown as AtmoleadRawLead[];
}

export async function getAtmoleadConfig(): Promise<AtmoleadConfig | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("atmolead_config" as never)
    .select("*")
    .maybeSingle();
  if (error) {
    if (error.code === "PGRST205" || /relation .* does not exist/i.test(error.message)) {
      return null;
    }
    throw error;
  }
  return (data as unknown as AtmoleadConfig) ?? null;
}

export async function getLeadsLast24hCount(): Promise<number> {
  const supabase = await createClient();
  const yesterday = new Date(Date.now() - 24 * 3_600_000).toISOString();
  try {
    const { count } = await supabase
      .from("atmolead_leads_raw" as never)
      .select("*", { count: "exact", head: true })
      .eq("inserted", true)
      .gte("created_at", yesterday);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function updateAtmoleadConfig(patch: {
  target_url: string;
  cron_expression: string;
  enabled: boolean;
  css_selectors: Record<string, string>;
  notes: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  // Use service-role to bypass RLS — admin-only API gates write access upstream.
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("atmolead_config" as never)
    .update({ ...patch, updated_at: new Date().toISOString() } as never)
    .eq("id", true);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function createAtmoleadJob(
  triggeredBy: "manual",
  requestedBy: string | null,
): Promise<{ ok: true; jobId: string } | { ok: false; message: string }> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("atmolead_jobs" as never)
    .insert({
      status: "pending",
      triggered_by: triggeredBy,
      requested_by: requestedBy,
    } as never)
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: error?.message ?? "insert failed" };
  return { ok: true, jobId: (data as { id: string }).id };
}
