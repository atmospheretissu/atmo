import Link from "next/link";
import {
  Calendar,
  Filter,
  Plus,
  MoreHorizontal,
  AlertTriangle,
  TimerReset,
  Truck,
  Scissors,
  ArrowRight,
  PackageSearch,
  FileText,
  ScanLine,
  Wrench,
  Receipt,
  MapPin,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Sparkline } from "@/components/ui/sparkline";
import { DeltaBadge } from "@/components/ui/delta";
import { LetterAvatar, AvatarStack, toneFor } from "@/components/ui/letter-avatar";
import { eur, shortDate, relativeDate } from "@/lib/formatters";
import {
  devisList,
  alerts,
  channelLabels,
  statusLabels,
  statusTones,
} from "@/lib/mock-data";

export default function DashboardPage() {
  const recentDevis = devisList.slice(0, 5);
  const kpiSpark1 = [12, 14, 13, 18, 17, 22, 28, 26, 31, 35, 40, 47];
  const kpiSpark2 = [62, 60, 65, 64, 68, 72, 74, 71, 78, 82, 84, 84.2];
  const kpiSpark3 = [3, 5, 4, 7, 6, 5, 8, 9, 7, 6, 5, 5];
  const kpiSpark4 = [18, 20, 19, 22, 21, 23, 25, 23, 22, 24, 23, 23];

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Tableau de bord" },
        ]}
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Calendar className="h-3.5 w-3.5" strokeWidth={2.2} />
              7 derniers jours
            </Button>
            <Button variant="secondary" size="sm">
              <Filter className="h-3.5 w-3.5" strokeWidth={2.2} />
              Filtres
            </Button>
            <Link href="/devis/nouveau">
              <Button variant="primary" size="sm">
                <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
                Nouveau devis
              </Button>
            </Link>
          </>
        }
      />

      <div className="flex-1 overflow-auto">
        {/* HERO */}
        <section className="px-8 pt-10 pb-8">
          <p className="eyebrow mb-4">Bonjour Camille</p>
          <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1] mb-2">
            Votre chiffre d'affaires
          </h1>
          <p className="display-num text-[64px] gradient-text leading-[1.05]">
            {eur(84200, true)}
          </p>
          <div className="flex items-center gap-3 mt-3 text-[13px]">
            <DeltaBadge value="+8.2%" positive />
            <span className="text-muted">vs. 30 derniers jours · 23 commandes signées</span>
          </div>
        </section>

        {/* KPI Row */}
        <section className="px-8 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              label="Nouveaux devis"
              value="47"
              suffix="envoyés"
              delta="+12"
              positive
              spark={kpiSpark1}
              palette="violet"
              hint="vs. 35 période précédente"
            />
            <KpiCard
              label="CA commandes"
              value={eur(84200, true)}
              delta="+8,2%"
              positive
              spark={kpiSpark2}
              palette="orange"
              hint="dont 28% Leroy Merlin"
            />
            <KpiCard
              label="Acomptes en attente"
              value={eur(8430, true)}
              delta="5 devis"
              spark={kpiSpark3}
              palette="pink"
              hint="rappel auto J+2"
            />
            <KpiCard
              label="Dossiers actifs"
              value="23"
              delta="2 retards"
              spark={kpiSpark4}
              palette="emerald"
              hint="2 éléments en retard fournisseur"
            />
          </div>
        </section>

        {/* Flow strip */}
        <section className="px-8 pb-8">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="eyebrow mb-1">Flux des dossiers</p>
              <h2 className="text-[18px] font-semibold text-ink tracking-tight">Du devis à la pose</h2>
            </div>
            <Link href="/confections" className="text-[12.5px] text-violet hover:underline font-medium inline-flex items-center gap-1">
              Voir tous les dossiers <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <FlowStrip />
        </section>

        {/* Kanban — recent devis */}
        <section className="px-8 pb-8">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="eyebrow mb-1">Cycle de vie · 5 derniers</p>
              <h2 className="text-[18px] font-semibold text-ink tracking-tight">Devis récents</h2>
            </div>
            <Link href="/devis" className="text-[12.5px] text-violet hover:underline font-medium inline-flex items-center gap-1">
              Tous les devis <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KanbanColumn
              title="Envoyés"
              count={3}
              dotClass="bg-violet"
              cards={[
                {
                  product: "Stores bateau · Linder",
                  client: "M. Vasseur, Antoine",
                  city: "Mérignac",
                  total: 1548,
                  channel: "Leroy Merlin",
                  tone: "orange" as const,
                  avatars: [{ initial: "T", tone: "blue" as const }, { initial: "A", tone: "pink" as const }],
                  start: "Envoyé le 08 mai",
                  progress: 30,
                  barClass: "bg-violet",
                },
                {
                  product: "Stores enrouleurs Collection",
                  client: "M. Castellane, Pierre",
                  city: "Talence",
                  total: 822,
                  channel: "Leroy Merlin",
                  tone: "orange" as const,
                  avatars: [{ initial: "T", tone: "blue" as const }],
                  start: "Envoyé le 10 mai",
                  progress: 30,
                  barClass: "bg-violet",
                },
              ]}
            />
            <KanbanColumn
              title="En cours"
              count={2}
              dotClass="bg-amber"
              cards={[
                {
                  product: "Rideaux + voilage · Velours Mohair",
                  client: "M. Audebert, Jean-François",
                  city: "Cestas",
                  total: 4104,
                  channel: "Magasin",
                  tone: "violet" as const,
                  avatars: [
                    { initial: "C", tone: "purple" as const },
                    { initial: "B", tone: "pink" as const },
                    { initial: "R", tone: "green" as const },
                  ],
                  start: "Pose le 14 mai",
                  progress: 75,
                  barClass: "bg-amber",
                },
                {
                  product: "Rideaux Casamance Saumon",
                  client: "Mme Larochelle, Hélène",
                  city: "Bordeaux",
                  total: 3414,
                  channel: "Magasin",
                  tone: "violet" as const,
                  avatars: [
                    { initial: "C", tone: "purple" as const },
                    { initial: "B", tone: "pink" as const },
                  ],
                  start: "4/5 reçus · pose à planif.",
                  progress: 80,
                  barClass: "bg-amber",
                },
              ]}
            />
            <KanbanColumn
              title="Posés"
              count={1}
              dotClass="bg-emerald"
              cards={[
                {
                  product: "Recouvrement banquette + rideaux",
                  client: "Famille Rivière",
                  city: "Le Bouscat",
                  total: 5904,
                  channel: "Décoratrice",
                  tone: "pink" as const,
                  avatars: [
                    { initial: "C", tone: "purple" as const },
                    { initial: "K", tone: "blue" as const },
                  ],
                  start: "Posé le 06 mai",
                  progress: 100,
                  barClass: "bg-emerald",
                },
              ]}
            />
          </div>
        </section>

        {/* Lower row — Devis list + Alerts */}
        <section className="px-8 pb-10 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <div>
                <p className="eyebrow mb-1">Aujourd'hui</p>
                <h3 className="text-[16px] font-semibold text-ink tracking-tight">
                  Devis & paiements
                </h3>
              </div>
              <Link
                href="/devis"
                className="text-[12.5px] text-violet hover:underline font-medium inline-flex items-center gap-1"
              >
                Voir tout <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-line">
              {recentDevis.map((d) => {
                const nm = d.client.name;
                const initial = nm.includes(",")
                  ? (nm.split(",")[1].trim()[0] ?? nm[0])
                  : nm[0];
                return (
                  <Link
                    key={d.id}
                    href={`/devis/${d.id}`}
                    className="px-5 py-3.5 flex items-center gap-3 hover:bg-canvas-2/40 transition-colors group"
                  >
                    <LetterAvatar initial={initial} tone={toneFor(nm)} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[13.5px] font-semibold text-ink truncate">
                          {d.client.name}
                        </p>
                        <span className="ref shrink-0">{d.client.city}</span>
                      </div>
                      <p className="text-[12px] text-muted truncate">
                        {d.product} · {d.productDetail}
                      </p>
                    </div>
                    <div className="hidden md:flex flex-col items-end text-right">
                      <p className="font-semibold text-[14px] text-ink tabular-nums">
                        {eur(d.totalTTC, true)}
                      </p>
                      <p className="ref">{d.number}</p>
                    </div>
                    <StatusPill tone={statusTones[d.status]}>
                      {statusLabels[d.status]}
                    </StatusPill>
                  </Link>
                );
              })}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <div>
                <p className="eyebrow mb-1">Action requise</p>
                <h3 className="text-[16px] font-semibold text-ink tracking-tight">
                  Alertes
                </h3>
              </div>
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-pink text-white text-[11px] font-semibold">
                {alerts.length}
              </span>
            </div>
            <div className="divide-y divide-line">
              {alerts.map((a) => (
                <div key={a.id} className="px-5 py-3.5 space-y-1.5">
                  <div className="flex items-start gap-2.5">
                    <ColorChip
                      tone={a.severity === "danger" ? "pink" : a.severity === "warning" ? "amber" : "blue"}
                      size="sm"
                    >
                      {a.severity === "danger" && <AlertTriangle className="h-3 w-3" strokeWidth={2.4} />}
                      {a.severity === "warning" && <TimerReset className="h-3 w-3" strokeWidth={2.4} />}
                      {a.severity === "info" && <Truck className="h-3 w-3" strokeWidth={2.4} />}
                    </ColorChip>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-semibold text-ink leading-tight">
                        {a.title}
                      </p>
                      <p className="text-[11.5px] text-muted mt-1 leading-snug">
                        {a.detail}
                      </p>
                      <p className="ref mt-1.5">{relativeDate(a.date)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </>
  );
}

function KpiCard({
  label,
  value,
  suffix,
  delta,
  positive,
  spark,
  palette,
  hint,
}: {
  label: string;
  value: string;
  suffix?: string;
  delta: string;
  positive?: boolean;
  spark: number[];
  palette: "violet" | "orange" | "pink" | "emerald" | "blue";
  hint: string;
}) {
  return (
    <Card className="p-5 flex items-stretch justify-between gap-3">
      <div className="flex flex-col">
        <p className="text-[12.5px] text-muted-2 font-medium mb-2">{label}</p>
        <div className="flex items-baseline gap-2 mb-1">
          <p className="text-[26px] font-semibold text-ink tabular-nums leading-none tracking-tight">
            {value}
          </p>
          <DeltaBadge value={delta} positive={positive} />
        </div>
        {suffix && <p className="text-[11.5px] text-muted">{suffix}</p>}
        <p className="text-[11px] text-muted mt-auto pt-2">{hint}</p>
      </div>
      <Sparkline data={spark} palette={palette} width={120} height={56} />
    </Card>
  );
}

function FlowStrip() {
  const steps = [
    { label: "Devis", count: 12, tone: "violet" as const, icon: FileText, sub: "envoyés" },
    { label: "Acompte", count: 5, tone: "pink" as const, icon: Receipt, sub: "Stripe en attente" },
    { label: "Confection", count: 7, tone: "orange" as const, icon: Scissors, sub: "en cours" },
    { label: "Réception", count: 4, tone: "yellow" as const, icon: ScanLine, sub: "QR scannés" },
    { label: "Prêt", count: 3, tone: "blue" as const, icon: PackageSearch, sub: "à planifier" },
    { label: "Posé", count: 18, tone: "emerald" as const, icon: Wrench, sub: "30 derniers j." },
  ];
  return (
    <div className="card overflow-hidden p-1">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1">
        {steps.map((s, i) => {
          const last = i === steps.length - 1;
          return (
            <div
              key={s.label}
              className="relative p-4 rounded-xl hover:bg-canvas-2/60 transition-colors"
            >
              <ColorChip tone={s.tone} size="md" className="mb-3">
                <s.icon className="h-4 w-4" strokeWidth={2.2} />
              </ColorChip>
              <p className="text-[11px] font-semibold tracking-wider uppercase text-muted-2 mb-1">
                {i + 1}. {s.label}
              </p>
              <p className="text-[28px] font-semibold text-ink leading-none tabular-nums tracking-tight">
                {s.count}
              </p>
              <p className="text-[11.5px] text-muted mt-1">{s.sub}</p>

              {!last && (
                <svg
                  className="hidden lg:block absolute right-[-10px] top-1/2 -translate-y-1/2 z-10 text-line-strong"
                  width="20" height="20" viewBox="0 0 20 20" fill="none"
                >
                  <circle cx="10" cy="10" r="9" stroke="currentColor" fill="white" />
                  <path d="M8 6 L12 10 L8 14" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KanbanColumn({
  title,
  count,
  dotClass,
  cards,
}: {
  title: string;
  count: number;
  dotClass: string;
  cards: {
    product: string;
    client: string;
    city: string;
    total: number;
    channel: string;
    tone: "violet" | "pink" | "orange" | "blue" | "emerald";
    avatars: { initial: string; tone: "purple" | "pink" | "blue" | "green" | "yellow" | "orange" | "gray" }[];
    start: string;
    progress: number;
    barClass: string;
  }[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dotClass}`} />
          <h4 className="text-[13.5px] font-semibold text-ink">{title}</h4>
          <span className="text-[11.5px] text-muted-2 tabular-nums">{count}</span>
        </div>
        <button className="text-muted-2 hover:text-ink-2">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="space-y-3">
        {cards.map((c, i) => (
          <Card key={i} className="p-4 cursor-pointer hover:border-line-strong transition-colors">
            <div className="flex items-start justify-between gap-2 mb-3">
              <ColorChip tone={c.tone} size="md">
                <FileText className="h-4 w-4" strokeWidth={2.2} />
              </ColorChip>
              <AvatarStack items={c.avatars.map((a) => ({ initial: a.initial, tone: a.tone }))} />
            </div>
            <h5 className="text-[13.5px] font-semibold text-ink leading-tight mb-1">
              {c.product}
            </h5>
            <p className="text-[12px] text-muted mb-3 flex items-center gap-1.5">
              <span className="truncate">{c.client}</span>
              <span className="text-muted-2">·</span>
              <MapPin className="h-3 w-3 shrink-0" />
              <span>{c.city}</span>
            </p>

            <div className="space-y-1.5 mb-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-2">{c.start}</span>
                <span className="font-semibold text-ink-2 tabular-nums">{c.progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-canvas-2 overflow-hidden">
                <div className={`h-full ${c.barClass} transition-all`} style={{ width: `${c.progress}%` }} />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-line">
              <span className="text-[11px] text-muted">{c.channel}</span>
              <span className="text-[13.5px] font-semibold text-ink tabular-nums">
                {eur(c.total, true)}
              </span>
            </div>
          </Card>
        ))}
        <button className="w-full text-[12.5px] text-muted hover:text-ink py-2.5 inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-line hover:border-line-strong transition-colors">
          <Plus className="h-3.5 w-3.5" /> Ajouter
        </button>
      </div>
    </div>
  );
}
