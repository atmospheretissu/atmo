import { Activity, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { ColorChip } from "@/components/ui/status-pill";
import { Pagination } from "@/components/ui/pagination";
import { AtmoleadTabs } from "@/components/lm-leads/atmolead-tabs";
import { AtmoleadExecutionsList } from "@/components/lm-leads/atmolead-executions-list";
import { listAtmoleadExecutions, getAtmoleadExecutionStats } from "@/lib/db/atmolead";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function ExecutionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const [{ rows, total }, stats] = await Promise.all([
    listAtmoleadExecutions({ page, pageSize: PAGE_SIZE }),
    getAtmoleadExecutionStats(),
  ]);

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Leads Leroy Merlin" },
          { label: "Exécutions" },
        ]}
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Pipeline LM · Atmolead scraper</p>
          <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1] mb-2">
            Historique des exécutions
          </h1>
          <p className="text-[13.5px] text-muted max-w-2xl">
            Trace de chaque passage du worker — login, extraction, persistance. Clique sur une
            ligne pour voir la timeline et les leads capturés.
          </p>
        </section>

        <AtmoleadTabs />

        <section className="px-8 pt-6 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi tone="violet" icon={Activity} label="Total" value={String(stats.total)} />
            <Kpi
              tone="emerald"
              icon={CheckCircle2}
              label="Réussies (24h)"
              value={String(stats.success24h)}
            />
            <Kpi
              tone="pink"
              icon={XCircle}
              label="Échouées (24h)"
              value={String(stats.failed24h)}
            />
            <Kpi
              tone="orange"
              icon={AlertTriangle}
              label="Partielles (24h)"
              value={String(stats.partial24h)}
            />
          </div>
        </section>

        <section className="px-8 pb-10">
          <Card className="overflow-hidden">
            <AtmoleadExecutionsList executions={rows} />
            <Pagination
              basePath="/leads-lm/executions"
              currentPage={page}
              totalCount={total}
              pageSize={PAGE_SIZE}
              itemNoun="exécutions"
            />
          </Card>
        </section>
      </div>
    </>
  );
}

function Kpi({
  tone,
  icon: Icon,
  label,
  value,
}: {
  tone: "violet" | "emerald" | "pink" | "orange";
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
}) {
  return (
    <Card className="px-5 py-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="eyebrow">{label}</div>
          <div className="mt-1.5 text-[24px] font-semibold tabular-nums tracking-tight text-ink">
            {value}
          </div>
        </div>
        <ColorChip tone={tone} size="md">
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </ColorChip>
      </div>
    </Card>
  );
}
