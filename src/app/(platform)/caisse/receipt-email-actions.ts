"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendBrevoEmail, isBrevoConfigured } from "@/lib/brevo/client";
import { wrapAtmoEmail } from "@/lib/brevo/email-shell";

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n);

const METHOD_LABEL: Record<string, string> = {
  especes: "Espèces",
  cb: "CB",
  cheque: "Chèque",
  virement: "Virement",
  stripe: "Stripe",
};

/**
 * Envoie le reçu d'un ticket caisse par email au client. Utilise Brevo
 * si configuré. Le contenu est un HTML propre (shell Atmo) listant les
 * articles + total + mode(s) de règlement (mixte géré) + numéro ticket.
 */
export async function sendCaisseReceiptAction(
  ticketId: string,
  email: string,
): Promise<{ ok: true; messageId: string } | { ok: false; message: string }> {
  const trimmed = (email ?? "").trim();
  if (!trimmed || !trimmed.includes("@")) {
    return { ok: false, message: "Email invalide." };
  }
  if (!isBrevoConfigured()) {
    return {
      ok: false,
      message:
        "L'envoi email nécessite la variable BREVO_API_KEY configurée sur Railway.",
    };
  }

  const sb = createServiceRoleClient();

  // Fetch ticket + lignes
  const { data: ticket, error: tErr } = await (
    sb as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (
            c: string,
            v: string,
          ) => {
            maybeSingle: () => Promise<{
              data: {
                id: string;
                number: string;
                total_ht: number | string | null;
                total_ttc: number | string | null;
                discount_pct: number | string | null;
                payment_method: string;
                payment_method_2: string | null;
                amount_1: number | string | null;
                amount_2: number | string | null;
                cash_received: number | string | null;
                change_due: number | string | null;
                created_at: string;
              } | null;
              error: { message?: string } | null;
            }>;
          };
        };
      };
    }
  )
    .from("caisse_tickets")
    .select(
      "id, number, total_ht, total_ttc, discount_pct, payment_method, payment_method_2, amount_1, amount_2, cash_received, change_due, created_at",
    )
    .eq("id", ticketId)
    .maybeSingle();

  if (tErr) return { ok: false, message: `DB ticket : ${tErr.message}` };
  if (!ticket) return { ok: false, message: "Ticket introuvable." };

  const { data: lines } = await sb
    .from("caisse_ticket_lines")
    .select("label, qty, unit_label, unit_price_ht")
    .eq("ticket_id", ticket.id)
    .order("position", { ascending: true });

  const totalTtc = Number(ticket.total_ttc ?? 0);
  const totalHt = Number(ticket.total_ht ?? 0);
  const discount = Number(ticket.discount_pct ?? 0);
  const method1 = METHOD_LABEL[ticket.payment_method] ?? ticket.payment_method;
  const isSplit =
    ticket.payment_method_2 &&
    ticket.amount_1 != null &&
    ticket.amount_2 != null;

  const dateStr = new Date(ticket.created_at).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const linesHtml = (lines ?? [])
    .map(
      (l) => `
      <tr>
        <td style="padding:6px 0;font-size:12.5px;color:#374151">
          ${escape(l.label ?? "")}
          <span style="color:#9ca3af">· ${Number(l.qty ?? 0)} ${escape(l.unit_label ?? "")}</span>
        </td>
        <td style="padding:6px 0;text-align:right;font-size:12.5px;color:#111;font-weight:600;white-space:nowrap">
          ${eur(Number(l.qty ?? 0) * Number(l.unit_price_ht ?? 0))}
        </td>
      </tr>`,
    )
    .join("");

  const paymentBlock = isSplit
    ? `<p style="margin:0 0 6px 0"><strong>Paiement mixte :</strong></p>
       <ul style="margin:0 0 12px 20px;padding:0;font-size:13px;color:#374151">
         <li>${escape(method1)} — <strong>${eur(Number(ticket.amount_1))}</strong></li>
         <li>${escape(METHOD_LABEL[ticket.payment_method_2 ?? ""] ?? ticket.payment_method_2 ?? "")} — <strong>${eur(Number(ticket.amount_2))}</strong></li>
       </ul>`
    : `<p style="margin:0 0 12px 0"><strong>Mode de règlement :</strong> ${escape(method1)}${
        ticket.change_due && Number(ticket.change_due) > 0
          ? ` · Rendu <strong>${eur(Number(ticket.change_due))}</strong>`
          : ""
      }</p>`;

  const inner = `
    <p style="margin:0 0 12px 0">Bonjour,</p>
    <p style="margin:0 0 12px 0">Voici votre reçu pour l'achat du <strong>${dateStr}</strong> — ticket <span style="font-family:monospace">${escape(ticket.number)}</span>.</p>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:16px 0;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb">
      ${linesHtml}
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin-bottom:16px">
      <tr>
        <td style="padding:2px 0;font-size:12px;color:#6b7280">Sous-total HT</td>
        <td style="padding:2px 0;text-align:right;font-size:12px;color:#6b7280;font-family:monospace">${eur(totalHt)}</td>
      </tr>
      ${
        discount > 0
          ? `<tr><td style="padding:2px 0;font-size:12px;color:#6b7280">Remise ${discount}%</td><td style="padding:2px 0;text-align:right;font-size:12px;color:#6b7280"></td></tr>`
          : ""
      }
      <tr>
        <td style="padding:6px 0 2px 0;font-size:14px;font-weight:700;color:#111">Total TTC</td>
        <td style="padding:6px 0 2px 0;text-align:right;font-size:18px;font-weight:700;color:#111;font-family:monospace">${eur(totalTtc)}</td>
      </tr>
    </table>

    ${paymentBlock}

    <p style="margin:16px 0 0 0;font-size:12px;color:#6b7280">
      Ce reçu est purement informatif — pour une facture officielle,
      contactez-nous.
    </p>
  `;

  const html = wrapAtmoEmail(inner, {
    preheader: `Reçu ticket ${ticket.number}`,
    title: `Reçu · ${eur(totalTtc)}`,
  });

  const res = await sendBrevoEmail({
    to: [{ email: trimmed }],
    subject: `Atmosphère Tissus — Reçu ${ticket.number}`,
    htmlContent: html,
  });

  if (!res.ok) return { ok: false, message: res.message };
  return { ok: true, messageId: res.messageId };
}

function escape(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
