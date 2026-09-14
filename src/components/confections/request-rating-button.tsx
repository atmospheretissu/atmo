"use client";

import { useTransition } from "react";
import { Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestDossierRatingAction } from "@/app/(platform)/confections/rating-actions";

/**
 * Bouton fin de dossier : envoie au client par email un lien pour noter le
 * dossier 1-5. Si la note = 5, la page /rate/[token] lui propose de publier
 * l'avis sur Google (PE 14/09).
 */
export function RequestRatingButton({ dossierId }: { dossierId: string }) {
  const [pending, start] = useTransition();
  const handle = () => {
    if (!confirm("Envoyer au client par email un lien pour noter ce dossier ?"))
      return;
    start(async () => {
      const r = await requestDossierRatingAction(dossierId);
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      const emailed = r.emailedTo
        ? `Email envoyé à ${r.emailedTo}.`
        : "Client sans email — copiez le lien manuellement.";
      alert(
        `✓ Demande de note préparée.\n${emailed}\n\nLien direct :\n${r.rateUrl}`,
      );
    });
  };
  return (
    <Button variant="primary" size="sm" onClick={handle} disabled={pending}>
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
      ) : (
        <Star className="h-3.5 w-3.5" strokeWidth={2.4} />
      )}
      Demander une note
    </Button>
  );
}
