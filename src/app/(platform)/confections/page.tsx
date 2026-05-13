"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Plus,
  Filter,
  MoreHorizontal,
  AlertTriangle,
  Scissors,
  ArrowRight,
  Search,
  LayoutGrid,
  ListIcon,
  Calendar,
  Truck,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LetterAvatar, AvatarStack, toneFor } from "@/components/ui/letter-avatar";
import {
  dossiers,
  dossierStatusLabels,
  dossierStatusTones,
  Dossier,
} from "@/lib/mock-data";
import { eur, shortDate } from "@/lib/formatters";

const columns: { key: Dossier["status"]; label: string; tone: "muted" | "blue" | "amber" | "violet" | "emerald" | "pink" | "neutral"; dot: string }[] = [
  { key: "en_cours", label: "En commande", tone: "muted", dot: "bg-muted-2" },
  { key: "tout_commande", label: "Tout commandé", tone: "blue", dot: "bg-blue" },
  { key: "reception_partielle", label: "Réception partielle", tone: "amber", dot: "bg-amber" },
  { key: "en_confection", label: "En confection", tone: "violet", dot: "bg-violet" },
  { key: "pret_pose", label: "Prêt pour pose", tone: "emerald", dot: "bg-emerald" },
  { key: "pose", label: "Posé / Livré", tone: "neutral", dot: "bg-muted-2" },
];

export default function ConfectionsPage() {
  const [view, setView] = useState<"kanban" | "list">("kanban");

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Confections" },
        ]}
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Filter className="h-3.5 w-3.5" strokeWidth={2.2} /> Filtres
            </Button>
            <Button variant="primary" size="sm">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Nouveau dossier
            </Button>
          </>
        }
      />

      <div className="flex-1 overflow-auto">
        {/* HERO */}
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Module 2 · Suivi des Confections</p>
          <div className="flex items-end justify-between gap-8 flex-wrap mb-2">
            <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1]">
              Dossiers d'atelier
              <span className="ml-3 text-[24px] text-muted-2 font-semibold tabular-nums">
                {dossiers.length}
              </span>
            </h1>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-line bg-white p-0.5">
                <button
                  onClick={() => setView("kanban")}
                  className={
                    "h-7 px-2.5 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors " +
                    (view === "kanban" ? "bg-canvas-2 text-ink" : "text-muted hover:text-ink")
                  }
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Kanban
                </button>
                <button
                  onClick={() => setView("list")}
                  className={
                    "h-7 px-2.5 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors " +
                    (view === "list" ? "bg-canvas-2 text-ink" : "text-muted hover:text-ink")
                  }
                >
                  <ListIcon className="h-3.5 w-3.5" /> Liste
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2" strokeWidth={2.2} />
                <Input
                  placeholder="Client, dossier…"
                  className="pl-9 w-60 text-[12.5px] rounded-full bg-white"
                />
              </div>
            </div>
          </div>
          <p className="text-[13.5px] text-muted max-w-2xl">
            Chaque dossier regroupe tous les éléments à recevoir (tissu, rail, accessoires, confection).
            <strong className="text-ink font-medium"> Pose débloquée uniquement quand X/N éléments reçus + solde réglé.</strong>
          </p>
        </section>

        {/* KPI strip */}
        <section className="px-8 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="Total dossiers" value={dossiers.length.toString()} tone="violet" icon={Scissors} />
            <MiniStat label="En confection" value="2" tone="violet" sub="Brigitte M. + Atelier" icon={Scissors} />
            <MiniStat label="Prêts pour pose" value="1" tone="emerald" sub="à planifier" icon={Truck} />
            <MiniStat label="Avec retards" value="2" tone="amber" sub="éléments manquants" icon={AlertTriangle} />
          </div>
        </section>

        {view === "kanban" ? <KanbanView /> : <ListView />}
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
  tone: "violet" | "emerald" | "amber" | "blue";
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

function KanbanView() {
  return (
    <section className="px-8 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {columns.map((col) => {
          const items = dossiers.filter((d) => d.status === col.key);
          return (
            <div key={col.key} className="space-y-2.5 min-w-0">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${col.dot}`} />
                  <h3 className="text-[13px] font-semibold text-ink truncate">{col.label}</h3>
                  <span className="text-[11.5px] text-muted-2 tabular-nums">{items.length}</span>
                </div>
                <button className="text-muted-2 hover:text-ink-2 shrink-0">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-2.5">
                {items.map((d) => (
                  <DossierCard key={d.id} dossier={d} />
                ))}
                {items.length === 0 && (
                  <div className="text-[11.5px] text-muted-2 text-center py-3 border border-dashed border-line rounded-xl">
                    —
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DossierCard({ dossier: d }: { dossier: Dossier }) {
  const initial = d.client.includes(",")
    ? (d.client.split(",")[1].trim()[0] ?? d.client[0])
    : d.client[0];
  const progress = d.itemsTotal > 0 ? (d.itemsReceived / d.itemsTotal) * 100 : 0;
  const alerteSolde = !d.soldeRegle && d.itemsReceived === d.itemsTotal && d.itemsTotal > 0;

  return (
    <Link href={`/confections/${d.id}`}>
      <Card className="p-3.5 cursor-pointer hover:border-line-strong transition-colors">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <LetterAvatar initial={initial} tone={toneFor(d.client)} size="md" />
          <button
            className="text-muted-2 hover:text-ink-2"
            onClick={(e) => e.preventDefault()}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>

        <p className="text-[12.5px] font-semibold text-ink leading-tight truncate">
          {d.client}
        </p>
        <p className="text-[11px] text-muted mt-0.5 truncate">{d.city}</p>
        <p className="ref mt-1.5">{d.number}</p>

        {/* X/N éléments — signature visual */}
        {d.itemsTotal > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted">Éléments reçus</span>
              <span className="font-semibold text-ink-2 tabular-nums">
                {d.itemsReceived}/{d.itemsTotal}
              </span>
            </div>
            <div className="flex gap-0.5 h-1.5">
              {Array.from({ length: d.itemsTotal }).map((_, i) => (
                <span
                  key={i}
                  className={
                    "flex-1 rounded-full " +
                    (i < d.itemsReceived ? "bg-emerald" : "bg-canvas-2 border border-line")
                  }
                />
              ))}
            </div>
          </div>
        )}

        {alerteSolde && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-soft text-red text-[10.5px] font-semibold">
            <AlertTriangle className="h-3 w-3" strokeWidth={2.4} />
            Solde dû
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-line">
          {d.scheduledFor ? (
            <span className="text-[10.5px] text-emerald font-medium inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {shortDate(d.scheduledFor)}
            </span>
          ) : (
            <span className="text-[10.5px] text-muted">{d.itemsTotal === 0 ? "—" : ""}</span>
          )}
          <span className="text-[12px] font-semibold text-ink tabular-nums">
            {eur(d.totalTTC, true)}
          </span>
        </div>
      </Card>
    </Link>
  );
}

function ListView() {
  return (
    <section className="px-8 pb-10">
      <div className="bg-white border border-line rounded-2xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-canvas-2/40 border-b border-line">
              <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">Dossier</th>
              <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">Client</th>
              <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">Statut</th>
              <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">Éléments</th>
              <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">Total</th>
              <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">Pose</th>
            </tr>
          </thead>
          <tbody>
            {dossiers.map((d) => {
              const initial = d.client.includes(",")
                ? (d.client.split(",")[1].trim()[0] ?? d.client[0])
                : d.client[0];
              return (
                <tr key={d.id} className="border-b border-line last:border-0 hover:bg-canvas-2/40 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/confections/${d.id}`} className="font-mono text-[12.5px] text-ink hover:text-violet font-medium">
                      {d.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <LetterAvatar initial={initial} tone={toneFor(d.client)} size="sm" />
                      <div>
                        <p className="font-semibold text-ink leading-tight">{d.client}</p>
                        <p className="ref mt-0.5">{d.city}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill tone={dossierStatusTones[d.status]}>
                      {dossierStatusLabels[d.status]}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-3">
                    {d.itemsTotal > 0 ? (
                      <div className="space-y-1 w-40">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted">{d.itemsReceived}/{d.itemsTotal} reçus</span>
                        </div>
                        <div className="flex gap-0.5 h-1.5">
                          {Array.from({ length: d.itemsTotal }).map((_, i) => (
                            <span
                              key={i}
                              className={
                                "flex-1 rounded-full " +
                                (i < d.itemsReceived ? "bg-emerald" : "bg-canvas-2 border border-line")
                              }
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-2 text-[12px]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-semibold text-ink tabular-nums">{eur(d.totalTTC, true)}</p>
                    {!d.soldeRegle && d.itemsReceived === d.itemsTotal && d.itemsTotal > 0 && (
                      <p className="text-[10.5px] text-red font-medium mt-0.5">Solde dû</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {d.scheduledFor ? (
                      <span className="text-[12px] text-emerald font-medium">
                        {shortDate(d.scheduledFor)}
                      </span>
                    ) : (
                      <span className="text-muted-2 text-[12px]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
