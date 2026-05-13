"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import {
  Plus,
  Filter,
  Search,
  Download,
  Mail,
  AlertTriangle,
  Truck,
  Package,
  PackageSearch,
  CheckCircle2,
  Send,
  MoreHorizontal,
  ArrowUpDown,
  Globe,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  bonsCommande,
  bcStatusLabels,
  bcStatusTones,
  fournisseurs,
  BonCommande,
} from "@/lib/mock-data";
import { eur, shortDate } from "@/lib/formatters";

const statusFilters: { key: BonCommande["status"] | "all" | "franco"; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "brouillon", label: "Brouillons" },
  { key: "envoye", label: "Envoyés" },
  { key: "recu", label: "Reçus" },
  { key: "franco", label: "Franco non atteint" },
];

const langChip = {
  FR: { tone: "violet" as const, label: "FR" },
  EN: { tone: "blue" as const, label: "EN" },
  PL: { tone: "orange" as const, label: "PL" },
  UA: { tone: "yellow" as const, label: "UA" },
};

export default function CommandesPage() {
  const [filter, setFilter] = useState<typeof statusFilters[number]["key"]>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return bonsCommande.filter((bc) => {
      if (filter === "franco" && bc.amount >= bc.franco) return false;
      if (filter !== "all" && filter !== "franco" && bc.status !== filter) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          bc.number.toLowerCase().includes(q) ||
          bc.supplier.toLowerCase().includes(q) ||
          bc.dossier.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [filter, query]);

  const totalEnvoyes = bonsCommande
    .filter((b) => b.status !== "brouillon")
    .reduce((acc, b) => acc + b.amount, 0);
  const francoMissing = bonsCommande.filter((b) => b.amount < b.franco).length;
  const enRetard = 1;

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Commandes fournisseurs" },
        ]}
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Filter className="h-3.5 w-3.5" strokeWidth={2.2} /> Filtres
            </Button>
            <Button variant="primary" size="sm">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Nouveau BC
            </Button>
          </>
        }
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Module 3 · Commandes fournisseurs</p>
          <div className="flex items-end justify-between gap-8 flex-wrap mb-2">
            <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1]">
              Bons de commande
              <span className="ml-3 text-[24px] text-muted-2 font-semibold tabular-nums">
                {bonsCommande.length}
              </span>
            </h1>
          </div>
          <p className="text-[13.5px] text-muted max-w-2xl">
            BC générés automatiquement à la validation d'un devis. PDF + email fournisseur (multilingue FR/EN/PL/UA).
            <strong className="text-ink font-medium"> Alerte si franco non atteint avant envoi.</strong>
          </p>
        </section>

        {/* KPI strip */}
        <section className="px-8 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="Envoyés ce mois" value={eur(totalEnvoyes, true)} tone="blue" sub={`${bonsCommande.filter((b) => b.status !== "brouillon").length} BC`} icon={Send} />
            <MiniStat label="Franco non atteint" value={String(francoMissing)} tone="amber" sub="regrouper possible" icon={AlertTriangle} />
            <MiniStat label="En attente livraison" value="3" tone="violet" sub="depuis 5j+" icon={Truck} />
            <MiniStat label="En retard" value={String(enRetard)} tone="pink" sub="action requise" icon={AlertTriangle} />
          </div>
        </section>

        {/* Filter + search */}
        <section className="px-8 pb-4 flex items-center justify-between gap-4 flex-wrap">
          <nav className="flex items-center gap-1.5 flex-wrap">
            {statusFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={
                  "h-8 px-3 rounded-full text-[12.5px] font-medium transition-all " +
                  (filter === f.key
                    ? "bg-ink text-white"
                    : "bg-white text-muted hover:text-ink border border-line")
                }
              >
                {f.label}
              </button>
            ))}
          </nav>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2" strokeWidth={2.2} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="N° BC, fournisseur, dossier…"
              className="pl-9 w-72 text-[12.5px] rounded-full bg-white"
            />
          </div>
        </section>

        {/* Suppliers row */}
        <section className="px-8 pb-6">
          <p className="eyebrow mb-3">Fournisseurs actifs</p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {fournisseurs.map((f) => {
              const bcCount = bonsCommande.filter((b) => b.supplier === f.name).length;
              const totalAmount = bonsCommande
                .filter((b) => b.supplier === f.name)
                .reduce((acc, b) => acc + b.amount, 0);
              const aboveFranco = totalAmount >= f.franco;
              return (
                <Card key={f.id} className="p-3.5">
                  <div className="flex items-start justify-between mb-2.5">
                    <ColorChip
                      tone={
                        f.type === "tissu"
                          ? "violet"
                          : f.type === "rail"
                          ? "blue"
                          : f.type === "accessoire"
                          ? "pink"
                          : "orange"
                      }
                      size="md"
                    >
                      <Package className="h-4 w-4" strokeWidth={2.2} />
                    </ColorChip>
                    <span className={`text-[10.5px] font-mono font-semibold px-1.5 py-0.5 rounded bg-${langChip[f.language].tone}-soft text-${langChip[f.language].tone}-strong`}>
                      {f.language}
                    </span>
                  </div>
                  <p className="text-[12.5px] font-semibold text-ink leading-tight truncate">{f.name}</p>
                  <p className="text-[10.5px] text-muted-2 mt-0.5">{f.country}</p>
                  <div className="mt-2.5 pt-2.5 border-t border-line">
                    <p className="text-[10.5px] text-muted">
                      Franco · <span className="font-mono tabular-nums text-ink-2">{eur(f.franco, true)}</span>
                    </p>
                    <div className="mt-1.5 flex items-center justify-between text-[10.5px]">
                      <span className={aboveFranco ? "text-emerald" : "text-amber"}>
                        {aboveFranco ? "✓ atteint" : "✗ à atteindre"}
                      </span>
                      <span className="text-muted-2">{bcCount} BC</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Table BC */}
        <section className="px-8 pb-10">
          <div className="bg-white border border-line rounded-2xl overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-canvas-2/40 border-b border-line">
                  <Th sortable>BC</Th>
                  <Th sortable>Fournisseur</Th>
                  <Th sortable>Dossier</Th>
                  <Th align="right" sortable>Montant</Th>
                  <Th>Franco</Th>
                  <Th sortable>Statut</Th>
                  <Th align="right" sortable>Envoyé</Th>
                  <Th align="right" sortable>Réception</Th>
                  <th className="w-10 px-4 py-2.5" aria-hidden></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((bc) => {
                  const francoOk = bc.amount >= bc.franco;
                  const francoPct = Math.min(100, (bc.amount / bc.franco) * 100);
                  return (
                    <tr key={bc.id} className="border-b border-line last:border-0 hover:bg-canvas-2/30 transition-colors group">
                      <td className="px-4 py-3">
                        <Link href={`/commandes/${bc.id}`} className="font-mono text-[12.5px] text-ink hover:text-violet font-medium">
                          {bc.number}
                        </Link>
                        <p className="ref mt-0.5">{bc.items} ligne{bc.items > 1 ? "s" : ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="text-ink font-medium">{bc.supplier}</p>
                          <span className={`text-[10px] font-mono font-semibold px-1.5 rounded bg-${langChip[bc.language].tone}-soft text-${langChip[bc.language].tone}-strong`}>
                            {bc.language}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/confections/d1`} className="font-mono text-[12px] text-violet hover:underline">
                          {bc.dossier}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-semibold text-ink tabular-nums">{eur(bc.amount, true)}</p>
                        <p className="ref">vs {eur(bc.franco, true)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-32 space-y-1">
                          <div className="flex items-center gap-1.5">
                            {francoOk ? (
                              <CheckCircle2 className="h-3 w-3 text-emerald" strokeWidth={2.4} />
                            ) : (
                              <AlertTriangle className="h-3 w-3 text-amber" strokeWidth={2.4} />
                            )}
                            <span className={`text-[10.5px] font-medium ${francoOk ? "text-emerald" : "text-amber"}`}>
                              {francoOk ? "Atteint" : `Manque ${eur(bc.franco - bc.amount, true)}`}
                            </span>
                          </div>
                          <div className="h-1 rounded-full bg-canvas-2 overflow-hidden">
                            <div
                              className={`h-full transition-all ${francoOk ? "bg-emerald" : "bg-amber"}`}
                              style={{ width: `${francoPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill tone={bcStatusTones[bc.status]}>
                          {bcStatusLabels[bc.status]}
                        </StatusPill>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {bc.status !== "brouillon" ? (
                          <p className="text-[12px] text-ink-3 tabular-nums">{shortDate(bc.createdAt)}</p>
                        ) : (
                          <span className="text-muted-2 text-[12px]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {bc.receivedAt ? (
                          <p className="text-[12px] text-emerald font-medium tabular-nums">{shortDate(bc.receivedAt)}</p>
                        ) : bc.expectedAt ? (
                          <p className="text-[12px] text-muted tabular-nums">est. {shortDate(bc.expectedAt)}</p>
                        ) : (
                          <span className="text-muted-2 text-[12px]">—</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-0.5">
                          <Button variant="ghost" size="icon-sm" aria-label="PDF">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" aria-label="Renvoyer">
                            <Mail className="h-3.5 w-3.5" />
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
          </div>
        </section>
      </div>
    </>
  );
}

function MiniStat({
  label,
  value,
  tone,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: "violet" | "emerald" | "amber" | "blue" | "pink";
  sub?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <Card className="p-4 flex items-start gap-3">
      <ColorChip tone={tone} size="md">
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </ColorChip>
      <div className="flex-1 min-w-0">
        <p className="text-[11.5px] text-muted-2 font-medium uppercase tracking-wider">
          {label}
        </p>
        <p className="text-[22px] font-semibold text-ink leading-tight tabular-nums mt-0.5">
          {value}
        </p>
        {sub && <p className="text-[11px] text-muted mt-0.5">{sub}</p>}
      </div>
    </Card>
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
          "inline-flex items-center gap-1 " + (sortable ? "cursor-pointer hover:text-ink-2" : "")
        }
      >
        {children}
        {sortable && <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </span>
    </th>
  );
}
