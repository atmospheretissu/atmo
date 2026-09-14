/**
 * Shell HTML unique pour tous les mails transactionnels Atmosphère Tissus.
 * Applique un design cohérent (header, contenu, footer) autour du body inséré
 * en template — évite de dupliquer les styles/logo dans chaque template DB.
 *
 * Le body reçu peut être du HTML libre (interpolé depuis email_templates)
 * ou du HTML enrichi avec un CTA. Un placeholder <!-- atmo:cta --> peut être
 * remplacé automatiquement par le CTA principal si présent.
 */

const BRAND_COLOR = "#7c3aed"; // violet
const INK = "#111111";
const MUTED = "#6b7280";
const BG = "#f8f7fb";
const CARD_BG = "#ffffff";
const BORDER = "#e5e7eb";

export type AtmoEmailOptions = {
  /** Bouton principal (Payer, Voir le suivi, Signer, etc.) */
  primaryCta?: { label: string; url: string; color?: string };
  /** Lien secondaire discret sous le CTA (ex: "Voir mon suivi de commande") */
  secondaryLink?: { label: string; url: string };
  /** Titre au sommet du bloc principal (H1 court) */
  title?: string;
  /** Pré-header invisible dans la boîte de réception (aperçu Gmail/Outlook) */
  preheader?: string;
};

export function wrapAtmoEmail(
  innerHtml: string,
  opts: AtmoEmailOptions = {},
): string {
  const {
    primaryCta,
    secondaryLink,
    title,
    preheader = "Atmosphère Tissus",
  } = opts;

  const ctaBlock = primaryCta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0">
         <tr><td>
           <a href="${escapeAttr(primaryCta.url)}" style="display:inline-block;padding:14px 24px;background:${primaryCta.color ?? BRAND_COLOR};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;letter-spacing:0.2px;font-family:Arial,sans-serif">${escapeHtml(primaryCta.label)}</a>
         </td></tr>
       </table>`
    : "";

  const secondaryBlock = secondaryLink
    ? `<p style="margin:0 0 16px 0;font-size:12.5px;color:${MUTED};font-family:Arial,sans-serif">
         <a href="${escapeAttr(secondaryLink.url)}" style="color:${BRAND_COLOR};text-decoration:none;font-weight:600">${escapeHtml(secondaryLink.label)} →</a>
       </p>`
    : "";

  const titleBlock = title
    ? `<h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.25;font-weight:700;color:${INK};font-family:Arial,sans-serif">${escapeHtml(title)}</h1>`
    : "";

  // Insère automatiquement le CTA à la place du marqueur si présent dans le body
  const bodyWithCta = innerHtml.includes("<!-- atmo:cta -->")
    ? innerHtml.replace("<!-- atmo:cta -->", ctaBlock)
    : innerHtml + ctaBlock;

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>Atmosphère Tissus</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:Arial,Helvetica,sans-serif;color:${INK}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;font-size:1px;line-height:1px">${escapeHtml(preheader)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${BG};padding:24px 12px">
  <tr>
    <td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;width:100%;background:${CARD_BG};border-radius:14px;overflow:hidden;border:1px solid ${BORDER};box-shadow:0 2px 12px rgba(15,23,42,0.04)">
        <tr>
          <td style="padding:20px 28px;border-bottom:1px solid ${BORDER}">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td>
                  <span style="display:inline-block;width:34px;height:34px;background:#FACC15;border-radius:8px;text-align:center;line-height:34px;font-weight:700;font-size:16px;color:${INK};vertical-align:middle">A</span>
                  <span style="display:inline-block;margin-left:10px;font-size:15px;font-weight:700;color:${INK};vertical-align:middle">Atmosphère Tissus</span>
                </td>
                <td align="right" style="font-size:11px;color:${MUTED};letter-spacing:0.4px;text-transform:uppercase">
                  Rideaux · Stores · Pose
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 28px 8px 28px">
            ${titleBlock}
            <div style="font-size:14px;line-height:1.55;color:${INK}">
              ${bodyWithCta}
            </div>
            ${secondaryBlock}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 28px 24px 28px;border-top:1px solid ${BORDER};background:#fafafa">
            <p style="margin:0 0 6px 0;font-size:11.5px;color:${MUTED};line-height:1.5">
              <strong style="color:${INK}">Atmosphère Tissus</strong> · 1 rue de l'Union, Village des Voiles, 59520 Marquette-lez-Lille
            </p>
            <p style="margin:0 0 6px 0;font-size:11.5px;color:${MUTED}">
              <a href="tel:+33320724615" style="color:${MUTED};text-decoration:none">03 20 72 46 15</a>
              · <a href="mailto:contact@atmospheretissus.fr" style="color:${MUTED};text-decoration:none">contact@atmospheretissus.fr</a>
              · <a href="https://atmospheretissus.fr" style="color:${MUTED};text-decoration:none">atmospheretissus.fr</a>
            </p>
            <p style="margin:8px 0 0 0;font-size:10.5px;color:#9ca3af">
              Ce message contient des informations confidentielles destinées à leur seul destinataire.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

/**
 * Extrait les options CTA d'un dict de variables. Convention :
 *   {{cta_primary_url}} / {{cta_primary_label}} : bouton principal
 *   {{lien_portail}}                            : lien secondaire "Suivre ma commande"
 *
 * Toujours passer ces vars aux triggers pour que les mails aient
 * automatiquement un bouton d'action utile.
 */
export function extractCtaFromVars(
  vars: Record<string, string | number | undefined | null>,
): AtmoEmailOptions {
  const opts: AtmoEmailOptions = {};
  const ctaLabel = vars.cta_primary_label;
  const ctaUrl = vars.cta_primary_url;
  const portailUrl = vars.lien_portail;
  const signUrl = vars.lien_signature;
  const pdfUrl = vars.lien_pdf;
  const avisUrl = vars.lien_avis;

  // 1. CTA explicite si fourni par le trigger
  if (ctaLabel && ctaUrl && String(ctaUrl).startsWith("http")) {
    opts.primaryCta = { label: String(ctaLabel), url: String(ctaUrl) };
  }
  // 2. Fallback intelligent selon les vars disponibles — signature d'abord
  //    (le devis n'est pas encore signé), puis portail (suivre / payer),
  //    puis avis (post-pose), puis PDF (devis à télécharger).
  else if (signUrl && String(signUrl).startsWith("http")) {
    opts.primaryCta = {
      label: "Signer et payer l'acompte",
      url: String(signUrl),
    };
  } else if (portailUrl && String(portailUrl).startsWith("http")) {
    opts.primaryCta = {
      label: "Accéder à mon espace client",
      url: String(portailUrl),
    };
  } else if (avisUrl && String(avisUrl).startsWith("http")) {
    opts.primaryCta = { label: "Donner mon avis", url: String(avisUrl) };
  } else if (pdfUrl && String(pdfUrl).startsWith("http")) {
    opts.primaryCta = { label: "Télécharger mon devis", url: String(pdfUrl) };
  }

  // 3. Lien secondaire portail (sous le CTA) — seulement si le CTA principal
  //    ne pointe pas déjà vers le portail
  if (
    portailUrl &&
    String(portailUrl).startsWith("http") &&
    opts.primaryCta?.url !== String(portailUrl)
  ) {
    opts.secondaryLink = {
      label: "Suivre ma commande sur mon espace client",
      url: String(portailUrl),
    };
  }
  return opts;
}
