"use client";

import { useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendDevisEmailAction } from "@/app/(platform)/devis/email-actions";

export function SendEmailButton({ devisId }: { devisId: string }) {
  const [pending, startTransition] = useTransition();

  const handle = () => {
    if (!confirm("Envoyer ce devis par email au client (PDF en pièce jointe) ?")) return;
    startTransition(async () => {
      const r = await sendDevisEmailAction(devisId);
      if (r.ok) {
        alert(`✓ Devis envoyé à ${r.emailedTo}\n(Brevo messageId: ${r.messageId})`);
      } else {
        alert(`Échec : ${r.message}`);
      }
    });
  };

  return (
    <Button variant="primary" size="sm" onClick={handle} disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Envoi…
        </>
      ) : (
        <>
          <Send className="h-3.5 w-3.5" strokeWidth={2.4} /> Envoyer
        </>
      )}
    </Button>
  );
}
