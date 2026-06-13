"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Check, ChevronDown, Plus, Building2, Layers } from "lucide-react";
import { setCurrentStoreAction } from "@/app/(platform)/parametres/stores-actions";
import { storeColorToTone, storeInitials, type Store } from "@/lib/db/stores-shared";
import Link from "next/link";

const COLOR_BG: Record<string, string> = {
  violet: "bg-violet text-white",
  emerald: "bg-emerald text-white",
  blue: "bg-blue text-white",
  pink: "bg-pink text-white",
  amber: "bg-amber text-white",
  orange: "bg-orange text-white",
  yellow: "bg-yellow text-ink",
  neutral: "bg-ink text-white",
};

const COLOR_DOT: Record<string, string> = {
  violet: "bg-violet",
  emerald: "bg-emerald",
  blue: "bg-blue",
  pink: "bg-pink",
  amber: "bg-amber",
  orange: "bg-orange",
  yellow: "bg-yellow",
  neutral: "bg-ink",
};

export function WorkspaceSwitcher({
  stores,
  currentStoreId,
  isAdmin,
}: {
  stores: Store[];
  /** null = "all" (vue agrégée admin) */
  currentStoreId: string | null;
  isAdmin: boolean;
}) {
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

  const handleSelect = (storeId: string | "all") => {
    setOpen(false);
    startTransition(async () => {
      await setCurrentStoreAction(storeId);
      // La revalidate du layout va rafraîchir la sidebar et le contenu
      window.location.reload();
    });
  };

  const current = currentStoreId
    ? stores.find((s) => s.id === currentStoreId) ?? null
    : null;
  const showingAll = !current;
  const tone = current ? storeColorToTone(current.color) : "neutral";

  return (
    <div ref={wrapperRef} className="relative mx-3 mt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="w-full flex items-center gap-2 rounded-lg bg-white px-2 py-1.5 border border-line hover:border-line-strong transition-colors disabled:opacity-50"
      >
        <div
          className={
            "h-7 w-7 rounded-md flex items-center justify-center text-[11px] font-semibold tracking-wide shrink-0 " +
            (showingAll ? "bg-ink text-white" : COLOR_BG[tone] ?? "bg-ink text-white")
          }
        >
          {showingAll ? <Layers className="h-3.5 w-3.5" strokeWidth={2.4} /> : storeInitials(current!)}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[12.5px] font-semibold text-ink truncate leading-tight">
            {showingAll ? "Tous les magasins" : current!.name}
          </p>
          <p className="text-[10.5px] text-muted mt-0.5 truncate">
            {showingAll
              ? "Vue agrégée"
              : (current!.short_name ?? current!.city ?? "Magasin")}
          </p>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-muted-2 shrink-0" strokeWidth={2.4} />
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 right-0 z-30 bg-white border border-line rounded-lg shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-line bg-canvas-2/40">
            <p className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-2">
              Changer de magasin
            </p>
          </div>
          <ul className="py-1 max-h-72 overflow-auto">
            {isAdmin && (
              <li>
                <button
                  onClick={() => handleSelect("all")}
                  className={
                    "w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] hover:bg-canvas-2 transition-colors text-left " +
                    (showingAll ? "bg-canvas-2/60" : "")
                  }
                >
                  <div className="h-6 w-6 rounded-md bg-ink text-white flex items-center justify-center shrink-0">
                    <Layers className="h-3 w-3" strokeWidth={2.4} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold text-ink">Tous les magasins</p>
                    <p className="text-[10.5px] text-muted-2">Vue agrégée admin</p>
                  </div>
                  {showingAll && <Check className="h-3.5 w-3.5 text-emerald" strokeWidth={2.4} />}
                </button>
              </li>
            )}
            {stores
              .filter((s) => s.active)
              .map((s) => {
                const isCurrent = current?.id === s.id;
                const t = storeColorToTone(s.color);
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => handleSelect(s.id)}
                      className={
                        "w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] hover:bg-canvas-2 transition-colors text-left " +
                        (isCurrent ? "bg-canvas-2/60" : "")
                      }
                    >
                      <div
                        className={
                          "h-6 w-6 rounded-md flex items-center justify-center text-[10.5px] font-semibold shrink-0 " +
                          (COLOR_BG[t] ?? "bg-ink text-white")
                        }
                      >
                        {storeInitials(s)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-semibold text-ink truncate">{s.name}</p>
                        <p className="text-[10.5px] text-muted-2 truncate">
                          {s.short_name ?? s.city ?? "—"}
                        </p>
                      </div>
                      <span className={`h-2 w-2 rounded-full ${COLOR_DOT[t]}`} />
                      {isCurrent && <Check className="h-3.5 w-3.5 text-emerald" strokeWidth={2.4} />}
                    </button>
                  </li>
                );
              })}
          </ul>
          {isAdmin && (
            <div className="border-t border-line px-3 py-2 bg-canvas-2/30">
              <Link
                href="/parametres"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1.5 text-[11.5px] text-muted hover:text-ink-2 font-medium"
              >
                <Plus className="h-3 w-3" strokeWidth={2.4} />
                Ajouter / gérer les magasins
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
