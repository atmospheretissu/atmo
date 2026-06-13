"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, Loader2 } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { sourceColorToTone, type Source } from "@/lib/db/sources-shared";
import { setDevisSourceAction } from "@/app/(platform)/parametres/sources-actions";

/**
 * Badge source affiché sur la fiche devis, cliquable pour corriger l'étiquette
 * (utile quand un devis hérite à tort de la source du client — ex: client
 * Leroy Merlin pour qui on fait un devis magasin).
 */
export function SourceBadgeSelector({
  devisId,
  currentSourceId,
  currentLabel,
  currentColor,
  allSources,
}: {
  devisId: string;
  currentSourceId: string | null;
  currentLabel: string;
  currentColor: string;
  allSources: Source[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const activeSources = allSources.filter((s) => s.active);

  const handleSelect = (sourceId: string) => {
    setOpen(false);
    startTransition(async () => {
      const r = await setDevisSourceAction(devisId, sourceId);
      if (r.ok) {
        router.refresh();
      } else {
        alert(r.message);
      }
    });
  };

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="inline-flex items-center gap-1 transition-opacity hover:opacity-75 disabled:opacity-50"
        title="Cliquer pour changer la source"
      >
        <StatusPill tone={sourceColorToTone(currentColor)} dot={false}>
          {currentLabel}
          {pending ? (
            <Loader2 className="h-2.5 w-2.5 ml-1 animate-spin inline" strokeWidth={2.4} />
          ) : (
            <ChevronDown className="h-2.5 w-2.5 ml-0.5 inline opacity-60" strokeWidth={2.4} />
          )}
        </StatusPill>
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-30 min-w-[180px] bg-white border border-line rounded-lg shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-line bg-canvas-2/40">
            <p className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-2">
              Source du devis
            </p>
          </div>
          <ul className="py-1 max-h-64 overflow-auto">
            {activeSources.map((s) => {
              const isCurrent = s.id === currentSourceId;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => handleSelect(s.id)}
                    className={
                      "w-full flex items-center justify-between gap-2 px-3 py-1.5 text-[12.5px] hover:bg-canvas-2 transition-colors text-left " +
                      (isCurrent ? "bg-canvas-2/60" : "")
                    }
                  >
                    <StatusPill tone={sourceColorToTone(s.color)} dot={false}>
                      {s.label}
                    </StatusPill>
                    {isCurrent && <Check className="h-3 w-3 text-emerald" strokeWidth={2.4} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
