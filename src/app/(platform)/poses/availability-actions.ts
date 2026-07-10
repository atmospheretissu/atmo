"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  bookPoseOnAvailability,
  getPoseurByProfileId,
  type SlotKey,
} from "@/lib/db/poseur-availability";

/** Un poseur ajoute un créneau de dispo. */
export async function addAvailabilityAction(
  date: string,
  slot: SlotKey,
  notes?: string,
): Promise<{ ok: boolean; message?: string; id?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée" };

  const poseur = await getPoseurByProfileId(user.id);
  if (!poseur) {
    return {
      ok: false,
      message: "Aucun profil poseur associé à cette session.",
    };
  }

  const { data, error } = await (supabase as unknown as {
    from: (t: string) => {
      insert: (v: unknown) => {
        select: (s: string) => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> };
      };
    };
  })
    .from("poseur_availabilities")
    .insert({
      poseur_id: poseur.id,
      date,
      slot,
      status: "available",
      notes: notes ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };

  revalidatePath("/agenda");
  revalidatePath("/poses");
  return { ok: true, id: data?.id };
}

/** Un poseur retire un créneau libre (uniquement si "available"). */
export async function removeAvailabilityAction(
  id: string,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("poseur_availabilities" as never)
    .delete()
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/agenda");
  return { ok: true };
}

/** Staff assigne un dossier à un créneau. */
export async function bookAvailabilityAction(
  availabilityId: string,
  dossierId: string,
  scheduledAt: string,
): Promise<{ ok: boolean; message?: string; poseId?: string }> {
  const r = await bookPoseOnAvailability({
    availabilityId,
    dossierId,
    scheduledAt,
  });
  if (!r.ok) return r;
  revalidatePath("/agenda");
  revalidatePath("/poses");
  revalidatePath("/confections");
  return { ok: true, poseId: r.poseId };
}
