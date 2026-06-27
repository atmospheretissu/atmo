"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Plus,
  Filter,
  AlertTriangle,
  Scissors,
  Truck,
  LayoutGrid,
  List,
  Eye,
  Package,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import type { DossierWithClient } from "@/lib/db/dossiers";
import type { DevisWithClient } from "@/lib/db/devis";
import { eur, shortDate } from "@/lib/formatters";

import { KANBAN_ORDER, STATUS_META, statusLabel, statusTone, ageInStatus } from "@/lib/workflow/statuses";

const columns = KANBAN_ORDER.map((key) => ({
  key,
  label: STATUS_META[key].shortLabel,
  tone: STATUS_META[key].tone,
  dot: STATUS_META[key].dot,
}));

export default function ConfectionsClient({
  dossiers,
  pendingDevis = [],
}: {
  dossiers: DossierWithClient[];
  pendingDevis?: DevisWithClient[];
}) {
  const [view, setView] = useState<"kanban" | "liste">("kanban");

  const enConfection = dossiers.filter((d) => d.status === "en_confection").length;
  const pretsPose = dossiers.filter((d) => d.status === "pret_pose").length;
  const avecRetards = dossiers.filter((d) => {
    const ageDays = (Date.now() - new Date(d.created_at).getTime()) / 86400000;
    return ageDays > 14 && d.itemsReceived < d.itemsTotal;
  }).length;

  return (
    <>
      <Topbar
        breadcrumb={[{ label: "Atmosphère" }, { label: "Suivi de commande" }]}
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Module 2 · Suivi des Confections</p>
          <div className="flex items-end justify-between gap-8 flex-wrap mb-2">
            <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1]">
              Dossiers d&apos;atelier
              <span className="ml-3 text-[24px] text-muted-2 font-semibold tabular-nums">
                {dossiers.length}
              </span>
            </h1>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <Button variant="secondary" size="sm">
                <Filter className="h-3.5 w-3.5" strokeWidth={2.2} /> Filtres
              </Button>
            </div>
          </div>
          <p className="text-[13.5px] text-muted max-w-2xl">
            Créés automatiquement à la validation d&apos;un devis avec confection. Une fiche PDF
            destinée aux couturières est générée pour chaque dossier.
          </p>
        </section>

        <section className="px-8 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="Total dossiers" value={dossiers.length.toString()} tone="violet" icon={Scissors} />
            <MiniStat label="En confection" value={String(enConfection)} tone="violet" sub="couturières assignées" icon={Scissors} />
            <MiniStat label="Prêts pour pose" value={String(pretsPose)} tone="emerald" sub="à planifier" icon={Truck} />
            <MiniStat label="Avec retards" value={String(avecRetards)} tone="amber" sub="14j+" icon={AlertTriangle} />
          </div>
        </section>

        {dossiers.length === 0 && pendingDevis.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <section className="px-8 pb-4">
              <div className="inline-flex items-center gap-0.5 p-1 bg-canvas-2/60 border border-line rounded-lg">
                <ViewToggleBtn
                  active={view === "kanban"}
                  onClick={() => setView("kanban")}
                  icon={LayoutGrid}
                  label="Kanban"
                />
                <ViewToggleBtn
                  active={view === "liste"}
                  onClick={() => setView("liste")}
                  icon={List}
                  label="Liste"
                />
              </div>
            </section>

            {view === "kanban" ? (
              <KanbanView dossiers={dossiers} pendingDevis={pendingDevis} />
            ) : (
              <ListView dossiers={dossiers} />
            )}
          </>
        )}
      </div>
    </>
  );
}

function ViewToggleBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-[12.5px] font-medium transition-colors " +
        (active ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink")
      }
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
      {label}
    </button>
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
        <p className="text-[11.5px] text-muted-2 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-[20px] font-semibold text-ink leading-tight tabular-nums mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-muted mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

function EmptyState() {
  return (
    <section className="px-8 pb-16">
      <Card className="py-16 px-6 flex flex-col items-center text-center">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet to-pink text-white inline-flex items-center justify-center mb-4">
          <Scissors className="h-6 w-6" strokeWidth={2} />
        </div>
        <h2 className="text-[18px] font-semibold text-ink mb-1">
          Aucun dossier pour l&apos;instant
        </h2>
        <p className="text-[13.5px] text-muted max-w-md mb-6 leading-relaxed">
          Les dossiers de confection sont créés automatiquement à la validation d&apos;un devis
          contenant un article de confection.
        </p>
        <Link href="/boutique/nouveau">
          <Button variant="primary" size="md">
            <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
            Démarrer un devis
          </Button>
        </Link>
      </Card>
    </section>
  );
}

/* -------------------------------- KANBAN -------------------------------- */

function KanbanView({
  dossiers,
  pendingDevis,
}: {
  dossiers: DossierWithClient[];
  pendingDevis: DevisWithClient[];
}) {
  return (
    <section className="px-8 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3">
        {/* Colonne d'entrée : devis envoyés / brouillons sans dossier */}
        <div className="space-y-2.5 min-w-0">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2 w-2 rounded-full shrink-0 bg-blue" />
              <h3 className="text-[13px] font-semibold text-ink truncate">Devis &amp; commandes</h3>
              <span className="text-[11.5px] text-muted-2 tabular-nums">{pendingDevis.length}</span>
            </div>
          </div>
          <div className="space-y-2.5">
            {pendingDevis.map((d) => (
              <DevisCard key={d.id} devis={d} />
            ))}
            {pendingDevis.length === 0 && (
              <div className="text-[11.5px] text-muted-2 text-center py-3 border border-dashed border-line rounded-xl">
                —
              </div>
            )}
          </div>
        </div>

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

function DevisCard({ devis }: { devis: DevisWithClient }) {
  const name = devis.client?.display_name ?? "—";
  const initial = name.includes(",") ? (name.split(",")[1].trim()[0] ?? name[0]) : name[0];
  const statusLabel =
    devis.status === "brouillon" ? "Brouillon" : devis.status === "envoye" ? "Envoyé" : "Validé";
  const statusTone =
    devis.status === "brouillon" ? "amber" : devis.status === "envoye" ? "pink" : "blue";
  return (
    <Link href={`/devis/${devis.id}`}>
      <Card className="p-3.5 cursor-pointer hover:border-line-strong transition-colors">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <LetterAvatar initial={initial} tone={toneFor(name)} size="md" />
          <StatusPill tone={statusTone} dot>{statusLabel}</StatusPill>
        </div>
        <p className="text-[12.5px] font-semibold text-ink leading-tight truncate">{name}</p>
        {devis.client?.city && (
          <p className="text-[11px] text-muted mt-0.5 truncate">{devis.client.city}</p>
        )}
        <p className="ref mt-1.5">{devis.number}</p>
        <p className="text-[11.5px] text-ink-2 font-semibold tabular-nums mt-1.5">
          {eur(Number(devis.total_ttc ?? 0), true)} TTC
        </p>
      </Card>
    </Link>
  );
}

function DossierCard({ dossier }: { dossier: DossierWithClient }) {
  const router = useRouter();
  const name = dossier.client?.display_name ?? "—";
  const initial = name.includes(",") ? (name.split(",")[1].trim()[0] ?? name[0]) : name[0];
  const alerteSolde = !dossier.solde_paid && dossier.itemsReceived === dossier.itemsTotal && dossier.itemsTotal > 0;
  // Alerte temps : >10j en attente matière, >12j en confection
  const age = ageInStatus(dossier.status, dossier as never);
  const isOverdue = age?.isOverdue ?? false;

  // En colonne Commande (commande_validee), on emmène direct vers
  // l'interface "Commande fournisseur" (préparation + envoi des BCs).
  // Pour les autres statuts, vers la fiche confection.
  const targetHref =
    dossier.status === "commande_validee" && dossier.devis_id
      ? `/commandes/from-devis/${dossier.devis_id}`
      : `/confections/${dossier.id}`;
  return (
    <Link href={targetHref}>
      <Card className="p-3.5 cursor-pointer hover:border-line-strong transition-colors">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <LetterAvatar initial={initial} tone={toneFor(name)} size="md" />
        </div>

        <p className="text-[12.5px] font-semibold text-ink leading-tight truncate">{name}</p>
        {dossier.client?.city && (
          <p className="text-[11px] text-muted mt-0.5 truncate">{dossier.client.city}</p>
        )}
        <p className="ref mt-1.5">{dossier.number}</p>

        {dossier.itemsTotal > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted">Éléments reçus</span>
              <span className="font-semibold text-ink-2 tabular-nums">
                {dossier.itemsReceived}/{dossier.itemsTotal}
              </span>
            </div>
            <div className="flex gap-0.5 h-1.5">
              {Array.from({ length: dossier.itemsTotal }).map((_, i) => (
                <span
                  key={i}
                  className={
                    "flex-1 rounded-full " +
                    (i < dossier.itemsReceived ? "bg-emerald" : "bg-canvas-2 border border-line")
                  }
                />
              ))}
            </div>
          </div>
        )}

        {!dossier.acompte_paid && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-soft text-amber text-[10.5px] font-semibold">
            <AlertTriangle className="h-3 w-3" strokeWidth={2.4} />
            En attente acompte
          </div>
        )}

        {alerteSolde && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-soft text-red text-[10.5px] font-semibold">
            <AlertTriangle className="h-3 w-3" strokeWidth={2.4} />
            Solde dû
          </div>
        )}

        {isOverdue && age && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-pink-soft text-pink text-[10.5px] font-semibold">
            <AlertTriangle className="h-3 w-3" strokeWidth={2.4} />
            En retard · {age.days}j (seuil {age.threshold}j)
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-line">
          <span className="text-[10.5px] text-muted">{shortDate(new Date(dossier.created_at))}</span>
          <span className="text-[12px] font-semibold text-ink tabular-nums">
            {eur(Number(dossier.total_ttc), true)}
          </span>
        </div>

        {dossier.status === "commande_validee" && dossier.devis_id && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push(`/commandes/from-devis/${dossier.devis_id}`);
            }}
            className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-ink text-white text-[11.5px] font-semibold hover:bg-ink/90 transition-colors"
          >
            <Package className="h-3 w-3" strokeWidth={2.4} />
            Générer les bons de commande
          </button>
        )}
      </Card>
    </Link>
  );
}

/* --------------------------------- LISTE -------------------------------- */

function ListView({ dossiers }: { dossiers: DossierWithClient[] }) {
  return (
    <section className="px-8 pb-10">
      <div className="bg-white border border-line rounded-2xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-canvas-2/40 border-b border-line">
              <Th>Dossier</Th>
              <Th>Client</Th>
              <Th>Statut</Th>
              <Th align="right">Éléments</Th>
              <Th align="right">Acompte</Th>
              <Th align="right">Total TTC</Th>
              <Th align="right">Créé</Th>
              <th className="w-10 px-4 py-2.5" aria-hidden></th>
            </tr>
          </thead>
          <tbody>
            {dossiers.map((d) => {
              const name = d.client?.display_name ?? "Client inconnu";
              const initial = name.includes(",") ? (name.split(",")[1].trim()[0] ?? name[0]) : name[0];
              const status = d.status;
              const alerteSolde = !d.solde_paid && d.itemsReceived === d.itemsTotal && d.itemsTotal > 0;
              return (
                <tr key={d.id} className="border-b border-line last:border-0 hover:bg-canvas-2/30 transition-colors group">
                  <td className="px-4 py-3">
                    <Link href={`/confections/${d.id}`} className="font-mono text-[12.5px] text-ink hover:text-violet font-medium">
                      {d.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/confections/${d.id}`} className="flex items-center gap-2.5">
                      <LetterAvatar initial={initial} tone={toneFor(name)} size="sm" />
                      <div className="min-w-0">
                        <p className="font-semibold text-ink leading-tight truncate">{name}</p>
                        <p className="ref mt-0.5">{d.client?.city ?? "—"}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill tone={statusTone(status)}>
                      {statusLabel(status)}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-semibold text-ink-2 tabular-nums text-[12.5px]">
                      {d.itemsReceived}/{d.itemsTotal}
                    </p>
                    {d.itemsTotal > 0 && (
                      <div className="mt-1 flex gap-0.5 h-1 justify-end">
                        {Array.from({ length: Math.min(d.itemsTotal, 8) }).map((_, i) => (
                          <span
                            key={i}
                            className={
                              "w-2 rounded-full " +
                              (i < d.itemsReceived ? "bg-emerald" : "bg-canvas-2 border border-line")
                            }
                          />
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {d.acompte_paid ? (
                      <StatusPill tone="emerald" dot={false}>Reçu</StatusPill>
                    ) : (
                      <StatusPill tone="amber" dot={false}>En attente</StatusPill>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-semibold text-ink tabular-nums">
                      {eur(Number(d.total_ttc ?? 0), true)}
                    </p>
                    {alerteSolde && (
                      <p className="text-[10.5px] text-red font-semibold mt-0.5">Solde dû</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-[12px] text-ink-3 tabular-nums">
                      {shortDate(new Date(d.created_at))}
                    </p>
                  </td>
                  <td className="px-2 py-3 text-right">
                    <Link href={`/confections/${d.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-2 hover:text-ink hover:bg-canvas-2">
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
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
