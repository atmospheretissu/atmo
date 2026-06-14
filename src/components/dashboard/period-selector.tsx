"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, X } from "lucide-react";

export type PeriodKey = "day" | "week" | "month" | "year" | "all" | "custom";

type Opt = { key: PeriodKey; label: string };

const PRESETS: Opt[] = [
  { key: "day", label: "Aujourd'hui" },
  { key: "week", label: "Semaine" },
  { key: "month", label: "Mois" },
  { key: "year", label: "Année" },
  { key: "all", label: "Tout" },
];

function todayIso() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    .toISOString()
    .slice(0, 10);
}

function firstOfMonthIso() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export function PeriodSelector({
  current,
  initialFrom,
  initialTo,
}: {
  current: PeriodKey;
  initialFrom?: string | null;
  initialTo?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(initialFrom ?? firstOfMonthIso());
  const [to, setTo] = useState(initialTo ?? todayIso());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const customActive = current === "custom";

  const customLabel = useMemo(() => {
    if (!customActive) return "Personnalisé";
    try {
      const fmt = (iso: string) =>
        new Date(iso).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "short",
        });
      return `${fmt(initialFrom ?? from)} → ${fmt(initialTo ?? to)}`;
    } catch {
      return "Personnalisé";
    }
  }, [customActive, initialFrom, initialTo, from, to]);

  const apply = () => {
    if (!from || !to) return;
    if (from > to) return;
    setOpen(false);
    router.push(`/dashboard?period=custom&from=${from}&to=${to}`);
  };

  return (
    <div ref={ref} className="relative">
      <div className="inline-flex items-center gap-0.5 rounded-md border border-line bg-canvas-2/40 p-0.5">
        {PRESETS.map((opt) => {
          const active = opt.key === current;
          return (
            <Link
              key={opt.key}
              href={`/dashboard?period=${opt.key}`}
              className={`px-2.5 py-1 text-[12px] font-medium rounded-[5px] transition-colors ${
                active
                  ? "bg-white text-ink shadow-sm"
                  : "text-muted-2 hover:text-ink"
              }`}
            >
              {opt.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium rounded-[5px] transition-colors ${
            customActive
              ? "bg-white text-ink shadow-sm"
              : "text-muted-2 hover:text-ink"
          }`}
        >
          <Calendar className="h-3 w-3" strokeWidth={2.4} />
          {customLabel}
        </button>
      </div>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 z-30 min-w-[300px] bg-white border border-line rounded-lg shadow-pop overflow-hidden">
          <div className="px-3 py-2 border-b border-line bg-canvas-2/40 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-2">
              Période personnalisée
            </p>
            <button
              onClick={() => setOpen(false)}
              className="h-5 w-5 inline-flex items-center justify-center text-muted-2 hover:text-ink rounded"
            >
              <X className="h-3 w-3" strokeWidth={2.4} />
            </button>
          </div>
          <div className="p-3 space-y-3">
            <div>
              <label className="block text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 mb-1">
                Du
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[12.5px] text-ink focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/15"
              />
            </div>
            <div>
              <label className="block text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 mb-1">
                Au
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[12.5px] text-ink focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/15"
              />
            </div>
            {from && to && from > to && (
              <p className="text-[11.5px] text-pink">
                La date de fin doit être après la date de début.
              </p>
            )}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/dashboard?period=month");
                }}
                className="text-[11.5px] text-muted hover:text-ink-2"
              >
                Annuler
              </button>
              <button
                onClick={apply}
                disabled={!from || !to || from > to}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold bg-ink text-white hover:bg-ink/90 disabled:opacity-40 transition-colors"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
