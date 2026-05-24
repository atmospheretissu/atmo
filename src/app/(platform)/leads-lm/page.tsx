import {
  Inbox,
  Activity,
  CheckCircle2,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { ColorChip, StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { eur } from "@/lib/formatters";
import { listLmLeads, getLmLeadStats, getLastAtmoleadRun } from "@/lib/db/lm-leads";
import { processPendingLmLeadAlerts } from "@/lib/events/process-pending";
import { LmLeadsTable } from "@/components/lm-leads/lm-leads-table";
import { AtmoleadTabs } from "@/components/lm-leads/atmolead-tabs";

export const dynamic = "force-dynamic";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60_000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.round(h / 24);
  return `il y a ${d}j`;
}

export default async function LeadsLmPage() {
  // Fire-and-forget : déclenche les alertes des leads non traités.
  // On n'attend pas — la page se charge immédiatement, le batch tourne en
  // arrière-plan. Les alertes apparaîtront dans /feed dès qu'envoyées.
  void processPendingLmLeadAlerts({ batchSize: 25 }).catch((err) =>
    console.warn("[leads-lm page] process pending failed:", err),
  );

  const [leads, stats, lastRun] = await Promise.all([
    listLmLeads(),
    getLmLeadStats(),
    getLastAtmoleadRun(),
  ]);

  const conversionRate =
    stats.total > 0 ? Math.round((stats.byStatus.valide / stats.total) * 100) : 0;
  const inProgress =
    stats.byStatus.visio_planifie +
    stats.byStatus.echantillons +
    stats.byStatus.devis_envoye;

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Leads Leroy Merlin" },
        ]}
        actions={
          <a
            href="https://partenaires.leroymerlin.fr/leads-management/leads"
            target="_blank"
            rel="noopener"
          >
            <Button variant="secondary" size="sm">
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.2} />
              Portail LM
            </Button>
          </a>
        }
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Pipeline LM · Atmolead scraper</p>
          <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1] mb-2">
            Leads Leroy Merlin
            <span className="ml-3 text-[24px] text-muted-2 font-semibold tabular-nums">
              {stats.total}
            </span>
          </h1>
          <p className="text-[13.5px] text-muted max-w-2xl">
            Récupérés automatiquement depuis le portail partenaires.
            {lastRun ? (
              <>
                {" "}Dernier scrape{" "}
                <strong className="text-ink font-medium">{timeAgo(lastRun.started_at)}</strong>
                {lastRun.leads_inserted > 0 && (
                  <>
                    {" "}— <span className="text-emerald font-medium">{lastRun.leads_inserted} nouveau(x)</span>
                  </>
                )}
                .
              </>
            ) : (
              <> Atmolead n&apos;a pas encore tourné.</>
            )}
          </p>
        </section>

        <AtmoleadTabs />

        <section className="px-8 pt-6 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat
              tone="violet"
              icon={Inbox}
              label="Reçus (24h)"
              value={stats.last24h.toString()}
              sub={stats.last24h === 0 ? "rien aujourd'hui" : "nouveaux leads"}
            />
            <MiniStat
              tone="amber"
              icon={Activity}
              label="En cours"
              value={inProgress.toString()}
              sub="visio · échantillons · devis"
            />
            <MiniStat
              tone="emerald"
              icon={CheckCircle2}
              label="Validés"
              value={stats.byStatus.valide.toString()}
              sub={`${conversionRate}% de conversion`}
            />
            <MiniStat
              tone="orange"
              icon={TrendingUp}
              label="Cumul scrapé"
              value={stats.totalAmount > 0 ? eur(stats.totalAmount, true) : "—"}
              sub="montants annoncés sur LM"
            />
          </div>
        </section>

        {leads.length === 0 ? <EmptyState /> : (
          <LmLeadsTable initialLeads={leads} statusCounts={stats.byStatus} />
        )}
      </div>
    </>
  );
}

function MiniStat({
  label,
  value,
  sub,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "violet" | "amber" | "emerald" | "orange";
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <Card className="px-5 py-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="eyebrow">{label}</div>
          <div className="mt-1.5 text-[24px] font-semibold tabular-nums tracking-tight text-ink">
            {value}
          </div>
          <div className="mt-1 text-[11.5px] text-muted">{sub}</div>
        </div>
        <ColorChip tone={tone} size="md">
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </ColorChip>
      </div>
    </Card>
  );
}

function EmptyState() {
  return (
    <section className="px-8 pb-10">
      <Card className="px-10 py-16 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-soft">
          <Inbox className="h-5 w-5 text-violet-strong" />
        </div>
        <h2 className="text-[18px] font-semibold mb-1.5 text-ink">Aucun lead pour le moment</h2>
        <p className="text-[13px] text-muted max-w-md mx-auto">
          Les leads apparaîtront ici après le premier passage du scraper Atmolead.
          Ouvre l&apos;app Atmolead pour déclencher manuellement un scrape ou modifier la récurrence.
        </p>
      </Card>
    </section>
  );
}
