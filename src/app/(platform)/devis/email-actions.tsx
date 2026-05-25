"use server";

import { renderToBuffer } from "@react-pdf/renderer";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDevisDetail } from "@/lib/db/devis";
import { DevisPDF } from "@/lib/pdf/devis-pdf";
import { sendBrevoEmail, isBrevoConfigured } from "@/lib/brevo/client";
import { createStripeCheckoutAction } from "./stripe-actions";

export type SendDevisEmailResult =
  | {
      ok: true;
      messageId: string;
      emailedTo: string;
      stripeUrl: string | null;
      stripeError: string | null;
    }
  | { ok: false; message: string };

/**
 * Envoie le devis par email au client (Brevo + PDF en pièce jointe).
 * Marque le devis comme 'envoye' et stamp 'sent_at'.
 */
export async function sendDevisEmailAction(
  devisId: string
): Promise<SendDevisEmailResult> {
  if (!isBrevoConfigured()) {
    return {
      ok: false,
      message: "Brevo non configuré (manque BREVO_API_KEY).",
    };
  }

  const result = await getDevisDetail(devisId);
  if (!result) return { ok: false, message: "Devis introuvable." };
  const { devis, client, lines } = result;

  if (!client?.email) {
    return {
      ok: false,
      message: "Le client n'a pas d'email enregistré.",
    };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  // 1. Génère le PDF
  let pdfBase64: string;
  try {
    const buffer = await renderToBuffer(
      <DevisPDF devis={devis} client={client} lines={lines} />
    );
    pdfBase64 = Buffer.from(buffer).toString("base64");
  } catch (err) {
    return {
      ok: false,
      message: `Échec génération PDF : ${err instanceof Error ? err.message : "?"}`,
    };
  }

  // 2. Construit le HTML
  const totalTtc = Number(devis.total_ttc ?? 0);
  const acompte = Number(devis.acompte_ttc ?? totalTtc * 0.5);
  const eur = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(n);

  const firstName = client.display_name.split(",")[1]?.trim() ?? client.display_name;
  const pdfLink = `${appUrl}/devis/${devis.id}/pdf`;

  // Génère le lien Stripe d'acompte (best-effort — si Stripe indispo, l'email
  // part quand même, juste sans bouton de paiement).
  let stripeUrl: string | null = null;
  let stripeError: string | null = null;
  try {
    const stripeResult = await createStripeCheckoutAction(devisId);
    if (stripeResult.ok) {
      stripeUrl = stripeResult.url;
    } else {
      stripeError = stripeResult.message;
    }
  } catch (err) {
    stripeError = err instanceof Error ? err.message : "Erreur inconnue";
    console.warn("[devis email] Stripe link non généré:", err);
  }

  const payButtonHtml = stripeUrl
    ? `<p style="margin:20px 0 12px 0">
        <a href="${stripeUrl}" style="display:inline-block;padding:14px 22px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;letter-spacing:0.2px">
          ✓ Accepter et payer l'acompte ${eur(acompte)}
        </a>
      </p>
      <p style="margin:0 0 16px 0;font-size:11.5px;color:#9ca3af">
        Paiement 100% sécurisé via Stripe. Carte bancaire — encaissement immédiat.
      </p>`
    : `<p style="margin:8px 0 16px 0;font-size:12px;color:#9ca3af;font-style:italic">
        Pour valider et payer l'acompte, contactez Atmosphère Tissus au 05 56 XX XX XX.
      </p>`;

  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f8f7fb;padding:24px;margin:0;color:#111111">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="padding:20px 24px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center">
      <div style="width:32px;height:32px;background:#FACC15;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;color:#111;margin-right:10px;">A</div>
      <strong style="font-size:15px">Atmosphère Tissus</strong>
    </div>
    <div style="padding:24px">
      <p style="margin:0 0 16px 0;font-size:14px">Bonjour ${firstName},</p>
      <p style="margin:0 0 16px 0;font-size:14px;line-height:1.5">
        Voici votre devis <strong>${devis.number}</strong> pour ${devis.product_summary}.
      </p>
      <div style="background:#f4f4f4;border-radius:8px;padding:16px;margin:16px 0">
        <div style="font-size:11px;color:#6b7280;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Total TTC</div>
        <div style="font-size:24px;font-weight:bold">${eur(totalTtc)}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:8px">
          Acompte 50 % à la validation : <strong>${eur(acompte)}</strong>
        </div>
      </div>
      <p style="margin:0 0 16px 0;font-size:13px;line-height:1.5;color:#6b7280">
        Le devis détaillé est en pièce jointe. Pour le valider, un acompte de 50% est requis
        à la commande, le solde est dû avant la pose.
      </p>
      ${payButtonHtml}
      <p style="margin:16px 0">
        <a href="${pdfLink}" style="display:inline-block;padding:10px 16px;background:#111111;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:13px">Télécharger le PDF du devis</a>
      </p>
      <p style="margin:24px 0 0 0;font-size:12px;color:#6b7280">
        À très vite,<br/>L'équipe Atmosphère Tissus
      </p>
    </div>
    <div style="padding:14px 24px;background:#f8f7fb;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af">
      Atmosphère Tissus · 33 cours du Maréchal Foch, 33000 Bordeaux<br/>
      Ce message contient des informations confidentielles.
    </div>
  </div>
  </body></html>`;

  const text = `Bonjour ${firstName},

Voici votre devis ${devis.number} pour ${devis.product_summary}.
Total TTC : ${eur(totalTtc)}
Acompte 50% à la validation : ${eur(acompte)}

${stripeUrl ? `Accepter et payer l'acompte en ligne :\n${stripeUrl}\n\n` : ""}PDF détaillé en pièce jointe.

L'équipe Atmosphère Tissus`;

  // 3. Envoi Brevo
  const sendResult = await sendBrevoEmail({
    to: [{ email: client.email, name: client.display_name }],
    subject: `Atmosphère Tissus — Devis ${devis.number}`,
    htmlContent: html,
    textContent: text,
    attachment: [
      {
        name: `${devis.number}.pdf`,
        content: pdfBase64,
      },
    ],
  });

  if (!sendResult.ok) {
    return { ok: false, message: sendResult.message };
  }

  // 4. Update devis status + sent_at + log
  await supabase
    .from("devis")
    .update({ status: "envoye", sent_at: new Date().toISOString() })
    .eq("id", devisId);

  revalidatePath(`/devis/${devisId}`);
  revalidatePath("/devis");
  revalidatePath("/dashboard");

  return {
    ok: true,
    messageId: sendResult.messageId,
    emailedTo: client.email,
    stripeUrl,
    stripeError,
  };
}
