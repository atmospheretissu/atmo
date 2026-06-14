"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCreationStoreId } from "@/lib/db/stores";
import { getNextSavNumber } from "@/lib/db/sav";
import type { SavPriority, SavStatus } from "@/lib/db/sav-shared";

export type CreateSavInput = {
  clientId?: string | null;
  devisId?: string | null;
  dossierId?: string | null;
  title: string;
  description?: string | null;
  priority?: SavPriority;
  assignedTo?: string | null;
};

export async function createSavTicketAction(
  input: CreateSavInput,
): Promise<{ ok: true; id: string; number: string } | { ok: false; message: string }> {
  const title = input.title.trim();
  if (!title) return { ok: false, message: "Titre requis." };
  if (!input.clientId && !input.devisId && !input.dossierId) {
    return { ok: false, message: "Au moins un lien (client, devis ou dossier) requis." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée." };

  // Hérite du store_id depuis le devis ou dossier source
  let storeId: string | null = null;
  if (input.dossierId) {
    const { data } = await supabase
      .from("dossiers")
      .select("store_id")
      .eq("id", input.dossierId)
      .maybeSingle();
    storeId = (data as { store_id?: string | null } | null)?.store_id ?? null;
  } else if (input.devisId) {
    const { data } = await supabase
      .from("devis")
      .select("store_id")
      .eq("id", input.devisId)
      .maybeSingle();
    storeId = (data as { store_id?: string | null } | null)?.store_id ?? null;
  } else if (input.clientId) {
    const { data } = await supabase
      .from("clients")
      .select("store_id")
      .eq("id", input.clientId)
      .maybeSingle();
    storeId = (data as { store_id?: string | null } | null)?.store_id ?? null;
  }
  if (!storeId) storeId = await getCreationStoreId();

  const number = await getNextSavNumber();
  const { data, error } = await supabase
    .from("sav_tickets")
    .insert({
      number,
      client_id: input.clientId ?? null,
      devis_id: input.devisId ?? null,
      dossier_id: input.dossierId ?? null,
      title,
      description: input.description?.trim() || null,
      priority: input.priority ?? "normale",
      status: "nouveau",
      assigned_to: input.assignedTo ?? null,
      store_id: storeId,
      created_by: user.id,
    })
    .select("id, number")
    .maybeSingle();
  if (error || !data) return { ok: false, message: error?.message ?? "Échec création ticket SAV" };

  // Si le ticket est rattaché à un dossier, on bascule aussi le statut dossier en sav
  if (input.dossierId) {
    await supabase.from("dossiers").update({ status: "sav" }).eq("id", input.dossierId);
  }

  revalidatePath("/sav");
  revalidatePath("/dashboard");
  if (input.clientId) revalidatePath(`/clients/${input.clientId}`);
  if (input.devisId) revalidatePath(`/devis/${input.devisId}`);
  if (input.dossierId) revalidatePath(`/confections/${input.dossierId}`);

  return { ok: true, id: data.id, number: data.number };
}

export async function updateSavStatusAction(
  ticketId: string,
  status: SavStatus,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sav_tickets")
    .update({ status })
    .eq("id", ticketId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/sav");
  return { ok: true };
}

export async function assignSavTicketAction(
  ticketId: string,
  assignedTo: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sav_tickets")
    .update({ assigned_to: assignedTo })
    .eq("id", ticketId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/sav");
  return { ok: true };
}

export async function addSavNoteAction(
  ticketId: string,
  body: string,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, message: "Message vide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée." };

  const { data, error } = await supabase
    .from("sav_ticket_notes")
    .insert({ ticket_id: ticketId, author_id: user.id, body: trimmed })
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, message: error?.message ?? "Échec ajout note" };

  revalidatePath("/sav");
  return { ok: true, id: data.id };
}
