import type { Database } from "@/lib/supabase/types";

/**
 * Types et helpers PURS (sans dépendance serveur Supabase) — peuvent être
 * importés depuis n'importe quel client component sans tirer le server lib.
 */

export type Source = Database["public"]["Tables"]["sources"]["Row"];

export type SourceColor =
  | "neutral"
  | "orange"
  | "amber"
  | "blue"
  | "pink"
  | "violet"
  | "emerald"
  | "yellow"
  | "muted";

/** Convertit une couleur source en StatusTone (gère les alias historiques). */
export function sourceColorToTone(color: string): SourceColor {
  if (color === "ink") return "neutral";
  const valid: SourceColor[] = [
    "neutral", "orange", "amber", "blue", "pink", "violet", "emerald", "yellow", "muted",
  ];
  return valid.includes(color as SourceColor) ? (color as SourceColor) : "muted";
}

/** Résolution label/color d'une source (admet null source_id, fallback channel). */
export function resolveSourceLabel(
  sources: Source[],
  source_id: string | null,
  channel: string,
): { label: string; color: SourceColor; key: string } {
  if (source_id) {
    const s = sources.find((x) => x.id === source_id);
    if (s) return { label: s.label, color: sourceColorToTone(s.color), key: s.key };
  }
  const s = sources.find((x) => x.key === channel);
  if (s) return { label: s.label, color: sourceColorToTone(s.color), key: s.key };
  return { label: channel, color: "muted", key: channel };
}
