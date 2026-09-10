"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Loader2,
  RotateCcw,
  Scissors,
  PackageCheck,
  X,
} from "lucide-react";
import { setItemStatusAction, type ItemNewStatus } from "@/app/(platform)/confections/actions";

type Status = "en_attente" | "recu" | "confection" | string;

export type AtelierPick = { id: string; name: string };

export function ItemReceptionMenu({
  itemId,
  initialStatus,
  qrCode,
  ateliers = [],
  defaultAtelierId,
  currentAtelierName,
}: {
  itemId: string;
  initialStatus: Status;
  qrCode?: string | null;
  /** Liste des ateliers actifs — sert au choix par ligne (F5). */
  ateliers?: AtelierPick[];
  /** Atelier assigné au dossier (fallback). */
  defaultAtelierId?: string | null;
  /** Nom lisible de l'atelier courant de la ligne (déjà envoyée). */
  currentAtelierName?: string | null;
}) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<ItemNewStatus | null>(null);
  const [atelierModalOpen, setAtelierModalOpen] = useState(false);

  const apply = (
    next: ItemNewStatus,
    opts?: { atelierId?: string | null; confirmMsg?: string },
  ) => {
    if (opts?.confirmMsg && !confirm(opts.confirmMsg)) return;
    setError(null);
    setBusy(next);
    startTransition(async () => {
      const r = await setItemStatusAction(itemId, next, {
        atelierId: opts?.atelierId,
      });
      if (r.ok) setStatus(r.newStatus);
      else setError(r.message);
      setBusy(null);
      setAtelierModalOpen(false);
    });
  };

  const isReceived = status === "recu";
  const isAtelier = status === "confection";

  if (isReceived) {
    return (
      <div className="inline-flex items-center gap-2">
        <span className="h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-[11.5px] font-semibold bg-emerald-soft border border-emerald/30 text-emerald">
          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.4} />
          Réceptionné
        </span>
        <button
          onClick={() =>
            apply("en_attente", {
              confirmMsg: "Annuler la réception ? L'article repassera en attente.",
            })
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

  if (isAtelier) {
    return (
      <div className="inline-flex items-center gap-2 flex-wrap">
        <span className="h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-[11.5px] font-semibold bg-violet-soft border border-violet/30 text-violet-strong">
          <Scissors className="h-3.5 w-3.5" strokeWidth={2.4} />
          En confection
          {currentAtelierName && (
            <span className="ml-1 text-[10.5px] font-normal opacity-80">
              · {currentAtelierName}
            </span>
          )}
        </span>
        <button
          onClick={() =>
            apply("recu", {
              confirmMsg: "Marquer l'article comme reçu de l'atelier ?",
            })
          }
          disabled={pending}
          title="Marquer reçu (retour atelier)"
          className="h-8 w-8 rounded-md inline-flex items-center justify-center text-muted-2 hover:text-emerald hover:bg-emerald-soft/40 transition-colors disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.2} />
          ) : (
            <PackageCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
          )}
        </button>
        {error && <span className="text-[11px] text-pink">{error}</span>}
      </div>
    );
  }

  // ─── État initial : en_attente (à réceptionner OU à envoyer atelier) ───
  return (
    <div className="inline-flex items-center gap-2 flex-wrap">
      <button
        onClick={() => apply("recu")}
        disabled={pending}
        title="Marquer comme reçu (magasin / entrée matière)"
        className="h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-[11.5px] font-semibold border border-emerald/30 bg-emerald-soft/40 text-emerald hover:bg-emerald-soft/70 transition-colors disabled:opacity-50"
      >
        {pending && busy === "recu" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
        ) : (
          <PackageCheck className="h-3.5 w-3.5" strokeWidth={2.4} />
        )}
        Réceptionné
      </button>
      <button
        onClick={() => {
          if (ateliers.length === 0) {
            apply("confection");
          } else {
            setAtelierModalOpen(true);
          }
        }}
        disabled={pending}
        title="Envoyer cet article à un atelier (choix par ligne)"
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

      {atelierModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setAtelierModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-line flex items-center justify-between">
              <div>
                <p className="text-[14px] font-semibold text-ink">Choisir l'atelier</p>
                <p className="text-[11.5px] text-muted mt-0.5">
                  Cette ligne partira dans l'atelier sélectionné.
                </p>
              </div>
              <button
                onClick={() => setAtelierModalOpen(false)}
                className="h-7 w-7 rounded-md text-muted-2 hover:text-ink hover:bg-canvas-2 inline-flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-2 max-h-[50vh] overflow-y-auto">
              {ateliers.map((a) => {
                const isDefault = a.id === defaultAtelierId;
                return (
                  <button
                    key={a.id}
                    onClick={() =>
                      apply("confection", { atelierId: a.id })
                    }
                    disabled={pending}
                    className="w-full text-left px-3 py-2.5 rounded-md hover:bg-violet-soft/40 transition-colors inline-flex items-center justify-between disabled:opacity-50"
                  >
                    <span className="text-[13px] font-medium text-ink">
                      {a.name}
                    </span>
                    {isDefault && (
                      <span className="text-[10.5px] text-muted-2 uppercase tracking-wider">
                        défaut dossier
                      </span>
                    )}
                  </button>
                );
              })}
              <button
                onClick={() => apply("confection", { atelierId: null })}
                disabled={pending}
                className="w-full text-left px-3 py-2.5 rounded-md hover:bg-canvas-2 transition-colors text-[13px] text-muted italic disabled:opacity-50"
              >
                Envoyer sans préciser d'atelier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
