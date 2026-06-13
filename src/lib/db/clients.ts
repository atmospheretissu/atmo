import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
export type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];
export type Channel = Database["public"]["Enums"]["channel"];

/**
 * List clients ordered by most recent activity.
 * RLS enforces that only authenticated users can read.
 */
export async function listClients(opts?: {
  search?: string;
  channel?: Channel;
  limit?: number;
}) {
  const supabase = await createClient();
  let q = supabase
    .from("clients")
    .select("*")
    .order("updated_at", { ascending: false });

  if (opts?.channel) q = q.eq("channel", opts.channel);
  if (opts?.search) {
    // Recherche multi-critères : nom, ville, email, téléphone
    const s = opts.search.replace(/[%,]/g, "");
    q = q.or(
      `display_name.ilike.%${s}%,city.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`,
    );
  }
  if (opts?.limit) q = q.limit(opts.limit);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

/**
 * Get a single client by id.
 * Returns null if not found (404 case).
 */
export async function getClient(id: string): Promise<Client | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Aggregated stats per client — used for the listing rollup row
 * (count clients, total CA, channel breakdown, etc.).
 */
export async function getClientStats(): Promise<{
  total: number;
  byChannel: Record<string, number>;
  totalCA: number;
}> {
  const supabase = await createClient();

  // Single round-trip: fetch only what we need.
  const [{ data: clients, error: e1 }, { data: paidDevis, error: e2 }] = await Promise.all([
    supabase.from("clients").select("channel"),
    supabase
      .from("devis")
      .select("total_ttc, client_id")
      .in("status", ["valide", "acompte_recu"]),
  ]);

  if (e1) throw e1;
  if (e2) throw e2;

  const byChannel: Record<string, number> = {};
  for (const c of clients ?? []) {
    byChannel[c.channel] = (byChannel[c.channel] ?? 0) + 1;
  }

  const totalCA = (paidDevis ?? []).reduce((acc, d) => acc + Number(d.total_ttc ?? 0), 0);

  return {
    total: clients?.length ?? 0,
    byChannel,
    totalCA,
  };
}

/**
 * Fetch a client + their related devis (for the detail page).
 */
export async function getClientWithDevis(id: string) {
  const supabase = await createClient();

  const [{ data: client, error: e1 }, { data: devis, error: e2 }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("devis")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (e1) throw e1;
  if (e2) throw e2;
  if (!client) return null;

  return { client, devis: devis ?? [] };
}
