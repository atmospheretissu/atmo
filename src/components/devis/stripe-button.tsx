"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Loader2, Zap } from "lucide-react";
import {
  createStripeCheckoutAction,
  createStripeCheckoutForSoldeAction,
} from "@/app/(platform)/devis/stripe-actions";

export function StripeCheckoutButton({ devisId }: { devisId: string }) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const openCheckout = () => {
    if (
      !confirm(
        "Créer une session Stripe Checkout pour l'acompte 50% ? Tu seras redirigé vers la page de paiement.",
      )
    )
      return;
    startTransition(async () => {
      const r = await createStripeCheckoutAction(devisId);
      if (r.ok) window.location.href = r.url;
      else alert(`Stripe : ${r.message}`);
    });
  };

  const copyLink = () => {
    startTransition(async () => {
      const r = await createStripeCheckoutAction(devisId);
      if (!r.ok) {
        alert(`Stripe : ${r.message}`);
        return;
      }
      try {
        await navigator.clipboard.writeText(r.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        window.prompt("Copiez le lien :", r.url);
      }
    });
  };

  return (
    <div className="inline-flex flex-wrap gap-2">
      <button
        onClick={openCheckout}
        disabled={pending}
        className="inline-flex items-center gap-2 bg-white text-ink px-4 py-2.5 rounded-lg text-[13px] font-semibold hover:bg-canvas-2 transition-colors disabled:opacity-50"
      >
        {pending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Création…
          </>
        ) : (
          <>
            <Zap className="h-3.5 w-3.5" strokeWidth={2.4} /> Payer l&apos;acompte (Stripe)
          </>
        )}
      </button>
      <button
        onClick={copyLink}
        disabled={pending}
        title="Copier un lien Stripe d'acompte à envoyer au client"
        className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/20 px-3 py-2.5 rounded-lg text-[12.5px] font-semibold hover:bg-white/20 transition-colors disabled:opacity-50"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" /> Lien copié
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" /> Copier lien acompte
          </>
        )}
      </button>
    </div>
  );
}

export function StripeSoldeCheckoutButton({ devisId }: { devisId: string }) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    startTransition(async () => {
      const r = await createStripeCheckoutForSoldeAction(devisId);
      if (!r.ok) {
        alert(`Stripe : ${r.message}`);
        return;
      }
      try {
        await navigator.clipboard.writeText(r.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        window.prompt("Copiez le lien :", r.url);
      }
    });
  };

  const openCheckout = () => {
    if (
      !confirm(
        "Créer une session Stripe Checkout pour le SOLDE ? Tu seras redirigé vers la page de paiement.",
      )
    )
      return;
    startTransition(async () => {
      const r = await createStripeCheckoutForSoldeAction(devisId);
      if (r.ok) window.location.href = r.url;
      else alert(`Stripe : ${r.message}`);
    });
  };

  return (
    <div className="inline-flex flex-wrap gap-2">
      <button
        onClick={copyLink}
        disabled={pending}
        title="Générer et copier un lien Stripe pour le solde à envoyer au client"
        className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/20 px-3 py-2 rounded-md text-[12px] font-semibold hover:bg-white/20 transition-colors disabled:opacity-50"
      >
        {pending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Génération…
          </>
        ) : copied ? (
          <>
            <Check className="h-3.5 w-3.5" /> Lien copié
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" /> Copier lien solde
          </>
        )}
      </button>
      <button
        onClick={openCheckout}
        disabled={pending}
        className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/20 px-3 py-2 rounded-md text-[12px] font-semibold hover:bg-white/20 transition-colors disabled:opacity-50"
      >
        <Zap className="h-3.5 w-3.5" strokeWidth={2.4} /> Payer le solde
      </button>
    </div>
  );
}
