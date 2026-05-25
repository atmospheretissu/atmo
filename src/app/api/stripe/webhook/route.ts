import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createDossierFromDevis } from "@/lib/db/dossiers";
import { triggerEvent, firstNameOf } from "@/lib/brevo/trigger-event";

/**
 * Webhook Stripe — point d'entrée des notifications de paiement.
 *
 * Évènements traités :
 *   - checkout.session.completed → acompte reçu, on marque le devis et crée le dossier
 *
 * Sécurité : signature vérifiée via STRIPE_WEBHOOK_SECRET. Aucune action effectuée
 * si la signature est invalide ou manquante.
 *
 * IMPORTANT : Ce handler utilise le service_role Supabase pour bypasser RLS
 * (les webhooks ne sont pas authentifiés en tant qu'utilisateur).
 */
export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json({ error: "Webhook non configuré" }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `Signature invalide: ${err instanceof Error ? err.message : "?"}` },
      { status: 400 }
    );
  }

  // Service role — bypass RLS pour les writes système
  const supabase = createServiceRoleClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const devisId = session.metadata?.devis_id;
    const paymentKind = (session.metadata?.kind ?? "acompte") as "acompte" | "solde";

    if (!devisId) {
      return NextResponse.json({ received: true, note: "no devis_id metadata" });
    }

    // Lit le devis pour calculer les montants et trigger les events
    const { data: devis } = await supabase
      .from("devis")
      .select("client_id, acompte_ttc, total_ttc, channel, number")
      .eq("id", devisId)
      .maybeSingle();
    if (!devis) {
      return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
    }

    const totalTtc = Number(devis.total_ttc ?? 0);
    const acompteTtc = Number(devis.acompte_ttc ?? totalTtc * 0.5);
    const soldeTtc = Math.max(0, totalTtc - acompteTtc);
    const piId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    if (paymentKind === "solde") {
      // ── SOLDE : encaissement final
      const amount = Number(session.amount_total ?? 0) / 100 || soldeTtc;

      // 1. Insert payment kind=solde
      await supabase.from("payments").insert({
        devis_id: devisId,
        client_id: devis.client_id,
        kind: "solde",
        method: "stripe",
        amount_ttc: amount,
        stripe_payment_intent_id: piId,
        notes: `Solde Stripe — ${session.id}`,
      });

      // 2. Update dossier.solde_paid
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

      // 3. Trigger event interne (alerte admin "solde encaissé")
      try {
        const { data: client } = await supabase
          .from("clients")
          .select("phone, email, display_name")
          .eq("id", devis.client_id)
          .maybeSingle();
        if (client) {
          await triggerEvent("solde_recu", {
            toPhone: client.phone,
            toEmail: client.email,
            toName: client.display_name,
            clientId: devis.client_id,
            vars: {
              prenom: firstNameOf(client.display_name),
              solde: String(Math.round(amount)),
              numero_devis: devis.number,
            },
            criteriaContext: { amount: totalTtc, channel: devis.channel ?? undefined },
            triggerSource: "stripe:checkout-completed",
          });
        }
      } catch (err) {
        console.warn("[trigger stripe → solde_recu]", err);
      }

      return NextResponse.json({ received: true, devisId, paymentKind: "solde" });
    }

    // ── ACOMPTE : flow original
    // 1. Update devis status
    const { error: e1 } = await supabase
      .from("devis")
      .update({ status: "acompte_recu" })
      .eq("id", devisId);

    if (e1) {
      console.error("Webhook: failed to update devis", e1);
      return NextResponse.json({ error: e1.message }, { status: 500 });
    }

    // 2. Insert payment record
    await supabase.from("payments").insert({
      devis_id: devisId,
      client_id: devis.client_id,
      kind: "acompte",
      method: "stripe",
      amount_ttc: acompteTtc,
      stripe_payment_intent_id: piId,
      notes: `Acompte Stripe — ${session.id}`,
    });

    // 2b. Trigger event "acompte_recu" (SMS et/ou email selon règle)
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
            acompte: String(Math.round(acompteTtc)),
          },
          triggerSource: "stripe:checkout-completed",
        });
      }
    } catch (err) {
      console.warn("[trigger stripe → acompte_recu]", err);
    }

    // 3. Auto-création (ou récupération) du dossier — idempotent.
    //    On passe le service-role client car le webhook n'a pas de session user
    //    et les RLS dossiers/items/bons_commande exigent un rôle 'staff'.
    const dossierResult = await createDossierFromDevis(devisId, supabase);
    if (!dossierResult.ok) {
      console.error("Webhook: failed to create dossier", dossierResult.message);
    } else {
      await supabase
        .from("dossiers")
        .update({ acompte_paid: true, acompte_paid_at: new Date().toISOString() })
        .eq("id", dossierResult.dossierId)
        .eq("acompte_paid", false);
    }

    return NextResponse.json({
      received: true,
      devisId,
      paymentKind: "acompte",
      dossierCreated: dossierResult.ok ? dossierResult.created : false,
    });
  }

  // Évènements non gérés — on accuse réception pour éviter les retries Stripe
  return NextResponse.json({ received: true, note: `Unhandled: ${event.type}` });
}
