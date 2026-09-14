"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { createDossierFromDevis } from "@/lib/db/dossiers";
import { triggerEvent, firstNameOf } from "@/lib/brevo/trigger-event";
import { pushInvoiceForDevisPayment } from "@/lib/pennylane/push";

/**
 * Synchronisation manuelle Stripe → app.
 *
 * Contexte : normalement, le webhook /api/stripe/webhook applique
 * automatiquement les updates (acompte marqué, dossier créé, facture envoyée)
 * dès qu'un paiement Stripe est validé. MAIS si :
 *   - STRIPE_WEBHOOK_SECRET est absent côté Railway,
 *   - l'endpoint webhook n'est pas enregistré côté Stripe dashboard,
 *   - un événement webhook a échoué et n'a pas été rejoué,
 * alors le client peut avoir payé sans que l'app le voie.
 *
 * Cette action pallie ce cas en interrogeant DIRECTEMENT l'API Stripe pour ce
 * devis : elle liste les sessions Checkout avec metadata.devis_id, vérifie
 * leur statut de paiement, et applique le même flow que le webhook si un
 * paiement est effectivement `paid` mais que l'app ne l'a pas encore vu.
 *
 * Idempotent : vérifie que le payment.stripe_payment_intent_id n'est pas déjà
 * en base avant d'insérer.
 */

export type SyncStripeResult =
  | {
      ok: true;
      appliedAcompte: boolean;
      appliedSolde: boolean;
      skippedAlreadyRecorded: number;
      skippedNotPaid: number;
      inspectedSessions: number;
      message: string;
    }
  | { ok: false; message: string };

export async function syncStripePaymentForDevisAction(
  devisId: string,
): Promise<SyncStripeResult> {
  if (!isStripeConfigured()) {
    return { ok: false, message: "Stripe non configuré (STRIPE_SECRET_KEY absent)." };
  }
  const stripe = getStripe();
  const supabase = createServiceRoleClient();

  // Récupère le devis
  const { data: devis } = await supabase
    .from("devis")
    .select("id, number, client_id, total_ttc, acompte_ttc, status, channel")
    .eq("id", devisId)
    .maybeSingle();
  if (!devis) return { ok: false, message: "Devis introuvable" };

  const totalTtc = Number(devis.total_ttc ?? 0);
  const acompteTtc = Number(devis.acompte_ttc ?? totalTtc * 0.5);
  const soldeTtc = Math.max(0, totalTtc - acompteTtc);

  // Cherche les sessions Checkout Stripe pour ce devis (metadata.devis_id).
  // Stripe ne permet pas de filtrer par metadata sur checkout.sessions.list,
  // on liste les 100 dernières et on filtre côté app.
  const sessions = await stripe.checkout.sessions.list({ limit: 100 });
  const forDevis = sessions.data.filter(
    (s) => s.metadata?.devis_id === devisId,
  );

  let appliedAcompte = false;
  let appliedSolde = false;
  let skippedAlreadyRecorded = 0;
  let skippedNotPaid = 0;

  for (const session of forDevis) {
    if (session.payment_status !== "paid") {
      skippedNotPaid++;
      continue;
    }
    const kind = (session.metadata?.kind ?? "acompte") as "acompte" | "solde";
    const piId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    // Idempotence : est-ce que ce payment_intent est déjà en base ?
    if (piId) {
      const { data: existing } = await supabase
        .from("payments")
        .select("id")
        .eq("stripe_payment_intent_id", piId)
        .maybeSingle();
      if (existing) {
        skippedAlreadyRecorded++;
        continue;
      }
    }

    const amount =
      Number(session.amount_total ?? 0) / 100 ||
      (kind === "solde" ? soldeTtc : acompteTtc);

    if (kind === "solde") {
      // Insert payment
      const { data: payIns } = await (
        supabase as unknown as {
          from: (t: string) => {
            insert: (v: unknown) => {
              select: (s: string) => {
                single: () => Promise<{
                  data: { id: string } | null;
                  error: unknown;
                }>;
              };
            };
          };
        }
      )
        .from("payments")
        .insert({
          devis_id: devisId,
          client_id: devis.client_id,
          kind: "solde",
          method: "stripe",
          amount_ttc: amount,
          stripe_payment_intent_id: piId,
          notes: `Solde Stripe (sync manuel) — ${session.id}`,
        })
        .select("id")
        .single();

      if (payIns) {
        void pushInvoiceForDevisPayment({
          devisId,
          paymentId: payIns.id,
          kind: "solde",
          amountTtc: amount,
          paidAt: new Date().toISOString(),
          paymentMethod: "stripe",
        }).catch((e) => console.warn("[sync stripe solde pennylane]", e));
      }

      // Update dossier
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

      // Envoi auto facture solde
      try {
        const { sendFactureEmailAction } = await import("./facture-email-actions");
        void sendFactureEmailAction(devisId, "solde", {
          paidAt: new Date().toISOString(),
          paidMethod: "stripe",
        }).catch((e) => console.warn("[sync stripe solde facture]", e));
      } catch {
        /* ignore */
      }

      appliedSolde = true;
      continue;
    }

    // ── ACOMPTE
    await supabase
      .from("devis")
      .update({ status: "acompte_recu" })
      .eq("id", devisId);

    const { data: payIns } = await (
      supabase as unknown as {
        from: (t: string) => {
          insert: (v: unknown) => {
            select: (s: string) => {
              single: () => Promise<{
                data: { id: string } | null;
                error: unknown;
              }>;
            };
          };
        };
      }
    )
      .from("payments")
      .insert({
        devis_id: devisId,
        client_id: devis.client_id,
        kind: "acompte",
        method: "stripe",
        amount_ttc: amount,
        stripe_payment_intent_id: piId,
        notes: `Acompte Stripe (sync manuel) — ${session.id}`,
      })
      .select("id")
      .single();

    if (payIns) {
      void pushInvoiceForDevisPayment({
        devisId,
        paymentId: payIns.id,
        kind: "acompte",
        amountTtc: amount,
        paidAt: new Date().toISOString(),
        paymentMethod: "stripe",
      }).catch((e) => console.warn("[sync stripe acompte pennylane]", e));
    }

    // Trigger event acompte_recu
    try {
      const { data: client } = await supabase
        .from("clients")
        .select("phone, email, display_name")
        .eq("id", devis.client_id)
        .maybeSingle();
      if (client) {
        await triggerEvent("acompte_recu", {
          toPhone: client.phone,
          toEmail: client.email,
          toName: client.display_name,
          clientId: devis.client_id,
          vars: {
            prenom: firstNameOf(client.display_name),
            acompte: String(Math.round(amount)),
          },
          triggerSource: "stripe:sync-manuel",
        });
      }
    } catch (err) {
      console.warn("[sync stripe → acompte_recu event]", err);
    }

    // Envoi auto facture acompte
    try {
      const { sendFactureEmailAction } = await import("./facture-email-actions");
      void sendFactureEmailAction(devisId, "acompte", {
        paidAt: new Date().toISOString(),
        paidMethod: "stripe",
      }).catch((e) => console.warn("[sync stripe acompte facture]", e));
    } catch {
      /* ignore */
    }

    // Création du dossier
    const dossierResult = await createDossierFromDevis(devisId, supabase);
    if (dossierResult.ok) {
      await supabase
        .from("dossiers")
        .update({
          acompte_paid: true,
          acompte_paid_at: new Date().toISOString(),
        })
        .eq("id", dossierResult.dossierId)
        .eq("acompte_paid", false);
    }

    appliedAcompte = true;
  }

  revalidatePath(`/devis/${devisId}`);
  revalidatePath("/devis");
  revalidatePath("/confections");

  const parts: string[] = [];
  if (appliedAcompte) parts.push("acompte marqué ✓");
  if (appliedSolde) parts.push("solde marqué ✓");
  if (skippedAlreadyRecorded > 0)
    parts.push(`${skippedAlreadyRecorded} déjà enregistré(s)`);
  if (skippedNotPaid > 0) parts.push(`${skippedNotPaid} non payé(s)`);
  if (forDevis.length === 0)
    parts.push("aucune session Stripe trouvée pour ce devis");

  return {
    ok: true,
    appliedAcompte,
    appliedSolde,
    skippedAlreadyRecorded,
    skippedNotPaid,
    inspectedSessions: forDevis.length,
    message: parts.join(" · "),
  };
}
