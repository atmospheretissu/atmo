"use client";

import { useTransition } from "react";
import { Loader2, Zap, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createStripeCheckoutAction } from "@/app/(platform)/devis/stripe-actions";

export function StripeCheckoutButton({ devisId }: { devisId: string }) {
  const [pending, startTransition] = useTransition();

  const handle = () => {
    if (
      !confirm(
        "Créer une session Stripe Checkout pour l'acompte 50% ? Tu seras redirigé vers la page de paiement."
      )
    )
      return;
    startTransition(async () => {
      const r = await createStripeCheckoutAction(devisId);
      if (r.ok) {
        window.location.href = r.url;
      } else {
        alert(`Stripe : ${r.message}`);
      }
    });
  };

  return (
    <button
      onClick={handle}
      disabled={pending}
      className="inline-flex items-center gap-2 bg-white text-ink px-4 py-2.5 rounded-lg text-[13px] font-semibold hover:bg-canvas-2 transition-colors disabled:opacity-50"
    >
      {pending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Création…
        </>
      ) : (
        <>
          <Zap className="h-3.5 w-3.5" strokeWidth={2.4} /> Payer l'acompte (Stripe)
        </>
      )}
    </button>
  );
}
