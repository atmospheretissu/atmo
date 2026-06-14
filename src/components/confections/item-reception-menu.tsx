"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Loader2,
  RotateCcw,
  Scissors,
  PackageCheck,
} from "lucide-react";
import { setItemStatusAction, type ItemNewStatus } from "@/app/(platform)/confections/actions";

type Status = "en_attente" | "recu" | "confection" | string;

export function ItemReceptionMenu({
  itemId,
  initialStatus,
  qrCode,
}: {
  itemId: string;
  initialStatus: Status;
  qrCode?: string | null;
}) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<ItemNewStatus | null>(null);

  const apply = (next: ItemNewStatus, confirmMsg?: string) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setError(null);
    setBusy(next);
    startTransition(async () => {
      const r = await setItemStatusAction(itemId, next);
      if (r.ok) setStatus(r.newStatus);
      else setError(r.message);
      setBusy(null);
    });
  };

  const isReceived = status === "recu";
  const isAtelier = status === "confection";

  // ─── État stable : Réceptionné ───
  if (isReceived) {
    return (
      <div className="inline-flex items-center gap-2">
        <span className="h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-[11.5px] font-semibold bg-emerald-soft border border-emerald/30 text-emerald">
          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.4} />
          Réceptionné
        </span>
        <button
          onClick={() =>
            apply("en_attente", "Annuler la réception ? L'article repassera en attente.")
          }
          disabled={pending}
          title="Annuler la réception"
          className="h-8 w-8 rounded-md inline-flex items-center justify-center text-muted-2 hover:text-pink hover:bg-pink-soft/40 transition-colors disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.2} />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.2} />
          )}
        </button>
        {error && <span className="text-[11px] text-pink">{error}</span>}
      </div>
    );
  }

  // ─── État stable : Envoyé en confection ───
  if (isAtelier) {
    return (
      <div className="inline-flex items-center gap-2 flex-wrap">
        <span className="h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-[11.5px] font-semibold bg-violet-soft border border-violet/30 text-violet-strong">
          <Scissors className="h-3.5 w-3.5" strokeWidth={2.4} />
          Envoyé en confection
        </span>
        {/* Bouton pour basculer en réceptionné quand l'atelier rend le travail */}
        <button
          onClick={() => apply("recu")}
          disabled={pending}
          title="Reçu de l'atelier → prêt pour la pose"
          className="h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-[11.5px] font-semibold border border-emerald/30 bg-emerald-soft/60 text-emerald hover:bg-emerald-soft transition-colors disabled:opacity-50"
        >
          {pending && busy === "recu" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
          ) : (
            <PackageCheck className="h-3.5 w-3.5" strokeWidth={2.4} />
          )}
          Reçu de l'atelier
        </button>
        <button
          onClick={() =>
            apply("en_attente", "Annuler l'envoi en confection ? L'article repassera en attente.")
          }
          disabled={pending}
          title="Annuler"
          className="h-8 w-8 rounded-md inline-flex items-center justify-center text-muted-2 hover:text-pink hover:bg-pink-soft/40 transition-colors disabled:opacity-50"
        >
          {pending && busy === "en_attente" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.2} />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.2} />
          )}
        </button>
        {error && <span className="text-[11px] text-pink">{error}</span>}
      </div>
    );
  }

  // ─── En attente : 2 boutons visibles côte-à-côte ───
  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <button
        onClick={() => apply("recu")}
        disabled={pending}
        title="Article reçu → contribue au passage en prêt-pose"
        className="h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-[11.5px] font-semibold border border-emerald/30 bg-emerald-soft/60 text-emerald hover:bg-emerald-soft transition-colors disabled:opacity-50"
      >
        {pending && busy === "recu" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
        ) : (
          <PackageCheck className="h-3.5 w-3.5" strokeWidth={2.4} />
        )}
        Réceptionné
      </button>
      <button
        onClick={() => apply("confection")}
        disabled={pending}
        title="Le tissu part à l'atelier (en confection)"
        className="h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-[11.5px] font-semibold border border-violet/30 bg-violet-soft/40 text-violet-strong hover:bg-violet-soft/70 transition-colors disabled:opacity-50"
      >
        {pending && busy === "confection" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
        ) : (
          <Scissors className="h-3.5 w-3.5" strokeWidth={2.4} />
        )}
        Envoyer en confection
      </button>
      {error && <span className="text-[11px] text-pink ml-1">{error}</span>}
      {qrCode && (
        <span
          className="hidden xl:inline text-[10.5px] text-muted-2 font-mono ml-1"
          title="Code QR pour scan rapide"
        >
          ou scanne {qrCode}
        </span>
      )}
    </div>
  );
}
