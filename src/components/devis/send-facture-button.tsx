"use client";

import { useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendFactureEmailAction } from "@/app/(platform)/devis/facture-email-actions";

/**
 * Bouton manuel « Envoyer la facture » — pour l'acompte ou le solde.
 * Utile si l'envoi auto (F9) a échoué ou pour re-envoyer sur demande client.
 * L'envoi auto s'exécute déjà à l'encaissement dans markAcompte/markSolde et
 * dans le webhook Stripe.
 */
export function SendFactureButton({
  devisId,
  kind,
}: {
  devisId: string;
  kind: "acompte" | "solde";
}) {
  const [pending, start] = useTransition();
  const label = kind === "acompte" ? "Facture acompte" : "Facture solde";
  const handle = () => {
    if (
      !confirm(
        `Envoyer la ${kind === "acompte" ? "facture d'acompte" : "facture de solde"} au client par email ?`,
      )
    )
      return;
    start(async () => {
      const r = await sendFactureEmailAction(devisId, kind);
      if (!r.ok) {
        alert(`Échec : ${r.message}`);
        return;
      }
      const stripeMsg = r.stripeUrl ? "\nLien Stripe joint ✓" : "";
      alert(`✓ Facture envoyée à ${r.emailedTo}${stripeMsg}`);
    });
  };
  return (
    <Button variant="secondary" size="sm" onClick={handle} disabled={pending}>
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
      ) : (
        <Send className="h-3.5 w-3.5" strokeWidth={2.4} />
      )}
      {label}
    </Button>
  );
}
