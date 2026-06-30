/**
 * Design tokens partagés par tous les PDFs (devis, BC, facture, fiche).
 *
 * Règle critique pour @react-pdf : toujours définir un `lineHeight` explicite
 * sur les gros textes (titres, hero values), sinon la lineHeight par défaut
 * du Page (1.4) provoque des chevauchements quand le bloc suivant a un
 * marginTop calculé sur la fontSize seule.
 */

export const COLORS = {
  ink: "#0F1115",
  text: "#1F2937",
  textMuted: "#6B7280",
  textFaint: "#9CA3AF",
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  surface: "#F9FAFB",
  surfaceSoft: "#F3F4F6",
  accent: "#7C3AED",
  accentSoft: "#F5F3FF",
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const FONT_SIZE = {
  micro: 7.5,
  small: 8.5,
  body: 9.5,
  bodyLg: 10.5,
  h4: 12,
  h3: 14,
  h2: 18,
  h1: 24,
  hero: 30,
} as const;

export const TYPE = {
  /** Mono small caps for labels (Émetteur, Client, Total TTC…) */
  eyebrow: {
    fontSize: FONT_SIZE.micro,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
    lineHeight: 1.3,
  },
  /** Body text */
  body: {
    fontSize: FONT_SIZE.body,
    color: COLORS.text,
    lineHeight: 1.45,
  },
  bodyMuted: {
    fontSize: FONT_SIZE.body,
    color: COLORS.textMuted,
    lineHeight: 1.45,
  },
  /** For table cells */
  cell: {
    fontSize: FONT_SIZE.body,
    color: COLORS.text,
    lineHeight: 1.35,
  },
  cellBold: {
    fontSize: FONT_SIZE.body,
    color: COLORS.ink,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.35,
  },
  /** Large hero numbers (totaux, montants) — lineHeight 1 = pas de chevauchement */
  heroNumber: {
    fontSize: FONT_SIZE.hero,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    lineHeight: 1.05,
    letterSpacing: -0.4,
  },
  h1: {
    fontSize: FONT_SIZE.h1,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    lineHeight: 1.1,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: FONT_SIZE.h2,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    lineHeight: 1.15,
    letterSpacing: -0.2,
  },
  h3: {
    fontSize: FONT_SIZE.h3,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    lineHeight: 1.2,
  },
  /** Wordmark "Atmosphère." en haut de chaque doc */
  wordmark: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    lineHeight: 1.05,
    letterSpacing: -0.4,
  },
};

export const PAGE = {
  /** Marges intérieures de la page A4 — généreuses pour respirer */
  paddingTop: 44,
  paddingBottom: 48, // + place pour le footer fixe
  paddingHorizontal: 44,
  fontFamily: "Helvetica",
  fontSize: FONT_SIZE.body,
  color: COLORS.text,
  lineHeight: 1.45,
} as const;
