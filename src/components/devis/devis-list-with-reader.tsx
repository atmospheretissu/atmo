"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Download,
  X,
  Maximize2,
  Mail,
  Loader2,
  ChevronDown,
  Filter as FilterIcon,
} from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import {
  devisStatusLabels,
  devisStatusTones,
  type DevisStatus,
} from "@/lib/validation/devis";
import { channelLabels, type Channel } from "@/lib/validation/client";
import { SendEmailButton } from "@/components/devis/send-email-button";
import type { DevisWithClient } from "@/lib/db/devis";
import type { Source } from "@/lib/db/sources-shared";
import { resolveSourceLabel } from "@/lib/db/sources-shared";

const channelTones: Record<Channel, "violet" | "orange" | "blue" | "pink" | "emerald"> = {
  magasin: "violet",
  leroy_merlin: "orange",
  ecommerce: "blue",
  decoratrice: "pink",
  visio: "emerald",
};

const filters: { label: string; value: "all" | DevisStatus }[] = [
  { label: "Tous", value: "all" },
  { label: "Brouillons", value: "brouillon" },
  { label: "Envoyés", value: "envoye" },
  { label: "Validés", value: "valide" },
  { label: "Acompte reçu", value: "acompte_recu" },
  { label: "Refusés", value: "refuse" },
  { label: "Expirés", value: "expire" },
];

function shortDate(d: string | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(d));
}

const eurShort = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function DevisListWithReader({
  initialDevis,
  sources = [],
}: {
  initialDevis: DevisWithClient[];
  sources?: Source[];
}) {
  const [filter, setFilter] = useState<"all" | DevisStatus>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    return initialDevis.filter((d) => {
      if (filter !== "all" && d.status !== filter) return false;
      if (query) {
        const q = query.toLowerCase().trim();
        if (!q) return true;
        // Normalisation : on enlève espaces/points/+33 pour matcher le tel
        const norm = (s: string) => s.replace(/[\s.+\-/()]/g, "").toLowerCase();
        const c = d.client;
        return (
          d.number.toLowerCase().includes(q) ||
          (c?.display_name.toLowerCase().includes(q) ?? false) ||
          (c?.email?.toLowerCase().includes(q) ?? false) ||
          (c?.phone ? norm(c.phone).includes(norm(query)) : false) ||
          (c?.city?.toLowerCase().includes(q) ?? false) ||
          (d.product_summary?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [initialDevis, filter, query]);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: initialDevis.length };
    for (const d of initialDevis) {
      result[d.status as string] = (result[d.status as string] ?? 0) + 1;
    }
    return result;
  }, [initialDevis]);

  const selected = useMemo(
    () => initialDevis.find((d) => d.id === selectedId) ?? null,
    [initialDevis, selectedId]
  );

  // Auto-select first match when filters change and current isn't visible
  useEffect(() => {
    if (selectedId && !filtered.find((d) => d.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
    }
  }, [filtered, selectedId]);

  // Keyboard nav: ↑↓ to move selection, Esc to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!selected) return;
      if (e.key === "Escape") {
        setSelectedId(null);
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const idx = filtered.findIndex((d) => d.id === selected.id);
        if (idx === -1) return;
        const next = e.key === "ArrowDown" ? idx + 1 : idx - 1;
        if (next >= 0 && next < filtered.length) {
          setSelectedId(filtered[next].id);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, selected]);

  return (
    <section className="px-8 pb-10">
      {/* Filters bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <nav className="flex items-center gap-1.5 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={
                "h-8 px-3 rounded-full text-[12.5px] font-medium transition-all flex items-center gap-1.5 " +
                (filter === f.value
                  ? "bg-ink text-white"
                  : "bg-white text-muted hover:text-ink border border-line")
              }
            >
              {f.label}
              <span
                className={
                  "text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums " +
                  (filter === f.value ? "bg-white/15 text-white/90" : "bg-canvas-2 text-muted")
                }
              >
                {counts[f.value] ?? 0}
              </span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2" strokeWidth={2.2} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom, email, téléphone, n° devis, ville…"
              className="pl-9 w-64 text-[12.5px] rounded-full bg-white"
            />
          </div>
        </div>
      </div>

      <div
        className={
          "grid gap-4 transition-[grid-template-columns] duration-200 " +
          (selected
            ? "grid-cols-1 lg:grid-cols-[minmax(0,420px)_1fr]"
            : "grid-cols-1")
        }
      >
        {/* LEFT — list */}
        <div ref={listRef} className="min-w-0">
          {selected ? (
            <CompactList
              devis={filtered}
              selectedId={selected.id}
              onSelect={setSelectedId}
            />
          ) : (
            <FullTable devis={filtered} onSelect={setSelectedId} sources={sources} />
          )}
        </div>

        {/* RIGHT — preview panel */}
        {selected && (
          <PreviewPanel
            devis={selected}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </section>
  );
}

/* ------------------------------ FULL TABLE ------------------------------ */

function FullTable({
  devis,
  onSelect,
  sources,
}: {
  devis: DevisWithClient[];
  onSelect: (id: string) => void;
  sources: Source[];
}) {
  return (
    <div className="bg-white border border-line rounded-2xl overflow-hidden">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-canvas-2/40 border-b border-line">
            <Th>Devis</Th>
            <Th>Client</Th>
            <Th>Canal</Th>
            <Th>Produit</Th>
            <Th align="right">Total TTC</Th>
            <Th>Statut</Th>
            <Th align="right">Créé</Th>
            <Th align="right">Échéance</Th>
          </tr>
        </thead>
        <tbody>
          {devis.map((d) => {
            const nm = d.client?.display_name ?? "Client inconnu";
            const initial = nm.includes(",")
              ? (nm.split(",")[1].trim()[0] ?? nm[0])
              : nm[0];
            const status = d.status as DevisStatus;
            const channel = d.channel as Channel;
            return (
              <tr
                key={d.id}
                onClick={() => onSelect(d.id)}
                className="border-b border-line last:border-b-0 transition-colors hover:bg-canvas-2/40 cursor-pointer"
              >
                <td className="px-4 py-3">
                  <p className="font-mono text-[12.5px] text-ink font-medium">{d.number}</p>
                  <p className="ref">v{d.version}</p>
                </td>
                <td className="px-4 py-3">
                  {d.client ? (
                    <div className="flex items-center gap-2.5">
                      <LetterAvatar initial={initial} tone={toneFor(nm)} size="sm" />
                      <div className="min-w-0">
                        <p className="font-semibold text-ink leading-tight truncate">{nm}</p>
                        <p className="ref mt-0.5">{d.client.city ?? "—"}</p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-2">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const sourceId =
                      (d as { source_id?: string | null }).source_id ?? null;
                    const r = resolveSourceLabel(sources, sourceId, channel);
                    return (
                      <StatusPill tone={r.color} dot={false}>
                        {r.label}
                      </StatusPill>
                    );
                  })()}
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <p className="text-ink truncate font-medium">{d.product_summary}</p>
                  <p className="ref truncate">{d.product_detail ?? ""}</p>
                </td>
                <td className="px-4 py-3 text-right">
                  <p className="font-semibold text-ink tabular-nums">
                    {eurShort.format(Number(d.total_ttc ?? 0))}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <StatusPill tone={devisStatusTones[status]}>
                    {devisStatusLabels[status]}
                  </StatusPill>
                </td>
                <td className="px-4 py-3 text-right">
                  <p className="text-[12px] text-ink-3 tabular-nums">
                    {shortDate(d.created_at)}
                  </p>
                </td>
                <td className="px-4 py-3 text-right">
                  <p
                    className={
                      "text-[12px] tabular-nums " +
                      (d.valid_until && new Date(d.valid_until) < new Date()
                        ? "text-pink font-semibold"
                        : "text-muted")
                    }
                  >
                    {shortDate(d.valid_until)}
                  </p>
                </td>
              </tr>
            );
          })}
          {devis.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-[12.5px] text-muted-2">
                Aucun devis pour ce filtre.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------ COMPACT LIST ------------------------------ */

function CompactList({
  devis,
  selectedId,
  onSelect,
}: {
  devis: DevisWithClient[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="bg-white border border-line rounded-2xl overflow-hidden">
      <div className="px-3 py-2 bg-canvas-2/40 border-b border-line flex items-center justify-between">
        <p className="text-[11px] text-muted-2 font-semibold uppercase tracking-wider">
          {devis.length} devis
        </p>
        <p className="text-[10.5px] text-muted-2">↑↓ pour naviguer · Esc pour fermer</p>
      </div>
      <div className="divide-y divide-line max-h-[calc(100vh-22rem)] overflow-y-auto">
        {devis.map((d) => {
          const nm = d.client?.display_name ?? "Client inconnu";
          const initial = nm.includes(",") ? (nm.split(",")[1].trim()[0] ?? nm[0]) : nm[0];
          const status = d.status as DevisStatus;
          const active = d.id === selectedId;
          return (
            <button
              key={d.id}
              onClick={() => onSelect(d.id)}
              className={
                "w-full text-left px-3 py-3 flex items-center gap-2.5 transition-colors " +
                (active ? "bg-violet-soft border-l-2 border-violet" : "hover:bg-canvas-2/40 border-l-2 border-transparent")
              }
            >
              <LetterAvatar initial={initial} tone={toneFor(nm)} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[11.5px] text-ink-2 truncate">{d.number}</p>
                  <span className="text-[11px] font-semibold text-ink tabular-nums shrink-0">
                    {eurShort.format(Number(d.total_ttc ?? 0))}
                  </span>
                </div>
                <p className="text-[12.5px] font-semibold text-ink truncate leading-tight">{nm}</p>
                <p className="text-[11px] text-muted truncate">{d.product_summary}</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <StatusPill tone={devisStatusTones[status]}>
                    {devisStatusLabels[status]}
                  </StatusPill>
                  <span className="text-[10.5px] text-muted-2 tabular-nums">
                    {shortDate(d.created_at)}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
        {devis.length === 0 && (
          <div className="px-4 py-10 text-center text-[12.5px] text-muted-2">
            Aucun devis.
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ PREVIEW PANEL ------------------------------ */

function PreviewPanel({
  devis,
  onClose,
}: {
  devis: DevisWithClient;
  onClose: () => void;
}) {
  const status = devis.status as DevisStatus;
  const channel = devis.channel as Channel;
  const [loading, setLoading] = useState(true);
  const [pdfKey, setPdfKey] = useState(devis.id);

  // Re-mount iframe when devis changes (forces re-fetch)
  useEffect(() => {
    setLoading(true);
    setPdfKey(devis.id + "-" + Date.now());
  }, [devis.id]);

  return (
    <div className="bg-white border border-line rounded-2xl overflow-hidden flex flex-col lg:sticky lg:top-4 h-[calc(100vh-9rem)] min-h-[500px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-line flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-mono text-[12.5px] text-ink font-semibold truncate">
              {devis.number}
            </p>
            <span className="text-muted-2">·</span>
            <StatusPill tone={devisStatusTones[status]}>
              {devisStatusLabels[status]}
            </StatusPill>
            <StatusPill tone={channelTones[channel]} dot={false}>
              {channelLabels[channel]}
            </StatusPill>
          </div>
          <p className="text-[11.5px] text-muted truncate mt-0.5">
            {devis.client?.display_name ?? "Client inconnu"} ·{" "}
            <span className="text-ink font-semibold tabular-nums">
              {eurShort.format(Number(devis.total_ttc ?? 0))} TTC
            </span>
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="text-muted-2 hover:text-ink h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-canvas-2"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Action bar */}
      <div className="px-4 py-2.5 bg-canvas-2/30 border-b border-line flex items-center gap-1.5 flex-wrap">
        <Link href={`/devis/${devis.id}`}>
          <Button variant="primary" size="sm">
            <Maximize2 className="h-3.5 w-3.5" strokeWidth={2.2} /> Ouvrir
          </Button>
        </Link>
        <Link href={`/devis/${devis.id}/pdf`} target="_blank">
          <Button variant="secondary" size="sm">
            <Download className="h-3.5 w-3.5" strokeWidth={2.2} /> Télécharger
          </Button>
        </Link>
        <SendEmailButton devisId={devis.id} />
        <Link href={`/commandes/from-devis/${devis.id}`}>
          <Button variant="ghost" size="sm">
            Générer BCs
          </Button>
        </Link>
      </div>

      {/* PDF viewer */}
      <div className="flex-1 relative bg-canvas-2/40 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-canvas-2/60 z-10">
            <Loader2 className="h-6 w-6 text-muted-2 animate-spin" />
          </div>
        )}
        <iframe
          key={pdfKey}
          src={`/devis/${devis.id}/pdf?inline=1`}
          title={`PDF ${devis.number}`}
          className="w-full h-full border-0"
          onLoad={() => setLoading(false)}
        />
      </div>
    </div>
  );
}

/* ------------------------------ TABLE HEADER ------------------------------ */

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={
        "px-4 py-2.5 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 " +
        (align === "right" ? "text-right" : "text-left")
      }
    >
      {children}
    </th>
  );
}
