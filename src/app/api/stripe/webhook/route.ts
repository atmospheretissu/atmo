import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createDossierFromDevis } from "@/lib/db/dossiers";

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

    if (!devisId) {
      return NextResponse.json({ received: true, note: "no devis_id metadata" });
    }

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
        method: "stripe",
        amount_ttc: Number(devis.acompte_ttc ?? 0),
        stripe_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
        notes: `Stripe Checkout — ${session.id}`,
      });
    }

    // 3. Auto-création du dossier (idempotent)
    const dossierResult = await createDossierFromDevis(devisId);
    if (!dossierResult.ok) {
      console.error("Webhook: failed to create dossier", dossierResult.message);
    }

    return NextResponse.json({
      received: true,
      devisId,
      dossierCreated: dossierResult.ok ? dossierResult.created : false,
    });
  }

  // Évènements non gérés — on accuse réception pour éviter les retries Stripe
  return NextResponse.json({ received: true, note: `Unhandled: ${event.type}` });
}
