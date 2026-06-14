import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendBrevoEmail } from "./client";
import { triggerEvent } from "./trigger-event";

/**
 * Notifie le commercial créateur du devis quand le client l'ouvre (portail
 * ou PDF). Fonction idempotente côté DB grâce à la garde sur client_viewed_at
 * en amont — appelée une seule fois par devis.
 *
 * Deux canaux :
 *   1. Email direct au commercial (inline, sans template) — toujours envoyé
 *      si le commercial a un email et que Brevo est configuré.
 *   2. triggerEvent("devis_vu_client") — pour que les règles configurées
 *      dans Architecture (alertes / template) puissent aussi se déclencher.
 */
export async function notifyDevisVuClient(
  devisId: string,
  source: "portail" | "pdf_download",
): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data: devis } = await supabase
    .from("devis")
    .select("number, total_ttc, product_summary, client_id, commercial_id")
    .eq("id", devisId)
    .maybeSingle();
  if (!devis) return;

  const { data: client } = devis.client_id
    ? await supabase
        .from("clients")
        .select("display_name, email, phone")
        .eq("id", devis.client_id)
        .maybeSingle()
    : { data: null };

  const { data: commercial } = devis.commercial_id
    ? await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", devis.commercial_id)
        .maybeSingle()
    : { data: null };

  // 1. Email direct au commercial (best-effort)
  if (commercial?.email) {
    const clientName = client?.display_name ?? "votre client";
    const totalLabel = new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(Number(devis.total_ttc ?? 0));
    const sourceLabel =
      source === "pdf_download" ? "a téléchargé le PDF" : "a ouvert son devis sur le portail";

    const html = `
      <div style="font-family:Arial,sans-serif;font-size:14px;color:#111;line-height:1.6">
        <p>Bonjour ${commercial.full_name ?? ""},</p>
        <p><strong>${clientName}</strong> ${sourceLabel}.</p>
        <ul style="background:#f4f4f4;border-radius:8px;padding:14px 18px;list-style:none">
          <li><strong>Devis :</strong> ${devis.number}</li>
          <li><strong>Produit :</strong> ${devis.product_summary ?? "—"}</li>
          <li><strong>Total TTC :</strong> ${totalLabel}</li>
        </ul>
        <p style="font-size:12px;color:#666">Atmosphère Tissus — notification automatique</p>
      </div>
    `;
    await sendBrevoEmail({
      to: [{ email: commercial.email, name: commercial.full_name ?? undefined }],
      subject: `${clientName} a vu son devis ${devis.number}`,
      htmlContent: html,
      textContent: `${clientName} ${sourceLabel}. Devis ${devis.number} · Total ${totalLabel}.`,
    });
  }

  // 2. Déclenche le workflow configurable (Architecture)
  try {
    await triggerEvent("devis_vu_client", {
      toPhone: client?.phone ?? null,
      toEmail: commercial?.email ?? null,
      toName: commercial?.full_name ?? null,
      clientId: devis.client_id ?? null,
      vars: {
        devis_number: devis.number,
        client_name: client?.display_name ?? "",
        product_summary: devis.product_summary ?? "",
        source: source === "pdf_download" ? "téléchargement PDF" : "portail",
      },
      triggerSource: `devis_vu:${source}`,
    });
  } catch {
    // pas bloquant — l'email direct au commercial a déjà été envoyé
  }
}
