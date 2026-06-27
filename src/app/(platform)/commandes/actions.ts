"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BCStatus } from "@/lib/db/bons-commande";
import {
  recomputeBcAmount,
  getNextBcNumber,
  autoCreateBcsForDossier,
} from "@/lib/db/bons-commande";
import { createBcsFromDevisAssignments, type CreateBcsResult } from "@/lib/db/bcs-from-devis";

export async function createBcsFromDevisAction(
  devisId: string,
  assignments: Record<string, string | null>,
): Promise<CreateBcsResult> {
  const result = await createBcsFromDevisAssignments(devisId, assignments);
  if (result.ok) {
    revalidatePath("/commandes");
    revalidatePath(`/devis/${devisId}`);
  }
  return result;
}

/**
 * Crée un BC (vide ou auto-peuplé si dossierId fourni). Redirige vers
 * la fiche du BC créé. Utilisé par la page /commandes/nouveau.
 */
export async function createBcAction(input: {
  supplierId: string;
  dossierId?: string | null;
  notes?: string;
}): Promise<{ ok: false; message: string } | never> {
  if (!input.supplierId) return { ok: false, message: "Fournisseur requis." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée." };

  // Avec dossier → tente l'auto-création (peuple lignes + amount_ht)
  if (input.dossierId) {
    const { existing } = await autoCreateBcsForDossier(input.dossierId);
    revalidatePath("/commandes");
    if (existing > 0) {
      const { data: bc } = await supabase
        .from("bons_commande")
        .select("id")
        .eq("dossier_id", input.dossierId)
        .eq("supplier_id", input.supplierId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (bc) redirect(`/commandes/${bc.id}`);
    } else {
      const { data: bc } = await supabase
        .from("bons_commande")
        .select("id")
        .eq("dossier_id", input.dossierId)
        .eq("supplier_id", input.supplierId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (bc) redirect(`/commandes/${bc.id}`);
    }
  }

  // Création vide (sans dossier)
  const number = await getNextBcNumber();
  const { data: bc, error } = await supabase
    .from("bons_commande")
    .insert({
      number,
      supplier_id: input.supplierId,
      dossier_id: input.dossierId ?? null,
      status: "brouillon",
      amount_ht: 0,
      language: "FR",
      notes: input.notes?.trim() || "BC créé manuellement — à compléter",
      created_by: user.id,
    })
    .select("id")
    .maybeSingle();
  if (error || !bc) return { ok: false, message: error?.message ?? "Échec création" };

  revalidatePath("/commandes");
  redirect(`/commandes/${bc.id}`);
}

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

export async function dismissBcAction(id: string): Promise<Result> {
  try {
    const supabase = await createClient();
    // 1. Supprime explicitement les lignes (au cas où le cascade ne fasse pas son boulot)
    const { error: linesErr } = await supabase.from("bc_lines").delete().eq("bc_id", id);
    if (linesErr) {
      console.error("[dismissBcAction] lines delete error:", linesErr);
      return { ok: false, message: `Suppression lignes : ${linesErr.message}` };
    }
    // 2. Supprime le BC
    const { error } = await supabase.from("bons_commande").delete().eq("id", id);
    if (error) {
      console.error("[dismissBcAction] BC delete error:", error);
      return { ok: false, message: error.message };
    }
    // Pas de revalidatePath — la vue cliente gère son état local
    return { ok: true };
  } catch (e) {
    console.error("[dismissBcAction] thrown:", e);
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erreur inconnue",
    };
  }
}

/**
 * Bascule manuellement un dossier de commande_validee → attente_matiere.
 * Utile quand l'utilisateur a marqué toutes les commandes comme "inutiles"
 * (ignorées) — le trigger BC envoyé ne se déclenche jamais dans ce cas.
 */
export async function advanceDossierFromCommandeAction(
  dossierId: string,
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("dossiers")
    .update({
      status: "attente_matiere",
      attente_matiere_at: new Date().toISOString(),
    })
    .eq("id", dossierId)
    .eq("status", "commande_validee");
  if (error) return { ok: false, message: error.message };
  revalidatePath("/confections");
  revalidatePath(`/confections/${dossierId}`);
  return { ok: true };
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
