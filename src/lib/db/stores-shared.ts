import type { Database } from "@/lib/supabase/types";

export type Store = Database["public"]["Tables"]["stores"]["Row"];

export type StoreColor =
  | "violet"
  | "emerald"
  | "blue"
  | "pink"
  | "amber"
  | "orange"
  | "yellow"
  | "neutral";

export function storeColorToTone(color: string): StoreColor {
  const valid: StoreColor[] = [
    "violet", "emerald", "blue", "pink", "amber", "orange", "yellow", "neutral",
  ];
  return valid.includes(color as StoreColor) ? (color as StoreColor) : "violet";
}

/** Initiales utilisées dans le pill workspace (ex: "Atmosphère Marquette" → "AM"). */
export function storeInitials(s: Pick<Store, "name" | "short_name">): string {
  const src = (s.short_name ?? s.name).trim();
  const words = src.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + (words[words.length - 1][0] ?? "")).toUpperCase();
}
