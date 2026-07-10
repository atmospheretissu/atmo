"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { parseDevisForm, computeDevisTotals } from "@/lib/validation/devis";
import { getNextDevisNumber } from "@/lib/db/devis";
import { createDossierFromDevis } from "@/lib/db/dossiers";
import { getCreationStoreId } from "@/lib/db/stores";
import { triggerEvent, firstNameOf } from "@/lib/brevo/trigger-event";

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "https://atmospheretissus.fr")
  );
}

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

  const storeId = await getCreationStoreId();

  // 1. Insert devis
  const devisPayload: Record<string, unknown> = {
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
    store_id: storeId,
  };
  if (data.decoratrice_id) devisPayload.decoratrice_id = data.decoratrice_id;
  const { data: devis, error: e1 } = await (supabase as unknown as {
    from: (t: string) => {
      insert: (v: unknown) => {
        select: (s: string) => { single: () => Promise<{ data: { id: string } | null; error: { code?: string; message: string } | null }> };
      };
    };
  })
    .from("devis")
    .insert(devisPayload)
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

  // Trigger event "devis_envoye" (lit la règle automation → SMS et/ou email)
  if (newStatus === "envoye") {
    try {
      const { data: devis } = await supabase
        .from("devis")
        .select("number, client_id, total_ttc, product_summary, channel")
        .eq("id", devisId)
        .maybeSingle();
      const { data: client } = devis
        ? await supabase
            .from("clients")
            .select("phone, email, display_name")
            .eq("id", devis.client_id)
            .maybeSingle()
        : { data: null };
      if (devis && client) {
        await triggerEvent("devis_envoye", {
          toPhone: client.phone,
          toEmail: client.email,
          toName: client.display_name,
          clientId: devis.client_id,
          vars: {
            prenom: firstNameOf(client.display_name),
            nom: client.display_name,
            numero_devis: devis.number,
            produit: devis.product_summary,
            total_ttc: String(Math.round(Number(devis.total_ttc ?? 0))),
            lien_pdf: `${appBaseUrl()}/devis/${devisId}/pdf`,
          },
          criteriaContext: {
            amount: Number(devis.total_ttc ?? 0),
            channel: devis.channel,
          },
          triggerSource: "action:change-devis-status",
        });
      }
    } catch (err) {
      console.warn("[trigger devis_envoye]", err);
    }
  }

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
export type ManualPaymentMethod = "virement" | "cb" | "cheque" | "especes";

export async function markAcompteRecuAction(
  devisId: string,
  method: ManualPaymentMethod = "virement",
  notes?: string,
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

  // 2. Insert payment manuel avec le mode choisi par l'admin
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
      method,
      amount_ttc: Number(devis.acompte_ttc ?? 0),
      notes: notes?.trim() || `Encaissement manuel · ${method}`,
      recorded_by: user.id,
    });
  }

  // Trigger event "acompte_recu"
  try {
    const { data: client } = devis
      ? await supabase
          .from("clients")
          .select("phone, email, display_name")
          .eq("id", devis.client_id)
          .maybeSingle()
      : { data: null };
    if (devis && client) {
      // Fetch channel + total_ttc pour les critères
      const { data: devisFull } = await supabase
        .from("devis")
        .select("channel, total_ttc")
        .eq("id", devisId)
        .maybeSingle();
      await triggerEvent("acompte_recu", {
        toPhone: client.phone,
        toEmail: client.email,
        toName: client.display_name,
        clientId: devis.client_id,
        vars: {
          prenom: firstNameOf(client.display_name),
          acompte: String(Math.round(Number(devis.acompte_ttc ?? 0))),
          total_ttc: String(Math.round(Number(devisFull?.total_ttc ?? 0))),
        },
        criteriaContext: {
          amount: Number(devisFull?.total_ttc ?? 0),
          channel: devisFull?.channel ?? undefined,
        },
        triggerSource: "action:mark-acompte-recu",
      });
    }
  } catch (err) {
    console.warn("[trigger acompte_recu]", err);
  }

  // 3. Auto-création (ou récupération) du dossier de confection.
  //    Idempotent : si la fiche a déjà été créée depuis la boutique avec
  //    acompte_paid=false, on flip simplement le flag.
  const dossierResult = await createDossierFromDevis(devisId);
  if (!dossierResult.ok) {
    console.error("Échec création dossier:", dossierResult.message);
  } else {
    await supabase
      .from("dossiers")
      .update({ acompte_paid: true, acompte_paid_at: new Date().toISOString() })
      .eq("id", dossierResult.dossierId)
      .eq("acompte_paid", false);
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
 * Marque le solde du devis comme reçu (manuel) avec le mode de paiement choisi.
 * Met à jour dossier.solde_paid = true.
 */
export async function markSoldeRecuAction(
  devisId: string,
  method: ManualPaymentMethod = "virement",
  notes?: string,
): Promise<DevisFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, errors: {}, message: "Session expirée." };

  const { data: devis } = await supabase
    .from("devis")
    .select("client_id, total_ttc, acompte_ttc")
    .eq("id", devisId)
    .maybeSingle();
  if (!devis) return { ok: false, errors: {}, message: "Devis introuvable" };

  const total = Number(devis.total_ttc ?? 0);
  const acompte = Number(devis.acompte_ttc ?? total / 2);
  const solde = Math.max(0, total - acompte);

  if (solde <= 0) {
    return { ok: false, errors: {}, message: "Aucun solde à encaisser" };
  }

  const { error: e1 } = await supabase.from("payments").insert({
    devis_id: devisId,
    client_id: devis.client_id,
    kind: "solde",
    method,
    amount_ttc: solde,
    notes: notes?.trim() || `Encaissement solde manuel · ${method}`,
    recorded_by: user.id,
  });
  if (e1) return { ok: false, errors: {}, message: e1.message };

  // Update dossier.solde_paid
  const { data: dossier } = await supabase
    .from("dossiers")
    .select("id")
    .eq("devis_id", devisId)
    .maybeSingle();
  if (dossier?.id) {
    await supabase
      .from("dossiers")
      .update({ solde_paid: true, solde_paid_at: new Date().toISOString() })
      .eq("id", dossier.id);
  }

  revalidatePath(`/devis/${devisId}`);
  revalidatePath("/devis");
  return { ok: true };
}

/**
 * Met à jour les lignes d'un devis existant.
 *
 * Stratégie : delete + re-insert (plus simple que le diff individuel).
 * Recalcule total_ht et total_ttc à partir des nouvelles lignes.
 * Si le devis est déjà validé / acompte reçu, on garde tout de même la
 * modification (l'utilisateur peut corriger une typo, ajuster un prix...).
 */
export type UpdateDevisLineInput = {
  label: string;
  detail?: string | null;
  ref?: string | null;
  qty: number;
  unit_label: string;
  unit_price_ht: number;
};

export async function updateDevisLinesAction(
  devisId: string,
  lines: UpdateDevisLineInput[],
): Promise<DevisFormState> {
  const supabase = await createClient();

  if (!lines || lines.length === 0) {
    return { ok: false, errors: {}, message: "Le devis doit avoir au moins une ligne." };
  }

  // 1. Récupère le tva_rate du devis pour recalculer le total
  const { data: devis, error: e0 } = await supabase
    .from("devis")
    .select("tva_rate")
    .eq("id", devisId)
    .maybeSingle();
  if (e0) return { ok: false, errors: {}, message: e0.message };
  if (!devis) return { ok: false, errors: {}, message: "Devis introuvable" };

  const tvaRate = Number(devis.tva_rate ?? 20);

  // Recalcule les totaux
  const total_ht = Math.round(
    lines.reduce((s, l) => s + l.qty * l.unit_price_ht * 100, 0),
  ) / 100;
  const total_ttc = Math.round(total_ht * (1 + tvaRate / 100) * 100) / 100;
  const qty_total = lines.reduce((s, l) => s + Math.ceil(l.qty), 0);

  // 2. Delete les anciennes lignes
  const { error: e1 } = await supabase
    .from("devis_lines")
    .delete()
    .eq("devis_id", devisId);
  if (e1) return { ok: false, errors: {}, message: `Échec suppression : ${e1.message}` };

  // 3. Insert les nouvelles
  const payload = lines.map((l, idx) => ({
    devis_id: devisId,
    position: idx,
    ref: l.ref?.trim() || null,
    label: l.label.trim(),
    detail: l.detail?.trim() || null,
    qty: l.qty,
    unit_label: l.unit_label,
    unit_price_ht: l.unit_price_ht,
  }));

  const { error: e2 } = await supabase.from("devis_lines").insert(payload);
  if (e2) return { ok: false, errors: {}, message: `Échec ajout : ${e2.message}` };

  // 4. Update les totaux + version du devis
  const { error: e3 } = await supabase
    .from("devis")
    .update({
      total_ht,
      total_ttc,
      qty: qty_total,
    })
    .eq("id", devisId);
  if (e3) return { ok: false, errors: {}, message: e3.message };

  revalidatePath(`/devis/${devisId}`);
  revalidatePath("/devis");
  return { ok: true, id: devisId };
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
