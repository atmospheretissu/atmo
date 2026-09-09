"use client";

import { useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { receiveByQrAction } from "@/app/(platform)/reception/actions";

/**
 * Bouton « Reçu » manuel — à côté du QR code sur la liste des items
 * en attente. Utilise la même action que le scan QR (receiveByQrAction)
 * en passant le QR code de la ligne.
 *
 * Demande PE 08/09 : « est-il possible de valider à la main les
 * produits reçus ? Oui il faut un bouton reçu. ». Accessible à tous
 * les rôles ayant accès à /reception.
 */
export function ManualReceiveButton({
  qrCode,
  itemLabel,
}: {
  qrCode: string;
  itemLabel: string;
}) {
  const [pending, start] = useTransition();

  const handle = () => {
    if (
      !confirm(
        `Marquer manuellement « ${itemLabel} » comme reçu ?\n\n(QR ${qrCode})`,
      )
    )
      return;
    start(async () => {
      const r = await receiveByQrAction(qrCode);
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      window.location.reload();
    });
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handle}
      disabled={pending}
      className="shrink-0"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.4} />
      )}
      Reçu
    </Button>
  );
}
