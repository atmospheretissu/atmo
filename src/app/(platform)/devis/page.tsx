"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import {
  ArrowUpDown,
  Search,
  SlidersHorizontal,
  Download,
  Mail,
  MoreHorizontal,
  Plus,
  Copy,
  Eye,
  Calendar,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import {
  devisList,
  channelLabels,
  statusLabels,
  statusTones,
  DevisStatus,
} from "@/lib/mock-data";
import { eur, shortDate } from "@/lib/formatters";

const filters: { label: string; value: "all" | DevisStatus }[] = [
  { label: "Tous", value: "all" },
  { label: "Brouillons", value: "brouillon" },
  { label: "Envoyés", value: "envoye" },
  { label: "Validés", value: "valide" },
  { label: "Acompte reçu", value: "acompte_recu" },
  { label: "Refusés", value: "refuse" },
  { label: "Expirés", value: "expire" },
];

const channelTones: Record<string, "violet" | "orange" | "blue" | "pink" | "emerald"> = {
  magasin: "violet",
  leroy_merlin: "orange",
  ecommerce: "blue",
  decoratrice: "pink",
  visio: "emerald",
};

export default function DevisListPage() {
  const [filter, setFilter] = useState<"all" | DevisStatus>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return devisList.filter((d) => {
      if (filter !== "all" && d.status !== filter) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          d.client.name.toLowerCase().includes(q) ||
          d.number.toLowerCase().includes(q) ||
          d.product.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [filter, query]);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: devisList.length };
    devisList.forEach((d) => {
      result[d.status] = (result[d.status] ?? 0) + 1;
    });
    return result;
  }, []);

  const totalCA = filtered.reduce((acc, d) => acc + d.totalTTC, 0);

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((d) => d.id)));
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Devis" },
        ]}
      />

      <div className="flex-1 overflow-auto">
        {/* HERO */}
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Module 1 · Simulateur & Devis</p>
          <div className="flex items-end justify-between gap-8 flex-wrap mb-2">
            <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1]">
              Tous vos devis
              <span className="ml-3 text-[24px] text-muted-2 font-semibold tabular-nums">
                {devisList.length}
              </span>
            </h1>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm">
                <Calendar className="h-3.5 w-3.5" strokeWidth={2.2} />
                30 derniers jours
              </Button>
              <Button variant="secondary" size="sm">
                <Download className="h-3.5 w-3.5" strokeWidth={2.2} />
                Exporter
              </Button>
              <Link href="/devis/nouveau">
                <Button variant="primary" size="sm">
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
                  Nouveau devis
                </Button>
              </Link>
            </div>
          </div>
          <p className="text-[13.5px] text-muted max-w-2xl">
            La validation d'un devis déclenche automatiquement la fiche confection et les bons de commande fournisseurs.
            <strong className="text-ink font-medium"> Zéro ressaisie.</strong>
          </p>
        </section>

        {/* Filter pills + search */}
        <section className="px-8 pb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <nav className="flex items-center gap-1.5 flex-wrap">
              {filters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={
                    "group relative h-8 px-3 rounded-full text-[12.5px] font-medium transition-all flex items-center gap-1.5 " +
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
                  placeholder="Client, n° devis, produit…"
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

        {selected.size > 0 && (
          <div className="mx-8 mb-4 flex items-center gap-2 px-4 py-2.5 bg-ink text-white rounded-xl animate-fade-up">
            <span className="text-[11.5px] tracking-wide font-medium">
              {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
            </span>
            <span className="text-white/40">·</span>
            <button className="text-[12px] hover:text-white/80">Relancer par email</button>
            <button className="text-[12px] hover:text-white/80">Marquer expirés</button>
            <button className="text-[12px] hover:text-white/80">Exporter PDF</button>
            <button
              className="ml-auto text-[11.5px] text-white/70 hover:text-white"
              onClick={() => setSelected(new Set())}
            >
              Annuler
            </button>
          </div>
        )}

        {/* Table */}
        <section className="px-8 pb-10">
          <div className="bg-white border border-line rounded-2xl overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-canvas-2/40 border-b border-line">
                  <th className="w-10 px-4 py-2.5 text-left">
                    <Checkbox
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                    />
                  </th>
                  <Th sortable>Devis</Th>
                  <Th sortable>Client</Th>
                  <Th>Canal</Th>
                  <Th sortable>Produit</Th>
                  <Th align="right" sortable>Total TTC</Th>
                  <Th sortable>Statut</Th>
                  <Th align="right" sortable>Envoyé</Th>
                  <Th align="right" sortable>Échéance</Th>
                  <th className="w-10 px-4 py-2.5" aria-hidden></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const nm = d.client.name;
                  const initial = nm.includes(",")
                    ? (nm.split(",")[1].trim()[0] ?? nm[0])
                    : nm[0];
                  return (
                    <tr
                      key={d.id}
                      className={
                        "group border-b border-line last:border-b-0 transition-colors " +
                        (selected.has(d.id) ? "bg-violet-soft/50" : "hover:bg-canvas-2/40")
                      }
                    >
                      <td className="px-4 py-3">
                        <Checkbox checked={selected.has(d.id)} onChange={() => toggle(d.id)} />
                      </td>
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
                        <div className="flex items-center gap-2.5">
                          <LetterAvatar initial={initial} tone={toneFor(nm)} size="sm" />
                          <div className="min-w-0">
                            <p className="font-semibold text-ink leading-tight truncate">{d.client.name}</p>
                            <p className="ref mt-0.5">{d.client.city}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill tone={channelTones[d.channel]} dot={false}>
                          {channelLabels[d.channel]}
                        </StatusPill>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-ink truncate font-medium">{d.product}</p>
                        <p className="ref truncate">{d.productDetail}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-semibold text-ink tabular-nums">{eur(d.totalTTC, true)}</p>
                        <p className="ref">{d.qty} × items</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill tone={statusTones[d.status]}>
                          {statusLabels[d.status]}
                        </StatusPill>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-[12px] text-ink-3 tabular-nums">{shortDate(d.createdAt)}</p>
                        <p className="ref">{d.commercial.split(" ")[0]}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p
                          className={
                            "text-[12px] tabular-nums " +
                            (d.validUntil < new Date() ? "text-red font-semibold" : "text-muted")
                          }
                        >
                          {shortDate(d.validUntil)}
                        </p>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/devis/${d.id}`}>
                            <Button variant="ghost" size="icon-sm" aria-label="Voir">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="icon-sm" aria-label="Renvoyer email">
                            <Mail className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" aria-label="Dupliquer">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" aria-label="Plus">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="bg-canvas-2/30 border-t border-line px-4 py-2.5 flex items-center justify-between text-[12px] text-muted">
              <span>
                <span className="font-semibold text-ink tabular-nums">{filtered.length}</span> devis affiché{filtered.length > 1 ? "s" : ""}
                <span className="text-muted-2 mx-1.5">·</span>
                <span className="font-semibold text-ink tabular-nums">{eur(totalCA, true)}</span> TTC cumulé
              </span>
              <span className="text-muted-2">Page 1 sur 1</span>
            </div>
          </div>
        </section>
      </div>
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

function Checkbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      aria-checked={checked}
      role="checkbox"
      className={
        "h-4 w-4 rounded-[5px] border transition-all flex items-center justify-center " +
        (checked
          ? "bg-violet border-violet"
          : "bg-white border-line-strong hover:border-ink-3")
      }
    >
      {checked && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-white">
          <path
            d="M1.5 5 L4 7.5 L8.5 2.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
