import Stripe from "stripe";

/**
 * Singleton client Stripe côté serveur.
 * Renvoie null si les clés ne sont pas configurées (utile en dev avant setup).
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY non configurée. Ajoute-la dans Railway → Variables."
    );
  }
  _stripe = new Stripe(key, {
    apiVersion: "2026-04-22.dahlia",
    appInfo: {
      name: "Atmosphère Tissus",
      version: "1.0.0",
    },
  });
  return _stripe;
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY
  );
}
