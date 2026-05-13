"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  Search,
  SlidersHorizontal,
  Download,
  Mail,
  MoreHorizontal,
  Copy,
  Eye,
  FileText,
} from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import {
  devisStatusLabels,
  devisStatusTones,
  type DevisStatus,
} from "@/lib/validation/devis";
import { channelLabels, type Channel } from "@/lib/validation/client";
import type { DevisWithClient } from "@/lib/db/devis";

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

export function DevisTable({ initialDevis }: { initialDevis: DevisWithClient[] }) {
  const [filter, setFilter] = useState<"all" | DevisStatus>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return initialDevis.filter((d) => {
      if (filter !== "all" && d.status !== filter) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          d.number.toLowerCase().includes(q) ||
          (d.client?.display_name.toLowerCase().includes(q) ?? false) ||
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

  const totalCA = filtered.reduce((acc, d) => acc + Number(d.total_ttc ?? 0), 0);

  return (
    <>
      <section className="px-8 pb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
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
                    (filter === f.value
                      ? "bg-white/15 text-white/90"
                      : "bg-canvas-2 text-muted")
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
                placeholder="Client, n° devis…"
                className="pl-9 pr-12 w-72 text-[12.5px] rounded-full bg-white"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Kbd>⌘K</Kbd>
              </div>
            </div>
            <Button variant="secondary" size="sm" className="rounded-full">
              <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2.2} />
              Filtres
            </Button>
          </div>
        </div>
      </section>

      <section className="px-8 pb-10">
        <div className="bg-white border border-line rounded-2xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-canvas-2/40 border-b border-line">
                <Th sortable>Devis</Th>
                <Th sortable>Client</Th>
                <Th>Canal</Th>
                <Th sortable>Produit</Th>
                <Th align="right" sortable>Total TTC</Th>
                <Th sortable>Statut</Th>
                <Th align="right" sortable>Créé</Th>
                <Th align="right" sortable>Échéance</Th>
                <th className="w-10 px-4 py-2.5" aria-hidden></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const nm = d.client?.display_name ?? "Client inconnu";
                const initial = nm.includes(",")
                  ? (nm.split(",")[1].trim()[0] ?? nm[0])
                  : nm[0];
                const status = d.status as DevisStatus;
                const channel = d.channel as Channel;
                return (
                  <tr
                    key={d.id}
                    className="group border-b border-line last:border-b-0 transition-colors hover:bg-canvas-2/40"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/devis/${d.id}`}
                        className="font-mono text-[12.5px] text-ink hover:text-violet font-medium"
                      >
                        {d.number}
                      </Link>
                      <p className="ref">v{d.version}</p>
                    </td>
                    <td className="px-4 py-3">
                      {d.client ? (
                        <Link href={`/clients/${d.client.id}`} className="flex items-center gap-2.5 group/c">
                          <LetterAvatar initial={initial} tone={toneFor(nm)} size="sm" />
                          <div className="min-w-0">
                            <p className="font-semibold text-ink leading-tight truncate group-hover/c:underline decoration-line-strong">
                              {nm}
                            </p>
                            <p className="ref mt-0.5">{d.client.city ?? "—"}</p>
                          </div>
                        </Link>
                      ) : (
                        <span className="text-muted-2">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={channelTones[channel]} dot={false}>
                        {channelLabels[channel]}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-ink truncate font-medium">{d.product_summary}</p>
                      <p className="ref truncate">{d.product_detail ?? ""}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-semibold text-ink tabular-nums">
                        {eurShort.format(Number(d.total_ttc ?? 0))}
                      </p>
                      <p className="ref">{d.qty ?? 1} × items</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={devisStatusTones[status]}>
                        {devisStatusLabels[status]}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-[12px] text-ink-3 tabular-nums">{shortDate(d.created_at)}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p
                        className={
                          "text-[12px] tabular-nums " +
                          (d.valid_until && new Date(d.valid_until) < new Date()
                            ? "text-red font-semibold"
                            : "text-muted")
                        }
                      >
                        {shortDate(d.valid_until)}
                      </p>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <Link href={`/devis/${d.id}`}>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-2 hover:text-ink h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-canvas-2">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-[12.5px] text-muted-2">
                    Aucun devis pour ce filtre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="bg-canvas-2/30 border-t border-line px-4 py-2.5 flex items-center justify-between text-[12px] text-muted">
            <span>
              <span className="font-semibold text-ink tabular-nums">{filtered.length}</span> devis
              <span className="text-muted-2 mx-1.5">·</span>
              <span className="font-semibold text-ink tabular-nums">
                {eurShort.format(totalCA)}
              </span>{" "}
              TTC cumulé
            </span>
            <span className="text-muted-2">Page 1 sur 1</span>
          </div>
        </div>
      </section>
    </>
  );
}

function Th({
  children,
  align = "left",
  sortable = false,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  sortable?: boolean;
}) {
  return (
    <th
      className={
        "px-4 py-2.5 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 " +
        (align === "right" ? "text-right" : "text-left")
      }
    >
      <span
        className={
          "inline-flex items-center gap-1 " +
          (sortable ? "cursor-pointer hover:text-ink-2" : "")
        }
      >
        {children}
        {sortable && <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </span>
    </th>
  );
}
