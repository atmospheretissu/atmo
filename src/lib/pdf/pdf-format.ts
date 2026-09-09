/**
 * Formateurs monétaires et date destinés aux PDF (@react-pdf/renderer).
 *
 * ⚠️ Pourquoi ce module existe :
 * `Intl.NumberFormat("fr-FR", …)` et `Intl.DateTimeFormat("fr-FR", …)`
 * utilisent des espaces fines insécables (U+202F NARROW NO-BREAK SPACE)
 * comme séparateurs (milliers, avant l'unité monétaire). Ces caractères
 * ne sont pas dans le glyphset de Helvetica embarqué par pdf-lib /
 * @react-pdf/renderer : ils s'affichent en `/` ou en glyphe blanc, ce
 * qui donnait dans les devis « 1 155,24 € » rendu en « 1/155,24 € ».
 *
 * Idem pour U+00A0 (NBSP) et U+2009 (THIN SPACE) selon les versions du
 * runtime ICU. On les convertit tous en espace ASCII simple.
 *
 * Toujours passer par ces helpers dans les composants PDF —
 * ne jamais appeler `Intl.NumberFormat` directement dans un PDF.
 */

// Toutes les variantes d'espaces Unicode qui posent problème dans Helvetica.
// On les convertit toutes en espace ASCII (U+0020).
//   U+00A0 no-break space
//   U+1680 ogham space mark
//   U+2000..U+200A en/em/thin/hair/… spaces
//   U+202F narrow no-break space (LE COUPABLE PRINCIPAL pour le fr-FR)
//   U+205F medium mathematical space
//   U+3000 ideographic space
const WHITESPACE_UNICODE_RE = /[   -   　]/g;

/** Remplace toutes les espaces "spéciales" (Unicode) par des espaces ASCII. */
export function sanitizePdfString(s: string): string {
  return s.replace(WHITESPACE_UNICODE_RE, " ");
}

const EUR_FMT = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

/** « 1 155,24 € » — sûr pour PDF (aucune espace fine). */
export function eurPdf(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return sanitizePdfString(EUR_FMT.format(n));
}

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

/** « 07 septembre 2026 » — sûr pour PDF. */
export function datePdf(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return sanitizePdfString(DATE_FMT.format(d));
}

const DATETIME_FMT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** « 07 septembre 2026 à 14:32 » — sûr pour PDF. */
export function dateTimePdf(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return sanitizePdfString(DATETIME_FMT.format(d));
}
