import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type Pose = Database["public"]["Tables"]["poses"]["Row"];
export type PoseInsert = Database["public"]["Tables"]["poses"]["Insert"];
export type PoseStatus = Database["public"]["Enums"]["pose_status"];

export type PoseWithRelations = Pose & {
  dossier: { number: string; client_id: string } | null;
  client: { display_name: string; city: string | null; phone: string | null } | null;
};

/**
 * Liste toutes les poses avec leur dossier + client.
 */
export async function listPoses(opts?: {
  status?: PoseStatus;
  limit?: number;
}): Promise<PoseWithRelations[]> {
  const supabase = await createClient();

  let q = supabase.from("poses").select("*").order("scheduled_at", { ascending: true });
  if (opts?.status) q = q.eq("status", opts.status);
  if (opts?.limit) q = q.limit(opts.limit);

  const { data: poses } = await q;
  if (!poses || poses.length === 0) return [];

  const dossierIds = Array.from(new Set(poses.map((p) => p.dossier_id)));
  const { data: dossiers } = await supabase
    .from("dossiers")
    .select("id, number, client_id")
    .in("id", dossierIds);

  const clientIds = Array.from(new Set((dossiers ?? []).map((d) => d.client_id)));
  const { data: clients } = await supabase
    .from("clients")
    .select("id, display_name, city, phone")
    .in("id", clientIds);

  const dossiersById = new Map((dossiers ?? []).map((d) => [d.id, d]));
  const clientsById = new Map((clients ?? []).map((c) => [c.id, c]));

  return poses.map((p) => {
    const d = dossiersById.get(p.dossier_id);
    return {
      ...p,
      dossier: d ? { number: d.number, client_id: d.client_id } : null,
      client: d ? clientsById.get(d.client_id) ?? null : null,
    };
  });
}

/**
 * Détail d'une pose.
 */
export async function getPoseDetail(id: string) {
  const supabase = await createClient();
  const { data: pose } = await supabase
    .from("poses")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!pose) return null;

  const [{ data: dossier }, { data: items }] = await Promise.all([
    supabase
      .from("dossiers")
      .select("*")
      .eq("id", pose.dossier_id)
      .maybeSingle(),
    supabase
      .from("dossier_items")
      .select("*")
      .eq("dossier_id", pose.dossier_id),
  ]);

  const { data: client } = dossier
    ? await supabase
        .from("clients")
        .select("*")
        .eq("id", dossier.client_id)
        .maybeSingle()
    : { data: null };

  return { pose, dossier: dossier ?? null, client: client ?? null, items: items ?? [] };
}

export async function getPoseStats() {
  const supabase = await createClient();
  const { data: poses } = await supabase.from("poses").select("status, scheduled_at");

  const stats = {
    total: poses?.length ?? 0,
    aPlanifier: 0,
    planifiees: 0,
    confirmees: 0,
    posees: 0,
    aVenirSeptJours: 0,
  };

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 86400000);

  for (const p of poses ?? []) {
    if (p.status === "a_planifier") stats.aPlanifier += 1;
    if (p.status === "planifie") stats.planifiees += 1;
    if (p.status === "confirme") stats.confirmees += 1;
    if (p.status === "pose") stats.posees += 1;

    if (p.scheduled_at) {
      const d = new Date(p.scheduled_at);
      if (d >= now && d <= in7Days && p.status !== "pose") stats.aVenirSeptJours += 1;
    }
  }
  return stats;
}
