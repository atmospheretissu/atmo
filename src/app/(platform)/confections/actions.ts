"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { triggerEvent, firstNameOf } from "@/lib/brevo/trigger-event";

export async function addDossierNoteAction(
  dossierId: string,
  body: string,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, message: "Note vide." };
  if (trimmed.length > 4000)
    return { ok: false, message: "Note trop longue (4000 caractères max)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée" };

  const { data, error } = await supabase
    .from("dossier_notes")
    .insert({
      dossier_id: dossierId,
      author_id: user.id,
      body: trimmed,
      kind: "internal",
    })
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, message: error?.message ?? "Échec insert" };

  revalidatePath(`/confections/${dossierId}`);
  return { ok: true, id: data.id };
}

export async function deleteDossierNoteAction(
  noteId: string,
  dossierId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("dossier_notes").delete().eq("id", noteId);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/confections/${dossierId}`);
  return { ok: true };
}

export async function startProcurementAction(
  dossierId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const { data: dossier } = await supabase
    .from("dossiers")
    .select("status")
    .eq("id", dossierId)
    .maybeSingle();
  if (!dossier) return { ok: false, message: "Dossier introuvable" };
  if (dossier.status !== "commande_validee") {
    return {
      ok: false,
      message: `Le dossier doit être en "Commande validée" (statut actuel : ${dossier.status}).`,
    };
  }
  const { error } = await supabase
    .from("dossiers")
    .update({
      status: "attente_matiere",
      attente_matiere_at: new Date().toISOString(),
    })
    .eq("id", dossierId);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/confections/${dossierId}`);
  revalidatePath("/confections");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setAtelierDeadlineAction(
  dossierId: string,
  iso: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("dossiers")
    .update({ atelier_deadline_at: iso })
    .eq("id", dossierId);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/confections/${dossierId}`);
  return { ok: true };
}

export type ItemNewStatus = "recu" | "en_attente" | "confection";

export type ToggleItemResult =
  | { ok: true; newStatus: ItemNewStatus; dossierComplete: boolean }
  | { ok: false; message: string };

export async function setItemStatusAction(
  itemId: string,
  next: ItemNewStatus,
): Promise<ToggleItemResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée" };

  const { data: item, error: e1 } = await supabase
    .from("dossier_items")
    .select("id, status, label, dossier_id")
    .eq("id", itemId)
    .maybeSingle();
  if (e1) return { ok: false, message: e1.message };
  if (!item) return { ok: false, message: "Item introuvable" };

  const wasReceived = item.status === "recu";

  const { error: e2 } = await supabase
    .from("dossier_items")
    .update({
      status: next,
      received_at: next === "recu" ? new Date().toISOString() : null,
      received_by: next === "recu" ? user.id : null,
    })
    .eq("id", itemId);
  if (e2) return { ok: false, message: e2.message };

  const { data: dossier } = await supabase
    .from("dossiers")
    .select("id, number, status, client_id")
    .eq("id", item.dossier_id)
    .maybeSingle();

  const dossierComplete = dossier?.status === "pret_pose";

  if (next === "recu" && !wasReceived && dossierComplete && dossier) {
    try {
      const { data: client } = await supabase
        .from("clients")
        .select("phone, email, display_name")
        .eq("id", dossier.client_id)
        .maybeSingle();

      const { data: devisIdRow } = await supabase
        .from("dossiers")
        .select("devis_id")
        .eq("id", dossier.id)
        .maybeSingle();

      const { data: devis } = devisIdRow?.devis_id
        ? await supabase
            .from("devis")
            .select("client_access_token, total_ttc, acompte_ttc")
            .eq("id", devisIdRow.devis_id)
            .maybeSingle()
        : { data: null };

      const totalTtc = Number(devis?.total_ttc ?? 0);
      const acompteTtc = Number(devis?.acompte_ttc ?? totalTtc * 0.5);
      const soldeTtc = Math.max(0, totalTtc - acompteTtc);

      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        (process.env.RAILWAY_PUBLIC_DOMAIN
          ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
          : "https://atmospheretissus.fr");
      const portalLink = devis?.client_access_token
        ? `${appUrl}/client/${devis.client_access_token}`
        : "";

      if (client) {
        await triggerEvent("tous_recus", {
          toPhone: client.phone,
          toEmail: client.email,
          toName: client.display_name,
          clientId: dossier.client_id,
          vars: {
            prenom: firstNameOf(client.display_name),
            solde: String(Math.round(soldeTtc)),
            lien_portail: portalLink,
            numero_dossier: dossier.number,
          },
          triggerSource: "action:set-item-status",
        });
      }
    } catch (err) {
      console.warn("[trigger tous_recus from set-item-status]", err);
    }
  }

  revalidatePath(`/confections/${item.dossier_id}`);
  revalidatePath("/confections");
  revalidatePath("/reception");
  revalidatePath("/dashboard");

  return { ok: true, newStatus: next, dossierComplete };
}

/**
 * Toggle la réception d'un item de dossier depuis l'UI de la fiche confection.
 * - Si status === 'recu' → repasse en 'en_attente' (annulation)
 * - Sinon → passe à 'recu' (même effet qu'un scan QR, sans le QR)
 *
 * Trigger 'tous_recus' déclenché si on vient de basculer le DERNIER item en recu
 * et que le dossier passe à 'pret_pose' (logique identique à receiveByQrAction).
 */
export async function toggleItemReceptionAction(
  itemId: string,
): Promise<ToggleItemResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée" };

  // 1. Lit l'item courant
  const { data: item, error: e1 } = await supabase
    .from("dossier_items")
    .select("id, status, label, dossier_id")
    .eq("id", itemId)
    .maybeSingle();
  if (e1) return { ok: false, message: e1.message };
  if (!item) return { ok: false, message: "Item introuvable" };

  const wasReceived = item.status === "recu";
  const newStatus: "recu" | "en_attente" = wasReceived ? "en_attente" : "recu";

  // 2. Update
  const { error: e2 } = await supabase
    .from("dossier_items")
    .update({
      status: newStatus,
      received_at: newStatus === "recu" ? new Date().toISOString() : null,
      received_by: newStatus === "recu" ? user.id : null,
    })
    .eq("id", itemId);
  if (e2) return { ok: false, message: e2.message };

  // 3. Relit le dossier pour voir s'il vient de passer en pret_pose
  //    (les triggers DB refresh_dossier_status font le calcul auto).
  const { data: dossier } = await supabase
    .from("dossiers")
    .select("id, number, status, client_id")
    .eq("id", item.dossier_id)
    .maybeSingle();

  const dossierComplete = dossier?.status === "pret_pose";

  // 4. Si on vient de basculer en pret_pose (et qu'on a MARQUÉ reçu, pas annulé),
  //    déclenche le trigger tous_recus avec le lien portail / solde.
  if (!wasReceived && dossierComplete && dossier) {
    try {
      const { data: client } = await supabase
        .from("clients")
        .select("phone, email, display_name")
        .eq("id", dossier.client_id)
        .maybeSingle();

      const { data: devisIdRow } = await supabase
        .from("dossiers")
        .select("devis_id")
        .eq("id", dossier.id)
        .maybeSingle();

      const { data: devis } = devisIdRow?.devis_id
        ? await supabase
            .from("devis")
            .select("client_access_token, total_ttc, acompte_ttc")
            .eq("id", devisIdRow.devis_id)
            .maybeSingle()
        : { data: null };

      const totalTtc = Number(devis?.total_ttc ?? 0);
      const acompteTtc = Number(devis?.acompte_ttc ?? totalTtc * 0.5);
      const soldeTtc = Math.max(0, totalTtc - acompteTtc);

      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        (process.env.RAILWAY_PUBLIC_DOMAIN
          ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
          : "https://atmospheretissus.fr");
      const portalLink = devis?.client_access_token
        ? `${appUrl}/client/${devis.client_access_token}`
        : "";

      if (client) {
        await triggerEvent("tous_recus", {
          toPhone: client.phone,
          toEmail: client.email,
          toName: client.display_name,
          clientId: dossier.client_id,
          vars: {
            prenom: firstNameOf(client.display_name),
            solde: String(Math.round(soldeTtc)),
            lien_portail: portalLink,
            numero_dossier: dossier.number,
          },
          triggerSource: "action:toggle-item-reception",
        });
      }
    } catch (err) {
      console.warn("[trigger tous_recus from toggle]", err);
    }
  }

  revalidatePath(`/confections/${item.dossier_id}`);
  revalidatePath("/confections");
  revalidatePath("/reception");
  revalidatePath("/dashboard");

  return { ok: true, newStatus, dossierComplete };
}

/**
 * Édite les champs modifiables d'un dossier — utilisable AVANT et APRÈS
 * l'acompte (spec Atmosphère du 23/07/2026 : ne pas verrouiller la fiche
 * après paiement de l'acompte, l'atelier peut avoir besoin d'ajuster les
 * notes ou de reprogrammer la pose suite à un appel client).
 */
export async function updateDossierAction(
  dossierId: string,
  patch: {
    workshop_notes?: string | null;
    scheduled_pose_at?: string | null;
    poseur_id?: string | null;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const update: Record<string, unknown> = {};
  if (patch.workshop_notes !== undefined)
    update.workshop_notes = patch.workshop_notes?.trim() || null;
  if (patch.scheduled_pose_at !== undefined)
    update.scheduled_pose_at = patch.scheduled_pose_at;
  if (patch.poseur_id !== undefined) update.poseur_id = patch.poseur_id || null;
  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await (
    supabase as unknown as {
      from: (t: string) => {
        update: (v: Record<string, unknown>) => {
          eq: (
            c: string,
            v: string,
          ) => Promise<{ error: { message: string } | null }>;
        };
      };
    }
  )
    .from("dossiers")
    .update(update)
    .eq("id", dossierId);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/confections/${dossierId}`);
  revalidatePath("/confections");
  return { ok: true };
}

/**
 * Édite un item du dossier (libellé, ref, quantité, notes, échéance).
 * Reste accessible même après l'acompte reçu.
 */
export async function updateDossierItemAction(
  itemId: string,
  patch: {
    label?: string;
    ref?: string | null;
    qty?: number;
    unit_label?: string;
    notes?: string | null;
    expected_at?: string | null;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const update: Record<string, unknown> = {};
  if (patch.label !== undefined) {
    const l = patch.label.trim();
    if (!l) return { ok: false, message: "Libellé requis." };
    update.label = l;
  }
  if (patch.ref !== undefined) update.ref = patch.ref?.trim() || null;
  if (patch.qty !== undefined) {
    if (patch.qty <= 0) return { ok: false, message: "Quantité doit être > 0." };
    update.qty = patch.qty;
  }
  if (patch.unit_label !== undefined) update.unit_label = patch.unit_label;
  if (patch.notes !== undefined) update.notes = patch.notes?.trim() || null;
  if (patch.expected_at !== undefined) update.expected_at = patch.expected_at;
  if (Object.keys(update).length === 0) return { ok: true };

  const { data: item } = await supabase
    .from("dossier_items")
    .select("dossier_id")
    .eq("id", itemId)
    .maybeSingle();
  const { error } = await (
    supabase as unknown as {
      from: (t: string) => {
        update: (v: Record<string, unknown>) => {
          eq: (
            c: string,
            v: string,
          ) => Promise<{ error: { message: string } | null }>;
        };
      };
    }
  )
    .from("dossier_items")
    .update(update)
    .eq("id", itemId);
  if (error) return { ok: false, message: error.message };
  if (item?.dossier_id) revalidatePath(`/confections/${item.dossier_id}`);
  return { ok: true };
}
