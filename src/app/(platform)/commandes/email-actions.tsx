"use server";

import { renderToBuffer } from "@react-pdf/renderer";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getBcDetail } from "@/lib/db/bons-commande";
import { BcPDF } from "@/lib/pdf/bc-pdf";
import { sendBrevoEmail, isBrevoConfigured } from "@/lib/brevo/client";

function buildBcEmailHtml(args: { bcNumber: string; amountHt: number }): string {
  const eur = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
  return `
    <div style="font-family:-apple-system,Inter,Helvetica,Arial,sans-serif;color:#111;max-width:560px;margin:auto;padding:24px;">
      <h1 style="font-size:22px;margin:0 0 12px 0;">Bon de commande ${args.bcNumber}</h1>
      <p style="margin:0 0 14px 0;color:#555;">Bonjour,</p>
      <p style="margin:0 0 14px 0;line-height:1.5;">
        Vous trouverez ci-joint notre bon de commande <strong>${args.bcNumber}</strong> d'un montant
        de <strong>${eur(args.amountHt)} HT</strong>.
      </p>
      <p style="margin:0 0 14px 0;line-height:1.5;">
        Merci de bien vouloir confirmer la prise en compte et nous indiquer une date d'expédition prévisionnelle.
      </p>
      <p style="margin:24px 0 0 0;color:#555;font-size:13px;">
        — L'équipe Atmosphère Tissus
      </p>
    </div>
  `;
}

function buildBcEmailSubject(bcNumber: string): string {
  return `Commande ${bcNumber} — Atmosphère Tissus`;
}

export type BcEmailPreview = {
  ok: true;
  bcId: string;
  bcNumber: string;
  supplierName: string;
  supplierEmail: string | null;
  subject: string;
  html: string;
  amountHt: number;
  pdfUrl: string;
} | { ok: false; message: string };

export async function getBcEmailPreviewAction(bcId: string): Promise<BcEmailPreview> {
  const detail = await getBcDetail(bcId);
  if (!detail) return { ok: false, message: "BC introuvable" };
  const { bc, supplier } = detail;
  if (!supplier) return { ok: false, message: "Aucun fournisseur sur ce BC" };
  return {
    ok: true,
    bcId: bc.id,
    bcNumber: bc.number,
    supplierName: supplier.name,
    supplierEmail: supplier.contact_email,
    subject: buildBcEmailSubject(bc.number),
    html: buildBcEmailHtml({ bcNumber: bc.number, amountHt: Number(bc.amount_ht ?? 0) }),
    amountHt: Number(bc.amount_ht ?? 0),
    pdfUrl: `/commandes/${bc.id}/pdf?inline=1`,
  };
}

export type SendBcEmailResult =
  | {
      ok: true;
      bcId: string;
      bcNumber: string;
      supplierName: string;
      emailedTo: string;
      messageId: string;
    }
  | {
      ok: false;
      bcId: string;
      message: string;
      /** true si l'envoi n'a pas démarré (Brevo absent ou pas d'email fournisseur). */
      skipped?: boolean;
    };

/**
 * Envoie un BC par email au fournisseur (Brevo + PDF en pièce jointe)
 * et bascule son statut à "envoye". Le trigger DB déplace alors le
 * dossier de "commande_validee" vers "attente_matiere".
 */
export async function sendBcByEmailAction(bcId: string): Promise<SendBcEmailResult> {
  const detail = await getBcDetail(bcId);
  if (!detail) return { ok: false, bcId, message: "BC introuvable" };

  const { bc, supplier } = detail;

  if (!supplier) return { ok: false, bcId, message: "Aucun fournisseur sur ce BC" };
  if (!supplier.contact_email) {
    return {
      ok: false,
      bcId,
      skipped: true,
      message: `Pas d'email pour ${supplier.name} — renseigne-le dans les paramètres fournisseurs.`,
    };
  }

  if (!isBrevoConfigured()) {
    // Marque tout de même comme envoyé pour faire avancer le workflow.
    const supabase = await createClient();
    await supabase
      .from("bons_commande")
      .update({ status: "envoye", sent_at: new Date().toISOString() })
      .eq("id", bcId);
    revalidatePath(`/commandes/${bcId}`);
    revalidatePath("/commandes");
    return {
      ok: false,
      bcId,
      skipped: true,
      message: "Brevo non configuré : BC marqué comme envoyé, mais aucun email n'a été envoyé.",
    };
  }

  let pdfBase64: string;
  try {
    const buffer = await renderToBuffer(<BcPDF detail={detail} />);
    pdfBase64 = Buffer.from(buffer).toString("base64");
  } catch (err) {
    return {
      ok: false,
      bcId,
      message: `Échec génération PDF : ${err instanceof Error ? err.message : "?"}`,
    };
  }

  const subject = buildBcEmailSubject(bc.number);
  const html = buildBcEmailHtml({ bcNumber: bc.number, amountHt: Number(bc.amount_ht ?? 0) });

  const res = await sendBrevoEmail({
    to: [{ email: supplier.contact_email, name: supplier.name }],
    subject,
    htmlContent: html,
    attachment: [
      {
        name: `${bc.number}.pdf`,
        content: pdfBase64,
      },
    ],
  });

  if (!res.ok) {
    return { ok: false, bcId, message: `Brevo : ${res.message}` };
  }

  const supabase = await createClient();
  await supabase
    .from("bons_commande")
    .update({ status: "envoye", sent_at: new Date().toISOString() })
    .eq("id", bcId);

  revalidatePath(`/commandes/${bcId}`);
  revalidatePath("/commandes");

  return {
    ok: true,
    bcId,
    bcNumber: bc.number,
    supplierName: supplier.name,
    emailedTo: supplier.contact_email,
    messageId: res.messageId,
  };
}
