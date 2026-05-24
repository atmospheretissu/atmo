"use client";

import { useEffect, useState } from "react";
import { Activity, Clock, Inbox, Globe } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ColorChip, StatusPill } from "@/components/ui/status-pill";
import { longDate } from "@/lib/formatters";
import type { CronInfo } from "@/lib/atmolead-cron";

type Status = {
  healthy: boolean;
  version?: string;
  latency?: number;
  error?: string;
};

type Config = {
  enabled: boolean;
  target_url: string;
  cron_expression: string;
} | null;

type LastSuccess = {
  started_at: string;
  leads_inserted: number;
  duration_ms: number;
} | null;

function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 100) / 10;
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function AtmoleadWorkerStatusCard({
  config,
  cronInfo,
  lastSuccess,
  leadsLast24h,
}: {
  config: Config;
  cronInfo: CronInfo | null;
  lastSuccess: LastSuccess;
  leadsLast24h: number;
}) {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchStatus = () => {
      fetch("/api/leads-lm/worker-status", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled) setStatus(d);
        })
        .catch(() => {
          if (!cancelled) setStatus({ healthy: false, error: "fetch failed" });
        });
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const cronOK = cronInfo?.valid && config?.enabled;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3">
          <ColorChip
            tone={
              status?.healthy ? "emerald" : status?.healthy === false ? "pink" : "amber"
            }
            size="md"
          >
            <Activity className="h-4 w-4" strokeWidth={2.2} />
          </ColorChip>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold">
                {status === null
                  ? "Vérification du worker…"
                  : status.healthy
                    ? "Worker connecté"
                    : "Worker injoignable"}
              </span>
              {status?.healthy && <StatusPill tone="success">online</StatusPill>}
              {status && !status.healthy && (
                <StatusPill tone="danger">offline</StatusPill>
              )}
            </div>
            <div className="mt-0.5 text-[11.5px] text-muted">
              {status?.healthy
                ? `version ${status.version ?? "?"} · latence ${status.latency ?? 0} ms`
                : (status?.error ?? "—")}
            </div>
          </div>
        </div>

        {config?.enabled ? (
          <StatusPill tone="success">Scraping actif</StatusPill>
        ) : (
          <StatusPill tone="muted">Scraping désactivé</StatusPill>
        )}
      </div>

      <div className="h-px bg-line" />

      <div className="grid grid-cols-4 divide-x divide-line">
        <StatBlock
          tone="violet"
          icon={Clock}
          label="Prochain run"
          value={cronOK && cronInfo?.nextRun ? longDate(cronInfo.nextRun) : "—"}
          subtitle={cronOK ? (cronInfo?.nextRunRelative ?? "") : "scraping désactivé"}
        />
        <StatBlock
          tone="emerald"
          icon={Activity}
          label="Dernier succès"
          value={lastSuccess ? longDate(lastSuccess.started_at) : "jamais"}
          subtitle={
            lastSuccess
              ? `${lastSuccess.leads_inserted} insérés · ${formatDuration(lastSuccess.duration_ms)}`
              : ""
          }
        />
        <StatBlock
          tone="pink"
          icon={Inbox}
          label="Leads ingérés (24h)"
          value={String(leadsLast24h)}
        />
        <StatBlock
          tone="amber"
          icon={Globe}
          label="Source"
          value={config?.target_url ? hostnameOf(config.target_url) : "—"}
          subtitle={cronInfo?.human ?? "—"}
        />
      </div>
    </Card>
  );
}

function StatBlock({
  tone,
  icon: Icon,
  label,
  value,
  subtitle,
}: {
  tone: "violet" | "emerald" | "pink" | "amber";
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2">
        <ColorChip tone={tone} size="sm">
          <Icon className="h-3 w-3" strokeWidth={2.2} />
        </ColorChip>
        <div className="eyebrow">{label}</div>
      </div>
      <div className="mt-2 text-[14px] font-medium text-ink">{value}</div>
      {subtitle && <div className="mt-0.5 text-[11.5px] text-muted">{subtitle}</div>}
    </div>
  );
}
