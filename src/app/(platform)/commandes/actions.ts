"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BCStatus } from "@/lib/db/bons-commande";
import { recomputeBcAmount } from "@/lib/db/bons-commande";

type Result<T = void> = (T extends void ? { ok: true } : { ok: true } & T) | { ok: false; message: string };

async function setStatus(
  id: string,
  status: BCStatus,
  extra: Record<string, unknown> = {}
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bons_commande")
    .update({ status, ...extra })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/commandes/${id}`);
  revalidatePath("/commandes");
  return { ok: true };
}

export async function sendBcAction(id: string): Promise<Result> {
  return setStatus(id, "envoye", { sent_at: new Date().toISOString() });
}

export async function confirmBcAction(id: string): Promise<Result> {
  return setStatus(id, "confirme");
}

export async function shipBcAction(id: string, expectedAt?: string): Promise<Result> {
  const extra: Record<string, unknown> = {};
  if (expectedAt) extra.expected_at = expectedAt;
  return setStatus(id, "expedie", extra);
}

export async function receiveBcAction(id: string): Promise<Result> {
  return setStatus(id, "recu", { received_at: new Date().toISOString() });
}

export async function flagBcProblemAction(id: string, notes?: string): Promise<Result> {
  const extra: Record<string, unknown> = {};
  if (notes !== undefined) extra.notes = notes;
  return setStatus(id, "probleme", extra);
}

export async function updateBcMetaAction(
  id: string,
  patch: { expected_at?: string | null; notes?: string | null; franco_override?: boolean }
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("bons_commande").update(patch).eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/commandes/${id}`);
  return { ok: true };
}

export async function addBcLineAction(
  bcId: string,
  line: { ref?: string | null; label: string; qty: number; unit_label?: string; unit_price_ht: number }
): Promise<Result> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("bc_lines")
    .select("*", { count: "exact", head: true })
    .eq("bc_id", bcId);
  const position = count ?? 0;
  const total_ht = Number((line.qty * line.unit_price_ht).toFixed(2));
  const { error } = await supabase.from("bc_lines").insert({
    bc_id: bcId,
    label: line.label,
    ref: line.ref ?? null,
    qty: line.qty,
    unit_label: line.unit_label ?? "u",
    unit_price_ht: line.unit_price_ht,
    total_ht,
    position,
  });
  if (error) return { ok: false, message: error.message };
  await recomputeBcAmount(bcId);
  revalidatePath(`/commandes/${bcId}`);
  revalidatePath("/commandes");
  return { ok: true };
}

export async function deleteBcLineAction(bcId: string, lineId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("bc_lines").delete().eq("id", lineId);
  if (error) return { ok: false, message: error.message };
  await recomputeBcAmount(bcId);
  revalidatePath(`/commandes/${bcId}`);
  revalidatePath("/commandes");
  return { ok: true };
}
