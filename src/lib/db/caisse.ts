import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type CaisseTicket = Database["public"]["Tables"]["caisse_tickets"]["Row"];
export type CaisseTicketLine = Database["public"]["Tables"]["caisse_ticket_lines"]["Row"];
export type CaisseClosure = Database["public"]["Tables"]["caisse_closures"]["Row"];
export type PaymentMethod = Database["public"]["Enums"]["payment_method"];

export async function getNextTicketNumber(): Promise<string> {
  const supabase = await createClient();
  const year = new Date().getFullYear();
  const prefix = `TKT-${year}-`;
  const { count } = await supabase
    .from("caisse_tickets")
    .select("*", { count: "exact", head: true })
    .like("number", `${prefix}%`);
  return `${prefix}${String((count ?? 0) + 1).padStart(4, "0")}`;
}

function todayBounds(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  return { from, to };
}

export type TodayStats = {
  date: string;
  totalTtc: number;
  ticketCount: number;
  byMethod: Record<PaymentMethod, { amount: number; count: number }>;
};

export async function getTodayStats(): Promise<TodayStats> {
  const supabase = await createClient();
  const { from, to } = todayBounds();
  const { data } = await supabase
    .from("caisse_tickets")
    .select("total_ttc, payment_method")
    .gte("created_at", from)
    .lt("created_at", to);

  const init = { amount: 0, count: 0 };
  const stats: TodayStats = {
    date: new Date().toISOString().slice(0, 10),
    totalTtc: 0,
    ticketCount: 0,
    byMethod: {
      stripe: { ...init },
      especes: { ...init },
      cb: { ...init },
      cheque: { ...init },
      virement: { ...init },
    },
  };
  for (const t of data ?? []) {
    const amt = Number(t.total_ttc ?? 0);
    stats.totalTtc += amt;
    stats.ticketCount += 1;
    const m = t.payment_method as PaymentMethod;
    stats.byMethod[m].amount += amt;
    stats.byMethod[m].count += 1;
  }
  return stats;
}

export type TicketInput = {
  client_id?: string | null;
  lines: Array<{
    ref?: string | null;
    label: string;
    qty: number;
    unit_label: string;
    unit_price_ht: number;
    catalog_product_id?: string | null;
  }>;
  discount_pct?: number;
  payment_method: PaymentMethod;
  cash_received?: number | null;
  receipt_email?: string | null;
  tva_rate?: number;
  // Paiement mixte : 2 modes de règlement pour un seul ticket.
  // Quand `payment_method_2` est renseigné :
  //   - amount_1 = montant réglé via payment_method
  //   - amount_2 = montant réglé via payment_method_2
  //   - amount_1 + amount_2 doivent égaler total_ttc
  payment_method_2?: PaymentMethod | null;
  amount_1?: number | null;
  amount_2?: number | null;
};

export type TicketCreated = {
  id: string;
  number: string;
  total_ttc: number;
  change_due: number | null;
};

export async function createTicket(input: TicketInput): Promise<TicketCreated> {
  const supabase = await createClient();
  if (!input.lines || input.lines.length === 0) {
    throw new Error("Panier vide");
  }
  const discount = Math.max(0, Math.min(100, input.discount_pct ?? 0));
  const tvaRate = input.tva_rate ?? 20;

  const subtotalHt = input.lines.reduce(
    (s, l) => s + Number(l.qty) * Number(l.unit_price_ht),
    0
  );
  const totalHt = Number((subtotalHt * (1 - discount / 100)).toFixed(2));
  const totalTtc = Number((totalHt * (1 + tvaRate / 100)).toFixed(2));
  // Validation paiement mixte
  const isSplit =
    input.payment_method_2 != null && input.payment_method_2 !== input.payment_method;
  if (isSplit) {
    const a1 = Number(input.amount_1 ?? 0);
    const a2 = Number(input.amount_2 ?? 0);
    if (a1 <= 0 || a2 <= 0) {
      throw new Error("Paiement mixte : chaque montant doit être > 0.");
    }
    if (Math.abs(a1 + a2 - totalTtc) > 0.02) {
      throw new Error(
        `Paiement mixte : la somme des deux montants (${(a1 + a2).toFixed(2)}€) doit égaler le total TTC (${totalTtc.toFixed(2)}€).`,
      );
    }
  }

  const change_due =
    input.payment_method === "especes" && input.cash_received != null
      ? Number((Number(input.cash_received) - totalTtc).toFixed(2))
      : null;
  const paid_amount =
    input.payment_method === "especes" && input.cash_received != null
      ? Math.min(Number(input.cash_received), totalTtc)
      : totalTtc;

  const number = await getNextTicketNumber();

  const { getCreationStoreId } = await import("@/lib/db/stores");
  const storeId = await getCreationStoreId();

  const { data: ticket, error: e1 } = await (
    supabase as unknown as {
      from: (t: string) => {
        insert: (v: Record<string, unknown>) => {
          select: (s: string) => {
            single: () => Promise<{
              data: { id: string; number: string; total_ttc: number } | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    }
  )
    .from("caisse_tickets")
    .insert({
      number,
      client_id: input.client_id ?? null,
      total_ht: totalHt,
      total_ttc: totalTtc,
      discount_pct: discount,
      payment_method: input.payment_method,
      paid_amount,
      cash_received: input.cash_received ?? null,
      change_due,
      receipt_email: input.receipt_email?.trim() || null,
      store_id: storeId,
      payment_method_2: isSplit ? input.payment_method_2 : null,
      amount_1: isSplit ? Number(input.amount_1) : null,
      amount_2: isSplit ? Number(input.amount_2) : null,
    })
    .select("id, number, total_ttc")
    .single();

  if (e1 || !ticket) {
    throw new Error(e1?.message ?? "Échec création ticket");
  }

  // NOTE : caisse_ticket_lines.total_ht est une colonne GENERATED ALWAYS
  // (qty * unit_price_ht côté Postgres) — ne PAS l'insérer manuellement.
  const lines = input.lines.map((l, idx) => ({
    ticket_id: ticket.id,
    catalog_product_id: l.catalog_product_id ?? null,
    ref: l.ref ?? null,
    label: l.label,
    qty: l.qty,
    unit_label: l.unit_label,
    unit_price_ht: l.unit_price_ht,
    position: idx,
  }));

  const { error: e2 } = await supabase.from("caisse_ticket_lines").insert(lines);
  if (e2) {
    await supabase.from("caisse_tickets").delete().eq("id", ticket.id);
    throw new Error(`Échec création lignes : ${e2.message}`);
  }

  return {
    id: ticket.id,
    number: ticket.number,
    total_ttc: Number(ticket.total_ttc),
    change_due,
  };
}

export async function listTodayTickets() {
  const supabase = await createClient();
  const { from, to } = todayBounds();
  const { data } = await supabase
    .from("caisse_tickets")
    .select("*")
    .gte("created_at", from)
    .lt("created_at", to)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export type Denominations = {
  b5?: number;
  b10?: number;
  b20?: number;
  b50?: number;
  b100?: number;
  b200?: number;
  b500?: number;
  c1?: number;
  c2?: number;
  c5?: number;
  c10?: number;
  c20?: number;
  c50?: number;
  p1?: number;
  p2?: number;
};

const DENOMINATION_VALUES: Record<keyof Denominations, number> = {
  b5: 5,
  b10: 10,
  b20: 20,
  b50: 50,
  b100: 100,
  b200: 200,
  b500: 500,
  c1: 0.01,
  c2: 0.02,
  c5: 0.05,
  c10: 0.1,
  c20: 0.2,
  c50: 0.5,
  p1: 1,
  p2: 2,
};

export function totalFromDenominations(d: Denominations | null | undefined): number {
  if (!d) return 0;
  let total = 0;
  for (const [k, v] of Object.entries(d)) {
    const value = DENOMINATION_VALUES[k as keyof Denominations];
    if (value != null) total += (Number(v) || 0) * value;
  }
  return Number(total.toFixed(2));
}

export async function createClosure(
  date: string,
  cash_counted: number | null,
  notes: string | null | undefined,
  denominations: Denominations | null | undefined,
): Promise<{ id: string; variance: number | null }> {
  const supabase = await createClient();
  const dayStart = new Date(`${date}T00:00:00`).toISOString();
  const dayEnd = new Date(`${date}T23:59:59.999`).toISOString();

  // Le comptage détaillé est obligatoire pour clôturer.
  if (!denominations || Object.values(denominations).every((v) => !v || Number(v) === 0)) {
    throw new Error(
      "Le comptage détaillé des coupures est obligatoire pour clôturer la journée.",
    );
  }
  // Le total compté doit être cohérent avec la somme des coupures.
  const denomsTotal = totalFromDenominations(denominations);
  if (cash_counted == null) {
    throw new Error("Montant compté requis.");
  }
  if (Math.abs(denomsTotal - Number(cash_counted)) > 0.02) {
    throw new Error(
      `Incohérence : total saisi ${cash_counted}€ ≠ somme des coupures ${denomsTotal}€.`,
    );
  }

  const { data: { user } } = await supabase.auth.getUser();

  const { data: tickets } = await supabase
    .from("caisse_tickets")
    .select("id, payment_method, total_ttc")
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd)
    .is("closure_id", null);

  const sums = { especes: 0, cb: 0, cheque: 0, virement: 0, stripe: 0 };
  for (const t of tickets ?? []) {
    const k = t.payment_method as keyof typeof sums;
    sums[k] += Number(t.total_ttc ?? 0);
  }

  const { data: closure, error } = await (
    supabase as unknown as {
      from: (t: string) => {
        insert: (v: Record<string, unknown>) => {
          select: (s: string) => {
            single: () => Promise<{
              data: { id: string; variance: number | null } | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    }
  )
    .from("caisse_closures")
    .insert({
      date,
      total_especes: sums.especes,
      total_cb: sums.cb,
      total_cheque: sums.cheque,
      total_virement: sums.virement,
      cash_counted,
      closed_at: new Date().toISOString(),
      closed_by: user?.id ?? null,
      notes: notes?.trim() || null,
      denominations,
    })
    .select("id, variance")
    .single();

  if (error || !closure) {
    throw new Error(error?.message ?? "Échec clôture");
  }

  const ticketIds = (tickets ?? []).map((t) => t.id);
  if (ticketIds.length > 0) {
    await supabase
      .from("caisse_tickets")
      .update({ closure_id: closure.id })
      .in("id", ticketIds);
  }

  return { id: closure.id, variance: closure.variance };
}

/**
 * Vérifie s'il existe des jours précédents avec des tickets mais aucune clôture.
 * Utilisé pour bloquer les nouvelles ventes tant que le compte n'a pas été fait.
 */
export async function getPreviousUnclosedDay(): Promise<string | null> {
  const supabase = await createClient();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).toISOString();

  const { data: tickets } = await supabase
    .from("caisse_tickets")
    .select("created_at, closure_id")
    .is("closure_id", null)
    .lt("created_at", todayStart)
    .order("created_at", { ascending: true })
    .limit(1);

  if (!tickets || tickets.length === 0) return null;
  const first = tickets[0];
  const d = new Date(first.created_at as string);
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return dateStr === todayStr ? null : dateStr;
}
