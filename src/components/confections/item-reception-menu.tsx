"use client";

import { useState } from "react";
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
  needsConfection = false,
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
  /** true = ligne « Tissu & Confection » : réceptionner la matière ne
   *  termine PAS la ligne, elle part ensuite à l'atelier. Le vocabulaire
   *  et la cible du bouton changent en conséquence. */
  needsConfection?: boolean;
}) {
  const [status, setStatus] = useState<Status>(initialStatus);
  // useState au lieu de useTransition : sinon le `pending` reste true tant
  // que le RSC refetch (déclenché par revalidatePath dans le server action)
  // n'est pas terminé. React 19 propage l'état "transition en cours" à TOUS
  // les useTransition de la page — d'où les spinners qui apparaissent sur
  // toutes les lignes en même temps sans qu'aucune ne se termine.
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<ItemNewStatus | null>(null);
  const [atelierModalOpen, setAtelierModalOpen] = useState(false);

  const apply = async (
    next: ItemNewStatus,
    opts?: { atelierId?: string | null; confirmMsg?: string },
  ) => {
    if (opts?.confirmMsg && !confirm(opts.confirmMsg)) return;
    setError(null);
    setBusy(next);
    setPending(true);
    try {
      const r = await setItemStatusAction(itemId, next, {
        atelierId: opts?.atelierId,
      });
      if (r.ok) setStatus(r.newStatus);
      else setError(r.message);
    } finally {
      setBusy(null);
      setPending(false);
      setAtelierModalOpen(false);
    }
  };

  const isReceived = status === "recu";
  const isAtelier = status === "confection";

  // La modale de choix d'atelier sert dans deux états : avant l'envoi
  // (choix initial) et pendant la confection (transfert vers un autre
  // atelier). Elle est donc définie une fois et rendue dans les deux.
  const atelierModal = atelierModalOpen ? (
  
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
              <p className="text-[14px] font-semibold text-ink">
                {isAtelier ? "Changer l'atelier" : "Choisir l'atelier"}
              </p>
              <p className="text-[11.5px] text-muted mt-0.5">
                {isAtelier
                  ? "La ligne sera transférée dans l'atelier sélectionné."
                  : "Cette ligne partira dans l'atelier sélectionné."}
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
  ) : null;

  if (isReceived) {
    return (
      <div className="inline-flex items-center gap-2">
        <span className="h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-[11.5px] font-semibold bg-emerald-soft border border-emerald/30 text-emerald">
          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.4} />
          {needsConfection ? "Confection terminée" : "Réceptionné"}
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
        {ateliers.length > 0 && (
          <button
            onClick={() => setAtelierModalOpen(true)}
            disabled={pending}
            title="Changer l'atelier de cette ligne"
            className="h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-[11.5px] font-semibold border border-violet/30 bg-violet-soft/40 text-violet-strong hover:bg-violet-soft/70 transition-colors disabled:opacity-50"
          >
            <Scissors className="h-3.5 w-3.5" strokeWidth={2.4} />
            {currentAtelierName ? "Changer d'atelier" : "Choisir l'atelier"}
          </button>
        )}
        <button
          onClick={() =>
            apply("recu", {
              confirmMsg:
                "Marquer la confection comme terminée ? L'article sera compté comme prêt.",
            })
          }
          disabled={pending}
          title="La confection est finie, l'article est prêt à poser"
          className="h-9 px-3 rounded-md inline-flex items-center gap-1.5 text-[12.5px] font-semibold border border-emerald bg-emerald text-white hover:bg-emerald/90 transition-colors disabled:opacity-50 shadow-sm"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />
          ) : (
            <PackageCheck className="h-4 w-4" strokeWidth={2.4} />
          )}
          Confection terminée
        </button>
        {error && <span className="text-[11px] text-pink">{error}</span>}
        {atelierModal}
      </div>
    );
  }

  // ─── État initial : en_attente (à réceptionner OU à envoyer atelier) ───
  return (
    <div className="inline-flex items-center gap-2 flex-wrap">
      <button
        onClick={() => {
          // Régression signalée par Pierre-Edouard (06/10) : depuis que ces
          // lignes passent par l'atelier, « Tissu reçu » basculait
          // directement en confection SANS demander l'atelier, alors que
          // l'ancien parcours (« Envoyer en confection ») l'ouvrait. On ne
          // pouvait donc plus choisir l'atelier à la ligne, seulement au
          // dossier. Le choix est rendu ici.
          if (needsConfection && ateliers.length > 0) {
            setAtelierModalOpen(true);
            return;
          }
          apply(needsConfection ? "confection" : "recu");
        }}
        disabled={pending}
        title={
          needsConfection
            ? "La matière est arrivée — l'article passe en confection"
            : "Marquer comme reçu (magasin / entrée matière)"
        }
        className="h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-[11.5px] font-semibold border border-emerald/30 bg-emerald-soft/40 text-emerald hover:bg-emerald-soft/70 transition-colors disabled:opacity-50"
      >
        {pending && busy === (needsConfection ? "confection" : "recu") ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
        ) : (
          <PackageCheck className="h-3.5 w-3.5" strokeWidth={2.4} />
        )}
        {needsConfection ? "Tissu reçu" : "Réceptionné"}
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
      {atelierModal}

    </div>
  );
}
