"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ReceiveResult =
  | {
      ok: true;
      item: {
        id: string;
        label: string;
        ref: string | null;
        qr_code: string;
        dossierId: string;
        dossierNumber: string;
        clientName: string;
        wasAlreadyReceived: boolean;
        dossierComplete: boolean;
      };
    }
  | { ok: false; message: string };

/**
 * Marque un dossier_item comme reçu via son QR code.
 * Triggers DB (refresh_dossier_status) mettent à jour le statut du dossier.
 * Retourne l'item + l'info dossier pour feedback UI.
 */
export async function receiveByQrAction(qrCode: string): Promise<ReceiveResult> {
  const code = qrCode.trim();
  if (!code) return { ok: false, message: "QR code vide" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée" };

  // 1. Recherche l'item
  const { data: item, error: e1 } = await supabase
    .from("dossier_items")
    .select("*")
    .eq("qr_code", code)
    .maybeSingle();

  if (e1) return { ok: false, message: e1.message };
  if (!item) return { ok: false, message: `QR inconnu : ${code}` };

  const wasAlreadyReceived = item.status === "recu";

  // 2. Marque comme reçu (si pas déjà)
  if (!wasAlreadyReceived) {
    const { error: e2 } = await supabase
      .from("dossier_items")
      .update({
        status: "recu",
        received_at: new Date().toISOString(),
        received_by: user.id,
      })
      .eq("id", item.id);
    if (e2) return { ok: false, message: e2.message };
  }

  // 3. Récupère dossier + client pour feedback
  const { data: dossier } = await supabase
    .from("dossiers")
    .select("id, number, client_id, status")
    .eq("id", item.dossier_id)
    .maybeSingle();

  const { data: client } = dossier
    ? await supabase
        .from("clients")
        .select("display_name")
        .eq("id", dossier.client_id)
        .maybeSingle()
    : { data: null };

  revalidatePath("/reception");
  revalidatePath("/confections");
  revalidatePath("/dashboard");
  if (dossier) revalidatePath(`/confections/${dossier.id}`);

  return {
    ok: true,
    item: {
      id: item.id,
      label: item.label,
      ref: item.ref,
      qr_code: item.qr_code,
      dossierId: dossier?.id ?? "",
      dossierNumber: dossier?.number ?? "",
      clientName: client?.display_name ?? "—",
      wasAlreadyReceived,
      dossierComplete: dossier?.status === "pret_pose",
    },
  };
}

/**
 * Liste les items en attente de réception (pour la liste "à scanner").
 */
export async function getPendingReceptionItems() {
  const supabase = await createClient();
  const { data: items, error } = await supabase
    .from("dossier_items")
    .select("id, label, ref, qr_code, type, status, dossier_id")
    .in("status", ["en_attente", "commande", "expedie"])
    .order("position", { ascending: true });
  if (error) return [];

  if (!items || items.length === 0) return [];

  const dossierIds = Array.from(new Set(items.map((i) => i.dossier_id)));
  const { data: dossiers } = await supabase
    .from("dossiers")
    .select("id, number, client_id")
    .in("id", dossierIds);

  const clientIds = (dossiers ?? []).map((d) => d.client_id);
  const { data: clients } = await supabase
    .from("clients")
    .select("id, display_name")
    .in("id", clientIds);

  const dossiersById = new Map((dossiers ?? []).map((d) => [d.id, d]));
  const clientsById = new Map((clients ?? []).map((c) => [c.id, c]));

  return items.map((i) => {
    const d = dossiersById.get(i.dossier_id);
    return {
      ...i,
      dossierNumber: d?.number ?? "",
      clientName: d ? clientsById.get(d.client_id)?.display_name ?? "—" : "—",
    };
  });
}

/**
 * Liste les réceptions récentes (aujourd'hui).
 */
export async function getRecentReceptions(limit = 8) {
  const supabase = await createClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: items, error } = await supabase
    .from("dossier_items")
    .select("id, label, ref, qr_code, received_at, received_by, dossier_id")
    .eq("status", "recu")
    .gte("received_at", todayStart.toISOString())
    .order("received_at", { ascending: false })
    .limit(limit);

  if (error || !items) return [];

  const dossierIds = Array.from(new Set(items.map((i) => i.dossier_id)));
  const { data: dossiers } = await supabase
    .from("dossiers")
    .select("id, number, client_id")
    .in("id", dossierIds);
  const clientIds = (dossiers ?? []).map((d) => d.client_id);
  const { data: clients } = await supabase
    .from("clients")
    .select("id, display_name")
    .in("id", clientIds);
  const dossiersById = new Map((dossiers ?? []).map((d) => [d.id, d]));
  const clientsById = new Map((clients ?? []).map((c) => [c.id, c]));

  return items.map((i) => {
    const d = dossiersById.get(i.dossier_id);
    return {
      ...i,
      dossierNumber: d?.number ?? "",
      clientName: d ? clientsById.get(d.client_id)?.display_name ?? "—" : "—",
    };
  });
}
