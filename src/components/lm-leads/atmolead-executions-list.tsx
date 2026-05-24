import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { longDate } from "@/lib/formatters";
import type { AtmoleadExecution } from "@/lib/db/atmolead";

const statusTone: Record<AtmoleadExecution["status"], StatusTone> = {
  running: "blue",
  success: "success",
  partial: "warning",
  failed: "danger",
};

const statusLabel: Record<AtmoleadExecution["status"], string> = {
  running: "En cours",
  success: "Succès",
  partial: "Partiel",
  failed: "Échec",
};

const triggerLabel: Record<string, string> = {
  cron: "Automatique",
  manual: "Manuel",
  startup: "Démarrage",
};

function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 100) / 10;
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

export function AtmoleadExecutionsList({ executions }: { executions: AtmoleadExecution[] }) {
  if (executions.length === 0) {
    return (
      <div className="px-5 py-12 text-center text-[13px] text-muted">
        Aucune exécution pour le moment. Lance un scrape depuis Configuration.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-line bg-canvas-2/50 text-left">
            <th className="px-5 py-2.5 eyebrow">Démarré</th>
            <th className="px-5 py-2.5 eyebrow">Statut</th>
            <th className="px-5 py-2.5 eyebrow">Source</th>
            <th className="px-5 py-2.5 eyebrow">Durée</th>
            <th className="px-5 py-2.5 eyebrow text-right">Trouvés</th>
            <th className="px-5 py-2.5 eyebrow text-right">Insérés</th>
            <th className="px-5 py-2.5 eyebrow text-right">Ignorés</th>
            <th className="px-5 py-2.5 eyebrow">Étapes</th>
            <th className="px-5 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {executions.map((e) => {
            const stepCount = Array.isArray(e.logs) ? e.logs.length : 0;
            const stepFailed = Array.isArray(e.logs)
              ? e.logs.filter((s) => s.status === "failed").length
              : 0;
            return (
              <tr
                key={e.id}
                className="group border-b border-line/60 transition-colors last:border-0 hover:bg-canvas-2/40"
              >
                <td className="px-5 py-3">
                  <Link
                    href={`/leads-lm/executions/${e.id}`}
                    className="block text-[12.5px] text-ink-2"
                  >
                    {longDate(e.started_at)}
                  </Link>
                </td>
                <td className="px-5 py-3">
                  <Link href={`/leads-lm/executions/${e.id}`} className="block">
                    <StatusPill tone={statusTone[e.status]}>
                      {statusLabel[e.status]}
                    </StatusPill>
                  </Link>
                </td>
                <td className="px-5 py-3 text-[12.5px] text-muted">
                  {triggerLabel[e.triggered_by] ?? e.triggered_by}
                </td>
                <td className="px-5 py-3 text-[12.5px] tabular-nums">
                  {formatDuration(e.duration_ms)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">{e.leads_found}</td>
                <td className="px-5 py-3 text-right tabular-nums text-emerald font-medium">
                  {e.leads_inserted}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-muted">
                  {e.leads_skipped}
                </td>
                <td className="px-5 py-3 text-[12.5px] text-muted tabular-nums">
                  {stepCount > 0 ? (
                    <>
                      {stepCount - stepFailed}/{stepCount}
                      {stepFailed > 0 && (
                        <span className="ml-1 text-red">({stepFailed} ✕)</span>
                      )}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/leads-lm/executions/${e.id}`}
                    aria-label="Voir le détail"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-2 transition-colors group-hover:bg-white group-hover:text-ink-2"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
