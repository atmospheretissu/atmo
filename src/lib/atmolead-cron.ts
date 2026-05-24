import { Cron } from "croner";

export type CronInfo = {
  valid: boolean;
  human: string;
  nextRun: string | null;
  nextRunRelative: string | null;
  error?: string;
};

const HUMAN: Record<string, string> = {
  "0 * * * *": "En haut de chaque heure",
  "*/15 * * * *": "Toutes les 15 minutes",
  "*/30 * * * *": "Toutes les 30 minutes",
  "0 */2 * * *": "Toutes les 2 heures",
  "0 */6 * * *": "Toutes les 6 heures",
  "0 */12 * * *": "Toutes les 12 heures",
  "0 3 * * *": "Chaque nuit à 3h00",
  "0 8 * * *": "Chaque matin à 8h00",
  "0 9 * * 1": "Lundi à 9h00",
  "0 9 * * 1-5": "Lundi → vendredi à 9h00",
};

function formatRelative(ms: number): string {
  const abs = Math.abs(ms);
  const past = ms < 0;
  const m = Math.round(abs / 60_000);
  if (m < 1) return past ? "à l'instant" : "dans quelques secondes";
  if (m < 60) return past ? `il y a ${m} min` : `dans ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return past ? `il y a ${h}h` : `dans ${h}h ${m % 60}m`;
  const d = Math.round(h / 24);
  return past ? `il y a ${d}j` : `dans ${d}j ${h % 24}h`;
}

export function describeCron(expression: string): CronInfo {
  if (!expression || !expression.trim()) {
    return { valid: false, human: "—", nextRun: null, nextRunRelative: null, error: "expression vide" };
  }
  try {
    const c = new Cron(expression);
    const next = c.nextRun();
    const human = HUMAN[expression.trim()] ?? `Cron: ${expression}`;
    return {
      valid: true,
      human,
      nextRun: next?.toISOString() ?? null,
      nextRunRelative: next ? formatRelative(next.getTime() - Date.now()) : null,
    };
  } catch (err) {
    return {
      valid: false,
      human: "—",
      nextRun: null,
      nextRunRelative: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
