import Link from "next/link";
import {
  Plus,
  ArrowRight,
  AlertTriangle,
  TimerReset,
  Truck,
  FileText,
  Scissors,
  Receipt,
  PackageSearch,
  Wrench,
  Sparkles,
  TrendingUp,
  Send,
  Clock,
  Wallet,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { ColorChip, StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import { eur } from "@/lib/formatters";
import {
  getDashboardStats,
  getDashboardAlerts,
  getRecentDevis,
  type PeriodKey,
} from "@/lib/db/dashboard";
import {
  devisStatusLabels,
  devisStatusTones,
  type DevisStatus,
} from "@/lib/validation/devis";
import {
  KANBAN_ORDER,
  STATUS_META,
  type StatusMeta,
  type WorkflowStatus,
} from "@/lib/workflow/statuses";
import type { ChipTone } from "@/components/ui/status-pill";

function toChipTone(t: StatusMeta["tone"]): ChipTone {
  if (t === "muted" || t === "neutral") return "ink";
  return t;
}

export const dynamic = "force-dynamic";

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "day", label: "Aujourd'hui" },
  { key: "week", label: "Semaine" },
  { key: "month", label: "Mois" },
  { key: "year", label: "Année" },
  { key: "all", label: "Tout" },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const periodKey = typeof sp.period === "string" ? sp.period : "month";

  const [stats, alerts, recentDevis] = await Promise.all([
    getDashboardStats(periodKey),
    getDashboardAlerts(),
    getRecentDevis(5),
  ]);

  const todayLong = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Tableau de bord" },
        ]}
        actions={
          <>
            <PeriodSelector current={stats.period.key} />
            <Link href="/devis/nouveau">
              <Button variant="secondary" size="sm">
                <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Devis rapide
              </Button>
            </Link>
            <Link href="/boutique/nouveau">
              <Button variant="primary" size="sm">
                <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Devis boutique
              </Button>
            </Link>
          </>
        }
      />

      <div className="flex-1 overflow-auto">
        {/* HERO */}
        <section className="px-8 pt-10 pb-8">
          <p className="eyebrow mb-2 capitalize">{todayLong}</p>
          <h1 className="text-[32px] font-semibold tracking-tight text-ink leading-[1.1] mb-1">
            Bonjour 👋
          </h1>
          <p className="text-[40px] font-semibold tracking-tight text-ink mb-1">
            Chiffre d'affaires{" "}
            <span className="display-num gradient-text">{eur(stats.caTotal, true)}</span>
          </p>
          <p className="text-[13.5px] text-muted">
            {stats.period.label.toLowerCase()} · {stats.counts.devis} devis ·{" "}
            {stats.counts.dossiers} dossier{stats.counts.dossiers > 1 ? "s" : ""} ·{" "}
            {stats.counts.clients} client{stats.counts.clients > 1 ? "s" : ""}
          </p>
        </section>

        {/* KPI Row */}
        <section className="px-8 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              label="Devis envoyés"
              value={eur(stats.devisSentAmount, true)}
              sub={`${stats.devisSentCount} sur ${stats.period.label.toLowerCase()}`}
              tone="violet"
              icon={Send}
            />
            <KpiCard
              label="Commandes en cours"
              value={eur(stats.commandesActiveAmount, true)}
              sub={`${stats.commandesActiveCount} dossier${stats.commandesActiveCount > 1 ? "s" : ""} actif${stats.commandesActiveCount > 1 ? "s" : ""}`}
              tone="orange"
              icon={Scissors}
            />
            <KpiCard
              label="Taux de transformation"
              value={`${stats.taux.pct}%`}
              sub={`${stats.taux.converted} / ${stats.taux.total} devis convertis`}
              tone="emerald"
              icon={TrendingUp}
            />
            <KpiCard
              label="Devis en attente"
              value={eur(stats.devisPendingAmount, true)}
              sub={`${stats.devisPendingCount} en attente de validation`}
              tone="pink"
              icon={Clock}
            />
          </div>
        </section>

        {/* Flow */}
        <section className="px-8 pb-8">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="eyebrow mb-1">Flux des dossiers</p>
              <h2 className="text-[18px] font-semibold text-ink tracking-tight">
                Du devis à la pose
              </h2>
            </div>
            <Link
              href="/confections"
              className="text-[12.5px] text-violet hover:underline font-medium inline-flex items-center gap-1"
            >
              Voir tous les dossiers <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <FlowStrip
            flowByStatus={stats.flowByStatus}
            flowAmountByStatus={stats.flowAmountByStatus}
          />
        </section>

        {/* Lower row — Devis + Alerts */}
        <section className="px-8 pb-10 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <div>
                <p className="eyebrow mb-1">Récents</p>
                <h3 className="text-[16px] font-semibold text-ink tracking-tight">
                  Derniers devis
                </h3>
              </div>
              <Link
                href="/devis"
                className="text-[12.5px] text-violet hover:underline font-medium inline-flex items-center gap-1"
              >
                Voir tout <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {recentDevis.length === 0 ? (
              <div className="px-5 py-10 text-center text-[13px] text-muted-2">
                Aucun devis pour l'instant.{" "}
                <Link href="/devis/nouveau" className="text-violet hover:underline font-medium">
                  Créer le premier →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {recentDevis.map((d) => {
                  const name = d.client?.display_name ?? "—";
                  const initial = name.includes(",")
                    ? (name.split(",")[1].trim()[0] ?? name[0])
                    : name[0];
                  return (
                    <Link
                      key={d.id}
                      href={`/devis/${d.id}`}
                      className="px-5 py-3.5 flex items-center gap-3 hover:bg-canvas-2/40 transition-colors group"
                    >
                      <LetterAvatar initial={initial} tone={toneFor(name)} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-[13.5px] font-semibold text-ink truncate">{name}</p>
                          {d.client?.city && (
                            <span className="ref shrink-0">{d.client.city}</span>
                          )}
                        </div>
                        <p className="text-[12px] text-muted truncate">
                          {d.product_summary}
                          {d.product_detail && (
                            <span className="text-muted-2"> · {d.product_detail}</span>
                          )}
                        </p>
                      </div>
                      <div className="hidden md:block text-right shrink-0">
                        <p className="font-semibold text-[14px] text-ink tabular-nums">
                          {eur(Number(d.total_ttc ?? 0), true)}
                        </p>
                        <p className="ref">{d.number}</p>
                      </div>
                      <StatusPill tone={devisStatusTones[d.status as DevisStatus]}>
                        {devisStatusLabels[d.status as DevisStatus]}
                      </StatusPill>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <div>
                <p className="eyebrow mb-1">Action requise</p>
                <h3 className="text-[16px] font-semibold text-ink tracking-tight">Alertes</h3>
              </div>
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-pink text-white text-[11px] font-semibold">
                {alerts.length}
              </span>
            </div>
            {alerts.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Sparkles className="h-7 w-7 text-emerald mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-[13px] text-ink-2 font-medium">Tout est sous contrôle</p>
                <p className="text-[11.5px] text-muted-2 mt-1">Aucune alerte active.</p>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {alerts.map((a) => (
                  <Link
                    key={a.id}
                    href={a.href}
                    className="px-5 py-3.5 block hover:bg-canvas-2/40 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <ColorChip tone={a.kind === "danger" ? "pink" : a.kind === "warning" ? "amber" : "blue"} size="sm">
                        {a.kind === "danger" && <AlertTriangle className="h-3 w-3" strokeWidth={2.4} />}
                        {a.kind === "warning" && <TimerReset className="h-3 w-3" strokeWidth={2.4} />}
                        {a.kind === "info" && <Truck className="h-3 w-3" strokeWidth={2.4} />}
                      </ColorChip>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-semibold text-ink leading-tight">
                          {a.title}
                        </p>
                        <p className="text-[11.5px] text-muted mt-1 leading-snug">{a.detail}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </section>
      </div>
    </>
  );
}

function PeriodSelector({ current }: { current: PeriodKey }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-line bg-canvas-2/40 p-0.5">
      {PERIOD_OPTIONS.map((opt) => {
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
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "violet" | "orange" | "pink" | "emerald";
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <Card className="p-5 flex items-start gap-3">
      <ColorChip tone={tone} size="md">
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </ColorChip>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] text-muted-2 font-medium mb-1.5">{label}</p>
        <p className="text-[22px] font-semibold text-ink leading-none tabular-nums tracking-tight truncate">
          {value}
        </p>
        <p className="text-[11px] text-muted mt-2">{sub}</p>
      </div>
    </Card>
  );
}

const FLOW_ICONS: Partial<Record<WorkflowStatus, React.ComponentType<{ className?: string; strokeWidth?: number }>>> = {
  commande_validee: Receipt,
  attente_matiere: Truck,
  confection_en_cours: Scissors,
  pret_pose: PackageSearch,
  pose_a_planifier: Wallet,
  pose_a_venir: Wrench,
  cloture: FileText,
  sav: AlertTriangle,
};

function FlowStrip({
  flowByStatus,
  flowAmountByStatus,
}: {
  flowByStatus: Record<WorkflowStatus, number>;
  flowAmountByStatus: Record<WorkflowStatus, number>;
}) {
  const linear = KANBAN_ORDER.filter((s) => s !== "sav");
  const savCount = flowByStatus.sav ?? 0;

  return (
    <div className="space-y-3">
      <div className="card overflow-hidden p-1">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1">
          {linear.map((status, i) => {
            const meta = STATUS_META[status];
            const count = flowByStatus[status] ?? 0;
            const amount = flowAmountByStatus[status] ?? 0;
            const Icon = FLOW_ICONS[status] ?? FileText;
            const last = i === linear.length - 1;
            return (
              <Link
                key={status}
                href="/confections"
                className="relative p-4 rounded-xl hover:bg-canvas-2/60 transition-colors block"
              >
                <ColorChip tone={toChipTone(meta.tone)} size="md" className="mb-3">
                  <Icon className="h-4 w-4" strokeWidth={2.2} />
                </ColorChip>
                <p className="text-[11px] font-semibold tracking-wider uppercase text-muted-2 mb-1">
                  {i + 1}. {meta.shortLabel}
                </p>
                <p className="text-[26px] font-semibold text-ink leading-none tabular-nums tracking-tight">
                  {count}
                </p>
                <p className="text-[11px] text-muted mt-1 tabular-nums">
                  {amount > 0 ? eur(amount, true) : "—"}
                </p>

                {!last && (
                  <svg
                    className="hidden lg:block absolute right-[-10px] top-1/2 -translate-y-1/2 z-10 text-line-strong"
                    width="20" height="20" viewBox="0 0 20 20" fill="none"
                  >
                    <circle cx="10" cy="10" r="9" stroke="currentColor" fill="white" />
                    <path d="M8 6 L12 10 L8 14" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {savCount > 0 && (
        <Link
          href="/confections"
          className="card flex items-center gap-3 px-4 py-3 hover:bg-canvas-2/60 transition-colors"
        >
          <ColorChip tone="yellow" size="md">
            <AlertTriangle className="h-4 w-4" strokeWidth={2.2} />
          </ColorChip>
          <div className="flex-1">
            <p className="text-[12px] font-semibold tracking-wider uppercase text-muted-2 mb-0.5">
              Service après-vente
            </p>
            <p className="text-[13.5px] text-ink">
              <span className="font-semibold tabular-nums">{savCount}</span> dossier{savCount > 1 ? "s" : ""} en SAV
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-2" />
        </Link>
      )}
    </div>
  );
}
