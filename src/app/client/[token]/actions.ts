"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";

/**
 * Crée une session Stripe Checkout depuis le portail client (auth par token).
 *
 * Différent de createStripeCheckoutAction (espace admin) car :
 *   - Aucune session Supabase requise
 *   - Auth via le token URL (équivalent magic link permanent)
 *   - success_url renvoie sur /client/{token}?paid=success (espace client)
 *
 * Gère deux natures de paiement :
 *   - `acompte` : 50 % à la validation du devis
 *   - `solde`   : reste dû avant la pose (total - acompte)
 */
export type ClientCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

export type PaymentKind = "acompte" | "solde";

function normalizeAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (raw && raw.trim()) {
    const t = raw.trim().replace(/\/+$/, "");
    if (t.startsWith("http://") || t.startsWith("https://")) return t;
    if (t.startsWith("localhost") || t.startsWith("127.0.0.1")) return `http://${t}`;
    return `https://${t}`;
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN.replace(/\/+$/, "")}`;
  }
  return "https://atmospheretissus.fr";
}

export async function createStripeCheckoutForToken(
  token: string,
  kind: PaymentKind = "acompte",
): Promise<ClientCheckoutResult> {
  if (!isStripeConfigured()) {
    return {
      ok: false,
      message:
        "Paiement en ligne temporairement indisponible. Merci de nous contacter.",
    };
  }
  if (!token || token.length < 16) {
    return { ok: false, message: "Lien invalide." };
  }

  const supabase = createServiceRoleClient();

  // Résolution token → devis
  const { data: devis, error } = await supabase
    .from("devis")
    .select(
      "id, number, total_ttc, acompte_ttc, product_summary, client_id, status",
    )
    .eq("client_access_token" as never, token)
    .maybeSingle();

  if (error || !devis) {
    return { ok: false, message: "Devis introuvable." };
  }

  if (devis.status === "refuse" || devis.status === "expire") {
    return { ok: false, message: "Ce devis n'est plus actif. Contactez Atmosphère." };
  }

  const { data: client } = await supabase
    .from("clients")
    .select("display_name, email")
    .eq("id", devis.client_id)
    .maybeSingle();

  const totalTtc = Number(devis.total_ttc ?? 0);
  const acompteTtc = Number(devis.acompte_ttc ?? totalTtc * 0.5);

  // ── Validation selon le type de paiement
  let amount = 0;
  let productName = "";

  if (kind === "acompte") {
    if (devis.status === "acompte_recu") {
      return { ok: false, message: "Votre acompte a déjà été reçu." };
    }
    amount = acompteTtc;
    productName = `Acompte 50% — Devis ${devis.number}`;
  } else {
    // Solde : il faut que l'acompte ait été reçu, et que le solde ne soit pas déjà réglé.
    if (devis.status !== "acompte_recu") {
      return {
        ok: false,
        message: "L'acompte doit être réglé avant de payer le solde.",
      };
    }
    // Vérifie que le solde n'a pas déjà été enregistré
    const { data: existingSolde } = await supabase
      .from("payments")
      .select("id")
      .eq("devis_id", devis.id)
      .eq("kind", "solde")
      .maybeSingle();
    if (existingSolde) {
      return { ok: false, message: "Le solde a déjà été réglé." };
    }
    amount = Math.max(0, totalTtc - acompteTtc);
    productName = `Solde — Devis ${devis.number}`;
  }

  if (amount <= 0) {
    return { ok: false, message: "Montant invalide." };
  }

  const stripe = getStripe();
  const appUrl = normalizeAppUrl();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: client?.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: productName,
              description: `${devis.product_summary} — ${client?.display_name ?? ""}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        devis_id: devis.id,
        devis_number: devis.number,
        kind,
        source: "client-portal",
      },
      success_url: `${appUrl}/client/${token}?paid=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/client/${token}?paid=cancel`,
      locale: "fr",
    });

    return { ok: true, url: session.url ?? `${appUrl}/client/${token}` };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Erreur Stripe",
    };
  }
}
