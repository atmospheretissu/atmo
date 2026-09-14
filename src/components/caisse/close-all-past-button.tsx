"use client";

import { useTransition } from "react";
import { Loader2, FastForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { closeAllPastUnclosedDaysAction } from "@/app/(platform)/caisse/actions";

/**
 * Débloque la caisse en un clic : clôture rétroactive automatique de tous
 * les jours passés qui ont encore des tickets orphelins. Affichage banner
 * caisse quand blockedDay existe.
 */
export function CloseAllPastButton() {
  const [pending, start] = useTransition();
  const handle = () => {
    if (
      !confirm(
        "Clôturer automatiquement TOUS les jours passés avec des tickets en attente ?\n\nLes clôtures seront créées avec le montant espèces théorique (écart = 0). Utile quand plusieurs jours n'ont pas été clôturés dans l'ordre.",
      )
    )
      return;
    start(async () => {
      const r = await closeAllPastUnclosedDaysAction();
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      alert(
        r.closedDays.length === 0
          ? "Aucun jour passé à clôturer."
          : `${r.closedDays.length} journée(s) clôturée(s) :\n${r.closedDays.join(", ")}\n\nTotal espèces attendu : ${r.totalCash.toFixed(2)} €`,
      );
      window.location.reload();
    });
  };
  return (
    <Button variant="secondary" size="sm" onClick={handle} disabled={pending}>
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
      ) : (
        <FastForward className="h-3.5 w-3.5" strokeWidth={2.4} />
      )}
      Tout clôturer d&apos;un coup
    </Button>
  );
}
