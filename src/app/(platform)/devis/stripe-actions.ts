"use server";

import { createClient } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";

export type StripeCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

/**
 * Construit une URL absolue HTTPS pour le success_url / cancel_url Stripe.
 * Stripe rejette toute URL sans scheme — on se prémunit contre une variable
 * Railway mal configurée (ex: "atmo-production.up.railway.app" sans https://).
 */
function normalizeAppUrl(
  raw: string | undefined,
  railwayDomain: string | undefined,
): string {
  // Préfère NEXT_PUBLIC_APP_URL si présente et valide.
  if (raw && raw.trim()) {
    const trimmed = raw.trim().replace(/\/+$/, "");
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
    // Si l'utilisateur a oublié le scheme, on assume HTTPS (sauf localhost).
    if (trimmed.startsWith("localhost") || trimmed.startsWith("127.0.0.1")) {
      return `http://${trimmed}`;
    }
    return `https://${trimmed}`;
  }
  // Fallback : domaine Railway auto-injecté.
  if (railwayDomain) return `https://${railwayDomain.replace(/\/+$/, "")}`;
  return "https://atmospheretissus.fr";
}

/**
 * Crée une Session Checkout Stripe pour l'acompte 50% d'un devis.
 * Renvoie l'URL Checkout — le client redirige le navigateur dessus.
 *
 * Au paiement, le webhook /api/stripe/webhook reçoit l'événement
 * `checkout.session.completed`, marque le devis acompte_recu et déclenche
 * la création du dossier.
 */
export async function createStripeCheckoutAction(
  devisId: string
): Promise<StripeCheckoutResult> {
  if (!isStripeConfigured()) {
    return {
      ok: false,
      message: "Stripe non configuré (manque STRIPE_SECRET_KEY).",
    };
  }

  const supabase = await createClient();
  const { data: devis, error } = await supabase
    .from("devis")
    .select("id, number, client_id, total_ttc, acompte_ttc, product_summary")
    .eq("id", devisId)
    .maybeSingle();

  if (error || !devis) {
    return { ok: false, message: "Devis introuvable." };
  }

  const { data: client } = await supabase
    .from("clients")
    .select("display_name, email")
    .eq("id", devis.client_id)
    .maybeSingle();

  const acompteAmount = Number(devis.acompte_ttc ?? Number(devis.total_ttc) * 0.5);
  if (acompteAmount <= 0) {
    return { ok: false, message: "Montant d'acompte invalide." };
  }

  const stripe = getStripe();
  const appUrl = normalizeAppUrl(
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.RAILWAY_PUBLIC_DOMAIN,
  );

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: client?.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: Math.round(acompteAmount * 100), // cents
            product_data: {
              name: `Acompte 50% — Devis ${devis.number}`,
              description: `${devis.product_summary} — ${client?.display_name ?? ""}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        devis_id: devis.id,
        devis_number: devis.number,
        kind: "acompte",
        atmosphere_app_version: "1",
      },
      success_url: `${appUrl}/paiement/merci/${devis.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/paiement/annule/${devis.id}`,
      locale: "fr",
    });

    return { ok: true, url: session.url ?? `${appUrl}/devis/${devis.id}` };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Erreur Stripe",
    };
  }
}
