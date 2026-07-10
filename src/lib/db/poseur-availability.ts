import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export type SlotKey = "morning" | "afternoon" | "day";
export type AvailabilityStatus = "available" | "booked" | "blocked";

export type PoseurAvailability = {
  id: string;
  poseur_id: string;
  poseur_name: string | null;
  date: string; // YYYY-MM-DD
  slot: SlotKey;
  status: AvailabilityStatus;
  pose_id: string | null;
  notes: string | null;
};

/** Récupère toutes les dispos d'une période avec le nom du poseur. */
export async function listPoseurAvailabilities(opts: {
  fromDate: string;
  toDate: string;
  poseurId?: string;
}): Promise<PoseurAvailability[]> {
  const supabase = await createClient();
  let q = (
    supabase.from("poseur_availabilities" as never) as unknown as {
      select: (s: string) => { gte: (k: string, v: string) => { lte: (k: string, v: string) => { order: (k: string, o: { ascending: boolean }) => Promise<{ data: unknown[] | null }> } } };
    }
  )
    .select(
      "id, poseur_id, date, slot, status, pose_id, notes, poseurs(name)"
    )
    .gte("date", opts.fromDate)
    .lte("date", opts.toDate);
  if (opts.poseurId) {
    q = (q as unknown as { eq: (k: string, v: string) => typeof q }).eq(
      "poseur_id",
      opts.poseurId,
    );
  }
  const orderedQuery = (q as unknown as {
    order: (k: string, opt: { ascending: boolean }) => Promise<{ data: unknown[] | null }>;
  }).order("date", { ascending: true });
  const { data } = await orderedQuery;
  return ((data ?? []) as unknown as Array<{
    id: string;
    poseur_id: string;
    date: string;
    slot: SlotKey;
    status: AvailabilityStatus;
    pose_id: string | null;
    notes: string | null;
    poseurs?: { name?: string } | null;
  }>).map((r) => ({
    id: r.id,
    poseur_id: r.poseur_id,
    poseur_name: r.poseurs?.name ?? null,
    date: r.date,
    slot: r.slot,
    status: r.status,
    pose_id: r.pose_id,
    notes: r.notes,
  }));
}

/** Retourne le `poseurs.id` associé à un profile.id (utilisateur connecté). */
export async function getPoseurByProfileId(profileId: string): Promise<{
  id: string;
  name: string;
} | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("poseurs")
    .select("id, name")
    .eq("profile_id", profileId)
    .eq("active", true)
    .maybeSingle();
  return (data as { id: string; name: string } | null) ?? null;
}

/** Trouve les dossiers en attente de pose (statut pose_a_planifier). */
export async function listDossiersAwaitingPose(): Promise<
  Array<{
    id: string;
    number: string;
    client_name: string | null;
    client_city: string | null;
    devis_number: string | null;
    total_ttc: number;
  }>
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dossiers")
    .select("id, number, total_ttc, client_id, devis_id")
    .eq("status", "pose_a_planifier")
    .order("created_at", { ascending: true });
  const dossiers = data ?? [];
  if (dossiers.length === 0) return [];
  const clientIds = Array.from(new Set(dossiers.map((d) => d.client_id)));
  const devisIds = Array.from(
    new Set(dossiers.map((d) => d.devis_id).filter(Boolean) as string[]),
  );
  const [{ data: clients }, { data: devisRows }] = await Promise.all([
    supabase.from("clients").select("id, display_name, city").in("id", clientIds),
    devisIds.length
      ? supabase.from("devis").select("id, number").in("id", devisIds)
      : Promise.resolve({ data: [] as { id: string; number: string }[] }),
  ]);
  const cById = new Map((clients ?? []).map((c) => [c.id, c]));
  const dById = new Map((devisRows ?? []).map((d) => [d.id, d]));
  return dossiers.map((d) => {
    const c = cById.get(d.client_id);
    return {
      id: d.id,
      number: d.number,
      client_name: c?.display_name ?? null,
      client_city: c?.city ?? null,
      devis_number: d.devis_id ? dById.get(d.devis_id)?.number ?? null : null,
      total_ttc: Number(d.total_ttc ?? 0),
    };
  });
}

/** Crée une pose planifiée sur un créneau de dispo. */
export async function bookPoseOnAvailability(args: {
  availabilityId: string;
  dossierId: string;
  scheduledAt: string; // ISO
}): Promise<{ ok: true; poseId: string } | { ok: false; message: string }> {
  const admin = createServiceRoleClient();

  // 1. Récupère la dispo + poseur
  const { data: avail } = await admin
    .from("poseur_availabilities" as never)
    .select("id, poseur_id, date, slot, status");
  const availRow = (avail as unknown as Array<{
    id: string;
    poseur_id: string;
    date: string;
    slot: SlotKey;
    status: AvailabilityStatus;
  }> | null)?.find((r) => r.id === args.availabilityId);
  if (!availRow) return { ok: false, message: "Créneau introuvable" };
  if (availRow.status !== "available") {
    return { ok: false, message: "Ce créneau n'est plus disponible" };
  }

  // 2. Récupère le poseur.profile_id (pour poser sur poses.poseur_id qui référence profiles)
  const { data: poseur } = await admin
    .from("poseurs")
    .select("profile_id")
    .eq("id", availRow.poseur_id)
    .maybeSingle();

  // 3. Crée la pose
  const { data: pose, error } = await admin
    .from("poses")
    .insert({
      dossier_id: args.dossierId,
      poseur_id: (poseur as { profile_id?: string })?.profile_id ?? null,
      scheduled_at: args.scheduledAt,
      status: "planifie",
    })
    .select("id")
    .single();
  if (error || !pose) return { ok: false, message: error?.message ?? "Erreur" };

  // 4. Marque la dispo comme booked
  await (admin as unknown as {
    from: (t: string) => {
      update: (v: unknown) => { eq: (k: string, v: unknown) => Promise<unknown> };
    };
  })
    .from("poseur_availabilities")
    .update({ status: "booked", pose_id: pose.id })
    .eq("id", args.availabilityId);

  // 5. Bascule le dossier en pose_a_venir
  await admin
    .from("dossiers")
    .update({ status: "pose_a_venir" })
    .eq("id", args.dossierId);

  return { ok: true, poseId: pose.id };
}
