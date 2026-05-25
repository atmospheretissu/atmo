"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Circle, Loader2, RotateCcw } from "lucide-react";
import { toggleItemReceptionAction } from "@/app/(platform)/confections/actions";
import { cn } from "@/lib/utils";

/**
 * Bouton compact pour cocher/décocher la réception d'un item de dossier
 * directement depuis la fiche confection — sans passer par le scan QR.
 *
 * - État reçu → coche emerald + bouton "Annuler" sur hover/click long
 * - État en attente → bouton "Marquer reçu" qui flip
 */
export function ItemReceptionToggle({
  itemId,
  initialStatus,
  qrCode,
}: {
  itemId: string;
  initialStatus: string;
  qrCode?: string | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isReceived = status === "recu";

  const toggle = () => {
    setError(null);
    // Confirmation si on annule une réception
    if (isReceived) {
      const ok = confirm(
        "Annuler la réception de cet article ? Il repassera en 'En attente'.",
      );
      if (!ok) return;
    }
    startTransition(async () => {
      const r = await toggleItemReceptionAction(itemId);
      if (r.ok) {
        setStatus(r.newStatus);
      } else {
        setError(r.message);
      }
    });
  };

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={toggle}
        disabled={pending}
        title={
          isReceived
            ? "Cliquer pour annuler la réception"
            : "Cliquer pour marquer comme reçu (sans scan QR)"
        }
        className={cn(
          "h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-[11.5px] font-semibold transition-all border disabled:opacity-50",
          isReceived
            ? "bg-emerald-soft border-emerald/30 text-emerald hover:bg-emerald-soft/70"
            : "bg-white border-line text-muted hover:text-ink hover:border-line-strong",
        )}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
        ) : isReceived ? (
          <>
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.4} />
            Reçu
          </>
        ) : (
          <>
            <Circle className="h-3.5 w-3.5" strokeWidth={2.4} />
            Marquer reçu
          </>
        )}
      </button>
      {isReceived && !pending && (
        <button
          onClick={toggle}
          disabled={pending}
          title="Annuler la réception"
          className="h-8 w-8 rounded-md inline-flex items-center justify-center text-muted-2 hover:text-pink hover:bg-pink-soft/40 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.2} />
        </button>
      )}
      {error && (
        <span className="text-[11px] text-pink">{error}</span>
      )}
      {qrCode && !isReceived && (
        <span
          className="hidden md:inline text-[10.5px] text-muted-2 font-mono"
          title="Code QR pour scan rapide"
        >
          ou scanne {qrCode}
        </span>
      )}
    </div>
  );
}
