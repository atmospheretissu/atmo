"use client";

import { useState, useTransition } from "react";
import { getStripeCheckoutForSignAction } from "./actions";

/**
 * Fallback F7 — bouton « Payer l'acompte » visible sur la page /sign quand
 * le devis est déjà signé mais l'acompte pas encore réglé. Génère une
 * nouvelle session Stripe Checkout à la demande.
 */
export function PayNowButton({ token }: { token: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handle = () => {
    setError(null);
    start(async () => {
      const r = await getStripeCheckoutForSignAction(token);
      if (r.ok && r.url) {
        window.location.href = r.url;
      } else {
        setError(r.ok ? "Stripe non disponible." : r.message);
      }
    });
  };

  return (
    <div className="mt-4">
      <button
        onClick={handle}
        disabled={pending}
        className="w-full h-12 rounded-md bg-violet text-white text-[15px] font-semibold hover:bg-violet/90 disabled:opacity-40 transition-colors"
      >
        {pending ? "Ouverture du paiement…" : "Payer l'acompte en ligne"}
      </button>
      {error && (
        <p className="mt-2 text-[12px] text-pink text-center">{error}</p>
      )}
    </div>
  );
}
