"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { parseDevisForm, computeDevisTotals } from "@/lib/validation/devis";
import { getNextDevisNumber } from "@/lib/db/devis";
import { createDossierFromDevis } from "@/lib/db/dossiers";

export type DevisFormState =
  | { ok: true; id?: string }
  | { ok: false; errors: Record<string, string>; message?: string }
  | undefined;

/**
 * Crée un devis en brouillon avec ses lignes.
 * Le numéro DEV-{year}-{NNNN} est calculé côté serveur.
 * Les totaux sont recalculés à partir des lignes (source de vérité).
 */
export async function createDevisDraftAction(
  _prev: DevisFormState,
  formData: FormData
): Promise<DevisFormState> {
  const { data, errors } = parseDevisForm(formData);
  if (!data || errors) {
    return {
      ok: false,
      errors: errors ?? {},
      message: "Vérifie le formulaire — au moins une ligne et un client requis.",
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, errors: {}, message: "Session expirée." };

  const totals = computeDevisTotals(data.lines, data.tva_rate);
  const number = await getNextDevisNumber();

  // Date d'échéance par défaut : J+30
  const validUntil =
    data.valid_until && data.valid_until.length > 0
      ? data.valid_until
      : new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  // 1. Insert devis
  const { data: devis, error: e1 } = await supabase
    .from("devis")
    .insert({
      number,
      version: 1,
      client_id: data.client_id,
      channel: data.channel,
      status: "brouillon",
      product_summary: data.product_summary,
      product_detail: data.product_detail || null,
      qty: data.lines.reduce((acc, l) => acc + Math.ceil(l.qty), 0),
      total_ht: totals.total_ht,
      total_ttc: totals.total_ttc,
      tva_rate: data.tva_rate,
      workshop_notes: data.workshop_notes || null,
      valid_until: validUntil,
      commercial_id: user.id,
    })
    .select("id")
    .single();

  if (e1 || !devis) {
    return {
      ok: false,
      errors: {},
      message: e1?.code === "23505" ? `Le numéro ${number} existe déjà (réessaye).` : e1?.message ?? "Échec de création",
    };
  }

  // 2. Insert lines
  const linesPayload = data.lines.map((l, idx) => ({
    devis_id: devis.id,
    position: idx,
    ref: l.ref || null,
    label: l.label,
    detail: l.detail || null,
    qty: l.qty,
    unit_label: l.unit_label,
    unit_price_ht: l.unit_price_ht,
  }));

  const { error: e2 } = await supabase.from("devis_lines").insert(linesPayload);
  if (e2) {
    // Cleanup the devis if lines failed (best effort)
    await supabase.from("devis").delete().eq("id", devis.id);
    return { ok: false, errors: {}, message: `Échec ajout des lignes : ${e2.message}` };
  }

  revalidatePath("/devis");
  revalidatePath("/dashboard");
  redirect(`/devis/${devis.id}`);
}

/**
 * Change le statut d'un devis (envoye / valide / refuse / expire).
 * RLS contrôle qui peut faire quoi.
 */
export async function changeDevisStatusAction(
  devisId: string,
  newStatus: "envoye" | "valide" | "refuse" | "expire"
): Promise<DevisFormState> {
  const supabase = await createClient();

  const updates: Database["public"]["Tables"]["devis"]["Update"] = { status: newStatus };
  if (newStatus === "envoye") {
    updates.sent_at = new Date().toISOString();
  }

  const { error } = await supabase.from("devis").update(updates).eq("id", devisId);
  if (error) return { ok: false, errors: {}, message: error.message };

  revalidatePath("/devis");
  revalidatePath(`/devis/${devisId}`);
  return { ok: true };
}

/**
 * Marque le devis comme "acompte reçu" ET déclenche la création du dossier
 * de confection (idempotent : si dossier existe déjà, on saute).
 *
 * Utilisé par :
 *   - le bouton "Marquer acompte reçu" sur /devis/[id] (encaissement manuel)
 *   - le webhook Stripe quand un paiement réussit (à venir)
 */
export async function markAcompteRecuAction(
  devisId: string
): Promise<DevisFormState & { dossierId?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, errors: {}, message: "Session expirée." };

  // 1. Update status
  const { error: e1 } = await supabase
    .from("devis")
    .update({ status: "acompte_recu" })
    .eq("id", devisId);
  if (e1) return { ok: false, errors: {}, message: e1.message };

  // 2. Insert payment (manuel pour l'instant — Stripe webhook fera idem)
  const { data: devis } = await supabase
    .from("devis")
    .select("client_id, acompte_ttc")
    .eq("id", devisId)
    .maybeSingle();

  if (devis) {
    await supabase.from("payments").insert({
      devis_id: devisId,
      client_id: devis.client_id,
      kind: "acompte",
      method: "virement",
      amount_ttc: Number(devis.acompte_ttc ?? 0),
      notes: "Marquage manuel depuis la fiche devis",
      recorded_by: user.id,
    });
  }

  // 3. Auto-création du dossier de confection
  const dossierResult = await createDossierFromDevis(devisId);
  if (!dossierResult.ok) {
    // On ne bloque pas l'utilisateur, mais on log
    console.error("Échec création dossier:", dossierResult.message);
  }

  revalidatePath("/devis");
  revalidatePath(`/devis/${devisId}`);
  revalidatePath("/confections");
  revalidatePath("/dashboard");

  return {
    ok: true,
    dossierId: dossierResult.ok ? dossierResult.dossierId : undefined,
  };
}

/**
 * Supprime un devis (admin uniquement via RLS).
 */
export async function deleteDevisAction(devisId: string): Promise<DevisFormState> {
  const supabase = await createClient();
  const { error } = await supabase.from("devis").delete().eq("id", devisId);
  if (error) {
    return {
      ok: false,
      errors: {},
      message:
        error.code === "42501"
          ? "Permission refusée — admin requis."
          : error.message,
    };
  }
  revalidatePath("/devis");
  redirect("/devis");
}
