"use server";

import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { FacturePDF, type FactureKind } from "@/lib/pdf/facture-pdf";
import { sendBrevoEmail, isBrevoConfigured } from "@/lib/brevo/client";
import { createStripeCheckoutForSoldeAction } from "./stripe-actions";
import { eurPdf } from "@/lib/pdf/pdf-format";

export type SendFactureEmailResult =
  | {
      ok: true;
      messageId: string;
      emailedTo: string;
      kind: FactureKind;
      stripeUrl: string | null;
    }
  | { ok: false; message: string };

/**
 * Envoie une facture (acompte ou solde) au client par email, PDF en PJ.
 * Pour le solde, joint aussi un lien Stripe Checkout pour que le client
 * puisse régler en ligne (F8 PE 08/09).
 *
 * Appelée automatiquement à l'encaissement (F9) ET disponible en manuel
 * depuis la page devis.
 */
export async function sendFactureEmailAction(
  devisId: string,
  kind: FactureKind,
  opts?: { paidAt?: string | null; paidMethod?: string | null },
): Promise<SendFactureEmailResult> {
  if (!isBrevoConfigured()) {
    return { ok: false, message: "Brevo non configuré (BREVO_API_KEY absent)." };
  }

  const supabase = await createClient();
  const { data: devis } = await supabase
    .from("devis")
    .select("*")
    .eq("id", devisId)
    .maybeSingle();
  if (!devis) return { ok: false, message: "Devis introuvable." };

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", devis.client_id)
    .maybeSingle();
  if (!client?.email) {
    return { ok: false, message: "Le client n'a pas d'email enregistré." };
  }

  const invoiceNumber = kind === "acompte" ? `FA-${devis.number.replace(/^DEV-/, "")}` : `FS-${devis.number.replace(/^DEV-/, "")}`;

  // 1. PDF facture
  let pdfBase64: string;
  try {
    const buffer = await renderToBuffer(
      <FacturePDF
        kind={kind}
        devis={devis}
        client={client}
        invoiceNumber={invoiceNumber}
        paidAt={opts?.paidAt ?? new Date().toISOString()}
        paidMethod={opts?.paidMethod ?? null}
      />,
    );
    pdfBase64 = Buffer.from(buffer).toString("base64");
  } catch (err) {
    return {
      ok: false,
      message: `Échec génération PDF facture : ${err instanceof Error ? err.message : "?"}`,
    };
  }

  // 2. Lien Stripe pour le solde (F8)
  let stripeUrl: string | null = null;
  if (kind === "solde") {
    const r = await createStripeCheckoutForSoldeAction(devisId);
    if (r.ok) stripeUrl = r.url;
  }

  // 3. Construit le HTML
  const totalTtc = Number(devis.total_ttc ?? 0);
  const acompteTtc = Number(devis.acompte_ttc ?? totalTtc * 0.5);
  const soldeTtc = Math.max(0, totalTtc - acompteTtc);
  const amount = kind === "acompte" ? acompteTtc : soldeTtc;
  const firstName = client.display_name.split(",")[1]?.trim() ?? client.display_name;

  const titre = kind === "acompte"
    ? "Merci pour votre acompte"
    : "Facture de solde";
  const introText = kind === "acompte"
    ? "Nous avons bien reçu votre acompte. Vous trouverez la facture correspondante en pièce jointe. Nous lançons dès à présent la commande de vos fournitures et la confection."
    : "Vos articles sont prêts. Vous trouverez la facture de solde en pièce jointe. Vous pouvez régler en ligne via le bouton ci-dessous ou directement en magasin lors de la pose.";

  const html = `<!DOCTYPE html>
<html lang="fr"><body style="font-family: Arial, Helvetica, sans-serif; color: #0F172A; margin: 0; padding: 24px; background: #F8FAFC;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
    <p style="font-size: 11px; letter-spacing: 1.5px; color: #94A3B8; text-transform: uppercase; margin: 0 0 8px;">Atmosphère Tissus</p>
    <h1 style="font-size: 22px; margin: 0 0 16px; color: #0F172A;">${titre}</h1>
    <p style="font-size: 14px; line-height: 1.55; color: #334155; margin: 0 0 20px;">Bonjour ${firstName},</p>
    <p style="font-size: 14px; line-height: 1.55; color: #334155; margin: 0 0 20px;">${introText}</p>

    <div style="background: #F1F5F9; border-radius: 8px; padding: 16px 20px; margin: 0 0 24px;">
      <p style="font-size: 11px; color: #64748B; margin: 0 0 4px; letter-spacing: 0.5px; text-transform: uppercase;">Montant ${kind === "acompte" ? "d'acompte" : "du solde"}</p>
      <p style="font-size: 28px; font-weight: bold; color: #0F172A; margin: 0; letter-spacing: -0.5px;">${eurPdf(amount)}</p>
      <p style="font-size: 12px; color: #64748B; margin: 6px 0 0;">Facture ${invoiceNumber} · Devis ${devis.number}</p>
    </div>

    ${stripeUrl ? `
    <div style="text-align: center; margin: 0 0 24px;">
      <a href="${stripeUrl}" style="display: inline-block; background: #6366F1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
        Payer le solde en ligne (${eurPdf(soldeTtc)})
      </a>
      <p style="font-size: 12px; color: #64748B; margin: 8px 0 0;">Paiement sécurisé par Stripe · CB</p>
    </div>
    ` : ""}

    <p style="font-size: 12px; color: #64748B; line-height: 1.55; margin: 24px 0 0; border-top: 1px solid #E2E8F0; padding-top: 16px;">
      Atmosphère Tissus · 1 rue de l'Union, Village des Voiles, 59520 Marquette-lez-Lille<br/>
      contact@atmospheretissus.fr · 03 20 72 46 15
    </p>
  </div>
</body></html>`;

  const subject = kind === "acompte"
    ? `ATMOSPHERE – Votre commande est validée (${devis.number})`
    : `ATMOSPHERE – Facture de solde ${devis.number}`;

  const filename = `${invoiceNumber}.pdf`;

  const res = await sendBrevoEmail({
    to: [{ email: client.email, name: client.display_name }],
    subject,
    htmlContent: html,
    attachment: [{ content: pdfBase64, name: filename }],
  });

  if (!res.ok) return { ok: false, message: res.message };
  return {
    ok: true,
    messageId: res.messageId,
    emailedTo: client.email,
    kind,
    stripeUrl,
  };
}
