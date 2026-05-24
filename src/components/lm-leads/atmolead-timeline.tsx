import { Check, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AtmoleadStep } from "@/lib/db/atmolead";

function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 100) / 10;
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

const iconFor = { ok: Check, failed: X, partial: AlertTriangle } as const;
const colorFor = {
  ok: "bg-emerald text-white",
  failed: "bg-red text-white",
  partial: "bg-amber text-white",
} as const;

export function AtmoleadTimeline({ steps }: { steps: AtmoleadStep[] | null | undefined }) {
  if (!steps || steps.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-canvas-2/40 px-5 py-6 text-[13px] text-muted">
        Pas de trace disponible pour cette exécution.
      </div>
    );
  }
  return (
    <ol className="relative space-y-3 border-l border-line pl-6">
      {steps.map((step, i) => {
        const Icon = iconFor[step.status] ?? Check;
        return (
          <li key={i} className="relative">
            <span
              className={cn(
                "absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                colorFor[step.status] ?? "bg-canvas-3 text-muted",
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2.6} />
            </span>
            <div className="rounded-xl border border-line bg-white p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[13px] font-medium text-ink">{step.label}</div>
                <div className="text-[11.5px] tabular-nums text-muted">
                  {formatDuration(step.duration_ms)}
                </div>
              </div>
              {step.data && Object.keys(step.data).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11.5px]">
                  {Object.entries(step.data).map(([k, v]) => (
                    <span
                      key={k}
                      className="rounded-md bg-canvas-2 px-2 py-0.5 text-muted"
                    >
                      {k}: <span className="text-ink-2 font-medium">{String(v)}</span>
                    </span>
                  ))}
                </div>
              )}
              {step.message && (
                <pre className="mt-2 whitespace-pre-wrap rounded-md bg-red-soft p-2 text-[11.5px] text-red">
                  {step.message}
                </pre>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
