import Link from "next/link";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { AtmoleadTabs } from "@/components/lm-leads/atmolead-tabs";
import { AtmoleadConfigForm } from "@/components/lm-leads/atmolead-config-form";
import { AtmoleadWorkerStatusCard } from "@/components/lm-leads/atmolead-worker-status-card";
import { AtmoleadTestNowButton } from "@/components/lm-leads/atmolead-test-now-button";
import { describeCron } from "@/lib/atmolead-cron";
import { longDate, time } from "@/lib/formatters";
import {
  getAtmoleadConfig,
  listAtmoleadExecutions,
  getLeadsLast24hCount,
} from "@/lib/db/atmolead";
import { createServiceRoleClient } from "@/lib/supabase/server";

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

function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 100) / 10;
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

async function getLastSuccess() {
  try {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from("atmolead_executions" as never)
      .select("started_at, leads_inserted, duration_ms")
      .eq("status", "success")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as unknown as {
      started_at: string;
      leads_inserted: number;
      duration_ms: number;
    } | null) ?? null;
  } catch {
    return null;
  }
}

export default async function ConfigPage() {
  const [config, lastSuccess, leadsLast24h, recent] = await Promise.all([
    getAtmoleadConfig(),
    getLastSuccess(),
    getLeadsLast24hCount(),
    listAtmoleadExecutions({ page: 1, pageSize: 5 }),
  ]);

  const cronInfo = config ? describeCron(config.cron_expression) : null;

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Atmoleads" },
          { label: "Configuration" },
        ]}
        actions={<AtmoleadTestNowButton />}
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Pipeline LM · Atmolead scraper</p>
          <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1] mb-2">
            Configuration
          </h1>
          <p className="text-[13.5px] text-muted max-w-2xl">
            URL cible, fréquence et sélecteurs CSS du scraper. Modifiable sans redéploiement —
            le worker recharge la config toutes les 5 minutes.
          </p>
        </section>

        <AtmoleadTabs />

        <section className="px-8 pt-6 pb-6">
          <AtmoleadWorkerStatusCard
            config={config}
            cronInfo={cronInfo}
            lastSuccess={lastSuccess}
            leadsLast24h={leadsLast24h}
          />
        </section>

        <section className="px-8 pb-6 max-w-4xl">
          <AtmoleadConfigForm config={config} />
        </section>

        <section className="px-8 pb-10 max-w-4xl">
          <h2 className="mb-3 text-[15px] font-semibold">Dernières exécutions</h2>
          <Card className="overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line bg-canvas-2/50 text-left">
                  <th className="px-5 py-2.5 eyebrow">Démarré</th>
                  <th className="px-5 py-2.5 eyebrow">Statut</th>
                  <th className="px-5 py-2.5 eyebrow">Source</th>
                  <th className="px-5 py-2.5 eyebrow text-right">Durée</th>
                  <th className="px-5 py-2.5 eyebrow text-right">Insérés</th>
                </tr>
              </thead>
              <tbody>
                {recent.rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-muted">
                      Pas encore d&apos;exécution.
                    </td>
                  </tr>
                ) : (
                  recent.rows.map((e) => (
                    <tr
                      key={e.id}
                      className="border-b border-line/60 last:border-0 hover:bg-canvas-2/40"
                    >
                      <td className="px-5 py-2.5">
                        <Link
                          href={`/leads-lm/executions/${e.id}`}
                          className="block hover:text-ink-2"
                        >
                          <div className="text-[12.5px] text-ink-2">
                            {longDate(e.started_at)}
                          </div>
                          <div className="font-mono text-[11px] text-muted tabular-nums">
                            {time(e.started_at)}
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-2.5">
                        <StatusPill tone={statusTone[e.status] ?? "muted"}>
                          {statusLabel[e.status] ?? e.status}
                        </StatusPill>
                      </td>
                      <td className="px-5 py-2.5 text-muted">{e.triggered_by}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums">
                        {formatDuration(e.duration_ms)}
                      </td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-emerald font-medium">
                        {e.leads_inserted}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </section>
      </div>
    </>
  );
}
