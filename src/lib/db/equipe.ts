import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type Poseur = Database["public"]["Tables"]["poseurs"]["Row"];
export type PoseurInsert = Database["public"]["Tables"]["poseurs"]["Insert"];
export type PoseurUpdate = Database["public"]["Tables"]["poseurs"]["Update"];

export type Atelier = Database["public"]["Tables"]["ateliers"]["Row"];
export type AtelierInsert = Database["public"]["Tables"]["ateliers"]["Insert"];
export type AtelierUpdate = Database["public"]["Tables"]["ateliers"]["Update"];

export async function listPoseurs(opts?: { activeOnly?: boolean }): Promise<Poseur[]> {
  const supabase = await createClient();
  let q = supabase.from("poseurs").select("*").order("name", { ascending: true });
  if (opts?.activeOnly) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function listAteliers(opts?: { activeOnly?: boolean }): Promise<Atelier[]> {
  const supabase = await createClient();
  let q = supabase.from("ateliers").select("*").order("name", { ascending: true });
  if (opts?.activeOnly) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getAtelier(id: string): Promise<Atelier | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("ateliers").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}
