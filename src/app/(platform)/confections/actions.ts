"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { triggerEvent, firstNameOf } from "@/lib/brevo/trigger-event";

export type ToggleItemResult =
  | { ok: true; newStatus: "recu" | "en_attente"; dossierComplete: boolean }
  | { ok: false; message: string };

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
