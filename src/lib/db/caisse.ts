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
  const change_due =
    input.payment_method === "especes" && input.cash_received != null
      ? Number((Number(input.cash_received) - totalTtc).toFixed(2))
      : null;
  const paid_amount =
    input.payment_method === "especes" && input.cash_received != null
      ? Math.min(Number(input.cash_received), totalTtc)
      : totalTtc;

  const number = await getNextTicketNumber();

  const { data: ticket, error: e1 } = await supabase
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
    })
    .select("id, number, total_ttc")
    .single();

  if (e1 || !ticket) {
    throw new Error(e1?.message ?? "Échec création ticket");
  }

  const lines = input.lines.map((l, idx) => ({
    ticket_id: ticket.id,
    catalog_product_id: l.catalog_product_id ?? null,
    ref: l.ref ?? null,
    label: l.label,
    qty: l.qty,
    unit_label: l.unit_label,
    unit_price_ht: l.unit_price_ht,
    total_ht: Number((Number(l.qty) * Number(l.unit_price_ht)).toFixed(2)),
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

export async function createClosure(
  date: string,
  cash_counted: number | null,
  notes?: string | null
): Promise<{ id: string; variance: number | null }> {
  const supabase = await createClient();
  const dayStart = new Date(`${date}T00:00:00`).toISOString();
  const dayEnd = new Date(`${date}T23:59:59.999`).toISOString();

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

  const variance =
    cash_counted != null ? Number((cash_counted - sums.especes).toFixed(2)) : null;

  const { data: closure, error } = await supabase
    .from("caisse_closures")
    .insert({
      date,
      total_especes: sums.especes,
      total_cb: sums.cb,
      total_cheque: sums.cheque,
      total_virement: sums.virement,
      cash_counted,
      variance,
      closed_at: new Date().toISOString(),
      notes: notes?.trim() || null,
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
