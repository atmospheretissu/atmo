import { createClient } from "@/lib/supabase/server";
import { getEffectiveStoreFilter } from "@/lib/db/stores";

/**
 * Vue unifiée de TOUS les paiements de l'entreprise — quelle que soit l'origine :
 *
 *   - `payments` table  : acomptes + soldes liés à un devis (Stripe, virement, etc.)
 *   - `caisse_tickets`  : ventes comptoir (espèces, CB, chèque, virement)
 *
 * Affichée dans l'onglet « Paiements » de /caisse.
 */

export type UnifiedPaymentSource = "caisse" | "devis";
export type UnifiedPaymentMethod =
  | "especes"
  | "cb"
  | "cheque"
  | "virement"
  | "stripe"
  | "autre";

export type UnifiedPayment = {
  id: string;
  source: UnifiedPaymentSource;
  /** acompte / solde / ticket */
  kind: string;
  method: UnifiedPaymentMethod;
  amount_ttc: number;
  paid_at: string;
  client_name: string | null;
  client_id: string | null;
  /** Ref humaine (numéro de devis ou de ticket) */
  ref: string;
  /** Lien vers la fiche associée (devis ou ticket) */
  link: string | null;
  notes: string | null;
  /** ISO date d'export Pennylane (null si pas encore exporté) */
  pennylane_exported_at: string | null;
  pennylane_invoice_id: string | null;
};

/** Liste consolidée des paiements récents (toutes sources). */
export async function listAllPayments(opts?: {
  limit?: number;
  method?: UnifiedPaymentMethod;
  source?: UnifiedPaymentSource;
  since?: string; // ISO date
}): Promise<UnifiedPayment[]> {
  const supabase = await createClient();
  const limit = opts?.limit ?? 200;

  // Note : pennylane_exported_at / pennylane_invoice_id sélectionnés via "*"
  // car les types Supabase ne sont pas régénérés (migration appliquée plus tard).
  // Cast en `as never` puis re-typage manuel après la query.
  type PaymentRow = {
    id: string; kind: string; method: string | null; amount_ttc: number | string;
    paid_at: string | null; notes: string | null; devis_id: string | null; client_id: string | null;
    pennylane_exported_at?: string | null; pennylane_invoice_id?: string | null;
  };
  type TicketRow = {
    id: string; number: string; total_ttc: number | string; payment_method: string;
    created_at: string; client_id: string | null; receipt_email: string | null;
    pennylane_exported_at?: string | null; pennylane_invoice_id?: string | null;
  };

  const storeFilter = await getEffectiveStoreFilter();
  let payQ = supabase
    .from("payments")
    .select("*")
    .order("paid_at", { ascending: false })
    .limit(limit);
  let ticketQ = supabase
    .from("caisse_tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (storeFilter) {
    payQ = payQ.eq("store_id", storeFilter);
    ticketQ = ticketQ.eq("store_id", storeFilter);
  }
  const [paymentsRes, ticketsRes] = await Promise.all([payQ, ticketQ]);

  const paymentsData = (paymentsRes.data ?? []) as unknown as PaymentRow[];
  const ticketsData = (ticketsRes.data ?? []) as unknown as TicketRow[];

  // Récupère les numéros devis et noms clients en batch
  const devisIds = Array.from(
    new Set(
      paymentsData
        .map((p) => p.devis_id)
        .filter((x): x is string => Boolean(x)),
    ),
  );
  const clientIds = Array.from(
    new Set([
      ...paymentsData.map((p) => p.client_id),
      ...ticketsData.map((t) => t.client_id),
    ].filter((x): x is string => Boolean(x))),
  );

  const [devisRows, clientsRows] = await Promise.all([
    devisIds.length > 0
      ? supabase.from("devis").select("id, number").in("id", devisIds)
      : Promise.resolve({ data: [] as { id: string; number: string }[] }),
    clientIds.length > 0
      ? supabase.from("clients").select("id, display_name").in("id", clientIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string }[] }),
  ]);

  const devisById = new Map(
    (devisRows.data ?? []).map((d) => [d.id, d.number]),
  );
  const clientNameById = new Map(
    (clientsRows.data ?? []).map((c) => [c.id, c.display_name]),
  );

  const all: UnifiedPayment[] = [];

  for (const p of paymentsData) {
    if (!p.paid_at) continue;
    all.push({
      id: `p:${p.id}`,
      source: "devis",
      kind: p.kind,
      method: (p.method as UnifiedPaymentMethod) ?? "autre",
      amount_ttc: Number(p.amount_ttc ?? 0),
      paid_at: p.paid_at,
      client_id: p.client_id ?? null,
      client_name: p.client_id ? clientNameById.get(p.client_id) ?? null : null,
      ref: p.devis_id ? devisById.get(p.devis_id) ?? "Devis" : "Devis",
      link: p.devis_id ? `/devis/${p.devis_id}` : null,
      notes: p.notes ?? null,
      pennylane_exported_at: p.pennylane_exported_at ?? null,
      pennylane_invoice_id: p.pennylane_invoice_id ?? null,
    });
  }

  for (const t of ticketsData) {
    all.push({
      id: `t:${t.id}`,
      source: "caisse",
      kind: "vente",
      method: (t.payment_method as UnifiedPaymentMethod) ?? "autre",
      amount_ttc: Number(t.total_ttc ?? 0),
      paid_at: t.created_at,
      client_id: t.client_id ?? null,
      client_name: t.client_id ? clientNameById.get(t.client_id) ?? null : null,
      ref: t.number,
      link: null,
      notes: t.receipt_email ? `Ticket envoyé à ${t.receipt_email}` : null,
      pennylane_exported_at: t.pennylane_exported_at ?? null,
      pennylane_invoice_id: t.pennylane_invoice_id ?? null,
    });
  }

  // Filtres optionnels
  let filtered = all;
  if (opts?.method) filtered = filtered.filter((p) => p.method === opts.method);
  if (opts?.source) filtered = filtered.filter((p) => p.source === opts.source);
  if (opts?.since) filtered = filtered.filter((p) => p.paid_at >= opts.since!);

  filtered.sort((a, b) => (a.paid_at < b.paid_at ? 1 : -1));
  return filtered.slice(0, limit);
}

/** Agrégats sur les paiements affichés (total + par mode). */
export function summarizePayments(payments: UnifiedPayment[]) {
  const byMethod = new Map<UnifiedPaymentMethod, { count: number; total: number }>();
  let total = 0;
  for (const p of payments) {
    total += p.amount_ttc;
    const cur = byMethod.get(p.method) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += p.amount_ttc;
    byMethod.set(p.method, cur);
  }
  return {
    total,
    count: payments.length,
    byMethod: Object.fromEntries(byMethod.entries()) as Record<
      UnifiedPaymentMethod,
      { count: number; total: number }
    >,
  };
}
