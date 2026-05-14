import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type LmLead = Database["public"]["Tables"]["lm_leads"]["Row"];
export type LeadStatus = Database["public"]["Enums"]["lead_status"];

export type LmLeadWithClient = LmLead & {
  clients:
    | {
        id: string;
        display_name: string;
        email: string | null;
        phone: string | null;
        city: string | null;
        postal_code: string | null;
        address_pose: string | null;
      }
    | null;
};

/**
 * List Leroy Merlin leads with their related client.
 * Newest first. RLS enforces staff-only writes (read is authenticated-only).
 */
export async function listLmLeads(opts?: {
  status?: LeadStatus;
  search?: string;
  limit?: number;
}): Promise<LmLeadWithClient[]> {
  const supabase = await createClient();
  let q = supabase
    .from("lm_leads")
    .select(
      "*, clients(id, display_name, email, phone, city, postal_code, address_pose)",
    )
    .order("created_at", { ascending: false });

  if (opts?.status) q = q.eq("status", opts.status);
  if (opts?.limit) q = q.limit(opts.limit);

  const { data, error } = await q;
  if (error) throw error;

  let rows = (data ?? []) as unknown as LmLeadWithClient[];
  if (opts?.search) {
    const s = opts.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.number.toLowerCase().includes(s) ||
        r.region.toLowerCase().includes(s) ||
        r.product_summary.toLowerCase().includes(s) ||
        (r.clients?.display_name.toLowerCase().includes(s) ?? false) ||
        (r.clients?.city?.toLowerCase().includes(s) ?? false),
    );
  }
  return rows;
}

export async function getLmLeadStats(): Promise<{
  total: number;
  byStatus: Record<LeadStatus, number>;
  totalAmount: number;
  last24h: number;
}> {
  const supabase = await createClient();
  const yesterday = new Date(Date.now() - 24 * 3_600_000).toISOString();

  const [{ data: all, error: e1 }, { count: last24h, error: e2 }] = await Promise.all([
    supabase.from("lm_leads").select("status, amount"),
    supabase
      .from("lm_leads")
      .select("*", { count: "exact", head: true })
      .gte("created_at", yesterday),
  ]);

  if (e1) throw e1;
  if (e2) throw e2;

  const byStatus = {
    nouveau: 0,
    visio_planifie: 0,
    echantillons: 0,
    devis_envoye: 0,
    valide: 0,
    perdu: 0,
  } as Record<LeadStatus, number>;
  let totalAmount = 0;
  for (const l of all ?? []) {
    byStatus[l.status] += 1;
    totalAmount += Number(l.amount ?? 0);
  }

  return {
    total: (all ?? []).length,
    byStatus,
    totalAmount,
    last24h: last24h ?? 0,
  };
}

/**
 * Last successful Atmolead scraping execution, if any.
 * Tolerant: if atmolead_executions doesn't exist yet (e.g. migration not applied),
 * returns null without throwing.
 */
export async function getLastAtmoleadRun(): Promise<{
  started_at: string;
  leads_inserted: number;
  duration_ms: number | null;
} | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("atmolead_executions" as never)
    .select("started_at, leads_inserted, duration_ms")
    .in("status", ["success", "partial"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data as { started_at: string; leads_inserted: number; duration_ms: number | null } | null;
}
