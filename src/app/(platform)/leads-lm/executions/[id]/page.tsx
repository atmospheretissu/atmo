import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { AtmoleadTimeline } from "@/components/lm-leads/atmolead-timeline";
import { AtmoleadRawLeadsTable } from "@/components/lm-leads/atmolead-raw-leads-table";
import { longDate } from "@/lib/formatters";
import { getAtmoleadExecution, listAtmoleadRawLeads } from "@/lib/db/atmolead";

export const dynamic = "force-dynamic";

const statusTone: Record<string, StatusTone> = {
  running: "blue",
  success: "success",
  partial: "warning",
  failed: "danger",
};

const statusLabel: Record<string, string> = {
  running: "En cours",
  success: "Succès",
  partial: "Partiel",
  failed: "Échec",
};

const triggerLabel: Record<string, string> = {
  cron: "Automatique (cron)",
  manual: "Manuel",
  startup: "Démarrage worker",
};

function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 100) / 10;
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

export default async function ExecutionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [execution, rawLeads] = await Promise.all([
    getAtmoleadExecution(id),
    listAtmoleadRawLeads(id),
  ]);

  if (!execution) notFound();

  const insertedCount = rawLeads.filter((r) => r.inserted).length;
  const skippedCount = rawLeads.length - insertedCount;

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Leads Leroy Merlin", href: "/leads-lm" },
          { label: "Exécutions", href: "/leads-lm/executions" },
          { label: execution.id.slice(0, 8) },
        ]}
        actions={
          <Link href="/leads-lm/executions">
            <Button variant="secondary" size="sm">
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
              Toutes les exécutions
            </Button>
          </Link>
        }
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="eyebrow mb-3">Pipeline LM · Exécution</p>
              <h1 className="text-[28px] font-semibold tracking-tight text-ink leading-[1.1] mb-2">
                Run du {longDate(execution.started_at)}
              </h1>
              <p className="text-[13.5px] text-muted">
                Déclenché : <strong className="text-ink-2 font-medium">{triggerLabel[execution.triggered_by] ?? execution.triggered_by}</strong>
                {execution.worker_version && (
                  <> · worker <code className="rounded bg-canvas-2 px-1 py-0.5 text-[11.5px]">{execution.worker_version}</code></>
                )}
              </p>
            </div>
            <StatusPill tone={statusTone[execution.status] ?? "muted"}>
              {statusLabel[execution.status] ?? execution.status}
            </StatusPill>
          </div>
        </section>

        <section className="px-8 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Durée totale" value={formatDuration(execution.duration_ms)} />
            <Stat label="Leads trouvés" value={String(execution.leads_found ?? 0)} />
            <Stat label="Insérés" value={String(insertedCount)} tone="success" />
            <Stat
              label="Ignorés"
              value={String(skippedCount)}
              tone={skippedCount ? "warn" : "muted"}
            />
          </div>
        </section>

        {execution.error_message && (
          <section className="px-8 pb-6">
            <Card className="border-red bg-red-soft p-4">
              <div className="mb-1 text-[12.5px] font-semibold text-red">Erreur</div>
              <pre className="whitespace-pre-wrap text-[12px] text-red">
                {execution.error_message}
              </pre>
            </Card>
          </section>
        )}

        <section className="px-8 pb-6">
          <h2 className="mb-3 text-[15px] font-semibold">Étapes</h2>
          <AtmoleadTimeline steps={execution.logs} />
        </section>

        <section className="px-8 pb-10">
          <h2 className="mb-3 text-[15px] font-semibold">Leads scrapés ({rawLeads.length})</h2>
          <AtmoleadRawLeadsTable rows={rawLeads} />
        </section>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warn" | "muted";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald"
      : tone === "warn"
        ? "text-amber"
        : tone === "muted"
          ? "text-muted"
          : "text-ink";
  return (
    <Card className="px-5 py-4">
      <div className="eyebrow">{label}</div>
      <div
        className={`mt-1.5 text-[24px] font-semibold tabular-nums tracking-tight ${toneClass}`}
      >
        {value}
      </div>
    </Card>
  );
}
