"use client";

import { useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncStripePaymentForDevisAction } from "@/app/(platform)/devis/stripe-sync-actions";

/**
 * Bouton fallback : interroge Stripe et applique l'acompte / solde si
 * un paiement est validé mais que le webhook ne l'a pas fait passer.
 * Utile quand STRIPE_WEBHOOK_SECRET n'est pas configuré ou que l'endpoint
 * webhook n'est pas enregistré côté Stripe dashboard.
 */
export function StripeSyncButton({ devisId }: { devisId: string }) {
  const [pending, start] = useTransition();
  const handle = () => {
    start(async () => {
      const r = await syncStripePaymentForDevisAction(devisId);
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      alert(
        `Sync Stripe terminée :\n${r.message}\n(${r.inspectedSessions} session(s) Stripe inspectée(s))`,
      );
      window.location.reload();
    });
  };
  return (
    <Button variant="secondary" size="sm" onClick={handle} disabled={pending}>
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
      ) : (
        <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.4} />
      )}
      Sync Stripe
    </Button>
  );
}
