"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { triggerEvent, firstNameOf } from "@/lib/brevo/trigger-event";

export type PoseActionResult =
  | { ok: true; poseId?: string }
  | { ok: false; message: string };

/**
 * Crée une pose pour un dossier (statut initial 'a_planifier').
 * Idempotent : si une pose existe déjà pour ce dossier, retourne son id.
 */
export async function createPoseForDossierAction(
  dossierId: string,
  opts?: { scheduledAt?: string; durationMinutes?: number; notes?: string }
): Promise<PoseActionResult> {
  const supabase = await createClient();

  // Existant ?
  const { data: existing } = await supabase
    .from("poses")
    .select("id")
    .eq("dossier_id", dossierId)
    .maybeSingle();

  if (existing) {
    revalidatePath("/poses");
    revalidatePath(`/confections/${dossierId}`);
    return { ok: true, poseId: existing.id };
  }

  // Récupère adresse client pour pré-remplir
  const { data: dossier } = await supabase
    .from("dossiers")
    .select("client_id")
    .eq("id", dossierId)
    .maybeSingle();

  const { data: client } = dossier
    ? await supabase
        .from("clients")
        .select("address_pose, city, postal_code")
        .eq("id", dossier.client_id)
        .maybeSingle()
    : { data: null };

  const address = client
    ? [client.address_pose, client.postal_code, client.city]
        .filter(Boolean)
        .join(" ")
    : null;

  const { data: pose, error } = await supabase
    .from("poses")
    .insert({
      dossier_id: dossierId,
      status: opts?.scheduledAt ? "planifie" : "a_planifier",
      scheduled_at: opts?.scheduledAt ?? null,
      duration_minutes: opts?.durationMinutes ?? 120,
      address,
      notes: opts?.notes ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };

  // Mise à jour du statut dossier si on planifie
  if (opts?.scheduledAt) {
    await supabase.from("dossiers").update({ status: "planifie" }).eq("id", dossierId);
  }

  revalidatePath("/poses");
  revalidatePath("/dashboard");
  revalidatePath(`/confections/${dossierId}`);
  return { ok: true, poseId: pose.id };
}

/**
 * Planifie une pose existante (date + durée + notes).
 */
export async function schedulePoseAction(
  poseId: string,
  scheduledAt: string,
  opts?: { durationMinutes?: number; notes?: string; poseurId?: string }
): Promise<PoseActionResult> {
  const supabase = await createClient();

  const { data: pose, error } = await supabase
    .from("poses")
    .update({
      scheduled_at: scheduledAt,
      duration_minutes: opts?.durationMinutes ?? 120,
      notes: opts?.notes ?? null,
      poseur_id: opts?.poseurId ?? null,
      status: "planifie",
    })
    .eq("id", poseId)
    .select("dossier_id")
    .single();

  if (error || !pose) return { ok: false, message: error?.message ?? "?" };

  await supabase
    .from("dossiers")
    .update({ status: "planifie", scheduled_pose_at: scheduledAt })
    .eq("id", pose.dossier_id);

  revalidatePath("/poses");
  revalidatePath("/dashboard");
  revalidatePath("/confections");
  revalidatePath(`/poses/${poseId}`);
  revalidatePath(`/confections/${pose.dossier_id}`);
  return { ok: true, poseId };
}

/**
 * Marque la pose comme effectuée (statut + dossier).
 */
export async function markPoseDoneAction(
  poseId: string
): Promise<PoseActionResult> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: pose, error } = await supabase
    .from("poses")
    .update({
      status: "pose",
      completed_at: now,
    })
    .eq("id", poseId)
    .select("dossier_id")
    .single();

  if (error || !pose) return { ok: false, message: error?.message ?? "?" };

  await supabase.from("dossiers").update({ status: "pose" }).eq("id", pose.dossier_id);

  // SMS satisfaction après pose effectuée
  try {
    const { data: dossier } = await supabase
      .from("dossiers")
      .select("client_id")
      .eq("id", pose.dossier_id)
      .maybeSingle();
    const { data: client } = dossier
      ? await supabase
          .from("clients")
          .select("phone, email, display_name")
          .eq("id", dossier.client_id)
          .maybeSingle()
      : { data: null };
    if (dossier && client) {
      await triggerEvent("pose_effectuee", {
        toPhone: client.phone,
        toEmail: client.email,
        toName: client.display_name,
        clientId: dossier.client_id,
        vars: {
          prenom: firstNameOf(client.display_name),
          lien_avis: "https://g.page/atmospheretissus/review",
        },
      });
    }
  } catch (err) {
    console.warn("[trigger pose_effectuee]", err);
  }

  revalidatePath("/poses");
  revalidatePath(`/poses/${poseId}`);
  revalidatePath("/dashboard");
  revalidatePath(`/confections/${pose.dossier_id}`);
  return { ok: true, poseId };
}
