"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseClientForm, clientToDbRow } from "@/lib/validation/client";

export type ClientFormState =
  | { ok: true }
  | { ok: false; errors: Record<string, string>; message?: string }
  | undefined;

/**
 * Crée un nouveau client. Redirige vers sa fiche au succès.
 * Toute la validation passe par Zod (parseClientForm).
 * RLS Supabase enforce que seul un staff peut créer.
 */
export async function createClientAction(
  _prev: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const { data, errors } = parseClientForm(formData);
  if (!data || errors) {
    return { ok: false, errors: errors ?? {}, message: "Vérifie les champs en rouge." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, errors: {}, message: "Session expirée." };
  }

  const payload = {
    ...clientToDbRow(data),
    created_by: user.id,
  };

  const { data: inserted, error } = await supabase
    .from("clients")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    return {
      ok: false,
      errors: {},
      message: error.code === "23505"
        ? "Un client avec cet email existe déjà."
        : error.message,
    };
  }

  revalidatePath("/clients");
  redirect(`/clients/${inserted.id}`);
}

/**
 * Met à jour un client existant.
 */
export async function updateClientAction(
  id: string,
  _prev: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const { data, errors } = parseClientForm(formData);
  if (!data || errors) {
    return { ok: false, errors: errors ?? {}, message: "Vérifie les champs en rouge." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update(clientToDbRow(data))
    .eq("id", id);

  if (error) {
    return { ok: false, errors: {}, message: error.message };
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}`);
}

/**
 * Supprime un client (admin uniquement — RLS bloquera les autres rôles).
 */
export async function deleteClientAction(id: string): Promise<ClientFormState> {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) {
    return {
      ok: false,
      errors: {},
      message:
        error.code === "42501"
          ? "Permission refusée — admin requis pour supprimer."
          : error.message,
    };
  }
  revalidatePath("/clients");
  redirect("/clients");
}
