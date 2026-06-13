import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { getEffectiveStoreFilter } from "@/lib/db/stores";

export type Devis = Database["public"]["Tables"]["devis"]["Row"];
export type DevisInsert = Database["public"]["Tables"]["devis"]["Insert"];
export type DevisLine = Database["public"]["Tables"]["devis_lines"]["Row"];
export type DevisLineInsert = Database["public"]["Tables"]["devis_lines"]["Insert"];
export type DevisStatus = Database["public"]["Enums"]["devis_status"];
export type ClientRow = Database["public"]["Tables"]["clients"]["Row"];

export type DevisWithClient = Devis & {
  client: Pick<ClientRow, "id" | "display_name" | "city" | "email" | "phone"> | null;
};

/**
 * List devis + clients (2 queries jointes côté app — pas de FK inferred par Supabase types).
 */
export async function listDevis(opts?: {
  status?: DevisStatus;
  limit?: number;
}): Promise<DevisWithClient[]> {
  const supabase = await createClient();

  const storeFilter = await getEffectiveStoreFilter();

  let q = supabase.from("devis").select("*").order("created_at", { ascending: false });
  if (opts?.status) q = q.eq("status", opts.status);
  if (storeFilter) q = q.eq("store_id", storeFilter);
  if (opts?.limit) q = q.limit(opts.limit);

  const { data: devisRows, error } = await q;
  if (error) throw error;
  if (!devisRows || devisRows.length === 0) return [];

  const clientIds = Array.from(new Set(devisRows.map((d) => d.client_id)));
  const { data: clientsRows } = await supabase
    .from("clients")
    .select("id, display_name, city, email, phone")
    .in("id", clientIds);

  const clientsById = new Map((clientsRows ?? []).map((c) => [c.id, c]));

  return devisRows.map((d) => ({
    ...d,
    client: clientsById.get(d.client_id) ?? null,
  }));
}

/**
 * Détail complet d'un devis (avec son client et toutes ses lignes).
 */
export async function getDevisDetail(id: string) {
  const supabase = await createClient();
  const { data: devis, error: e1 } = await supabase
    .from("devis")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (e1) throw e1;
  if (!devis) return null;

  const [
    { data: client, error: e2 },
    { data: lines, error: e3 },
    { data: dossier },
    { data: payments },
  ] = await Promise.all([
    supabase.from("clients").select("*").eq("id", devis.client_id).maybeSingle(),
    supabase
      .from("devis_lines")
      .select("*")
      .eq("devis_id", id)
      .order("position", { ascending: true }),
    supabase
      .from("dossiers")
      .select("id, number, status, acompte_paid, solde_paid, acompte_paid_at, solde_paid_at")
      .eq("devis_id", id)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("kind, method, paid_at")
      .eq("devis_id", id)
      .order("paid_at", { ascending: false }),
  ]);

  if (e2) throw e2;
  if (e3) throw e3;

  return {
    devis,
    client: client ?? null,
    lines: lines ?? [],
    dossier: dossier ?? null,
    payments: payments ?? [],
  };
}

/**
 * Aggregate stats.
 */
export async function getDevisStats() {
  const supabase = await createClient();
  const storeFilter = await getEffectiveStoreFilter();
  let q = supabase.from("devis").select("status, total_ttc");
  if (storeFilter) q = q.eq("store_id", storeFilter);
  const { data, error } = await q;
  if (error) throw error;

  const counts: Record<DevisStatus | "all", number> = {
    all: 0,
    brouillon: 0,
    envoye: 0,
    valide: 0,
    acompte_recu: 0,
    refuse: 0,
    expire: 0,
  };
  let totalCA = 0;
  let totalAcompteEnAttente = 0;

  for (const d of data ?? []) {
    counts.all += 1;
    counts[d.status as DevisStatus] += 1;
    const ttc = Number(d.total_ttc ?? 0);
    if (d.status === "valide" || d.status === "acompte_recu") totalCA += ttc;
    if (d.status === "valide") totalAcompteEnAttente += ttc * 0.5;
  }

  return { counts, totalCA, totalAcompteEnAttente };
}

/**
 * Compute next devis number — DEV-{year}-{NNNN}.
 */
export async function getNextDevisNumber(): Promise<string> {
  const supabase = await createClient();
  const year = new Date().getFullYear();
  const prefix = `DEV-${year}-`;

  const { count, error } = await supabase
    .from("devis")
    .select("*", { count: "exact", head: true })
    .like("number", `${prefix}%`);

  if (error) throw error;

  const next = (count ?? 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}
