"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  RotateCcw,
  Scissors,
  PackageCheck,
} from "lucide-react";
import { setItemStatusAction, type ItemNewStatus } from "@/app/(platform)/confections/actions";
import { cn } from "@/lib/utils";

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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const apply = (next: ItemNewStatus, confirmMsg?: string) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setError(null);
    setOpen(false);
    startTransition(async () => {
      const r = await setItemStatusAction(itemId, next);
      if (r.ok) setStatus(r.newStatus);
      else setError(r.message);
    });
  };

  const isReceived = status === "recu";
  const isAtelier = status === "confection";

  if (isReceived) {
    return (
      <div className="inline-flex items-center gap-2">
        <span
          className="h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-[11.5px] font-semibold bg-emerald-soft border border-emerald/30 text-emerald"
        >
          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.4} />
          Réceptionné
        </span>
        <button
          onClick={() =>
            apply("en_attente", "Annuler la réception ? L'article repassera en attente.")
          }
          disabled={pending}
          title="Annuler"
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
      <div className="inline-flex items-center gap-2">
        <span
          className="h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-[11.5px] font-semibold bg-violet-soft border border-violet/30 text-violet-strong"
        >
          <Scissors className="h-3.5 w-3.5" strokeWidth={2.4} />
          Envoyé en confection
        </span>
        <button
          onClick={() =>
            apply("en_attente", "Annuler l'envoi en confection ? L'article repassera en attente.")
          }
          disabled={pending}
          title="Annuler"
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

  return (
    <div ref={ref} className="relative inline-flex items-center gap-2">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className={cn(
          "h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-[11.5px] font-semibold transition-all border bg-white border-line text-muted hover:text-ink hover:border-line-strong disabled:opacity-50",
        )}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
        ) : (
          <>
            Marquer
            <ChevronDown className="h-3 w-3" strokeWidth={2.4} />
          </>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-9 z-30 min-w-[220px] rounded-lg border border-line bg-white shadow-lg overflow-hidden">
          <button
            onClick={() => apply("recu")}
            className="w-full text-left px-3 py-2.5 hover:bg-emerald-soft/40 transition-colors flex items-start gap-2.5 border-b border-line"
          >
            <PackageCheck className="h-3.5 w-3.5 text-emerald mt-0.5 shrink-0" strokeWidth={2.4} />
            <div>
              <p className="text-[12.5px] font-semibold text-ink">Réceptionné</p>
              <p className="text-[11px] text-muted-2">Article reçu, OK pour la pose</p>
            </div>
          </button>
          <button
            onClick={() => apply("confection")}
            className="w-full text-left px-3 py-2.5 hover:bg-violet-soft/40 transition-colors flex items-start gap-2.5"
          >
            <Scissors className="h-3.5 w-3.5 text-violet mt-0.5 shrink-0" strokeWidth={2.4} />
            <div>
              <p className="text-[12.5px] font-semibold text-ink">Envoyé en confection</p>
              <p className="text-[11px] text-muted-2">Le tissu part à l'atelier</p>
            </div>
          </button>
        </div>
      )}

      {error && <span className="text-[11px] text-pink">{error}</span>}
      {qrCode && (
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
