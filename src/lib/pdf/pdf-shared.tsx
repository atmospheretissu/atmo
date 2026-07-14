/* eslint-disable jsx-a11y/alt-text */
import {
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import {
  COLORS,
  PAGE,
  TYPE,
  SPACING,
  FONT_SIZE,
  COMPANY,
  CGV_SECTIONS,
  companyAddress,
} from "./pdf-design";
import { LOGO_ATMOSPHERE_DATA_URI } from "@/assets/logo-atmosphere";

const styles = StyleSheet.create({
  page: { ...PAGE },
  footer: {
    position: "absolute",
    bottom: 24,
    left: PAGE.paddingHorizontal,
    right: PAGE.paddingHorizontal,
    paddingTop: SPACING.sm,
    borderTop: `0.5px solid ${COLORS.border}`,
  },
  footerLegal: {
    fontSize: FONT_SIZE.micro,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 1.5,
  },
  footerLegalStrong: {
    fontSize: FONT_SIZE.micro,
    color: COLORS.text,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    lineHeight: 1.5,
  },
  footerPage: {
    fontSize: FONT_SIZE.micro,
    color: COLORS.textFaint,
    textAlign: "right",
    marginTop: 2,
  },
  cgvTitle: {
    fontSize: FONT_SIZE.h2,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    lineHeight: 1.15,
    marginBottom: SPACING.md,
  },
  cgvSection: { marginBottom: SPACING.md },
  cgvSectionTitle: {
    fontSize: FONT_SIZE.body,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    lineHeight: 1.35,
    marginBottom: 3,
  },
  cgvBody: {
    fontSize: FONT_SIZE.body,
    color: COLORS.text,
    lineHeight: 1.55,
  },
  cgvAccept: {
    marginTop: SPACING.xl,
    fontSize: FONT_SIZE.small,
    color: COLORS.textMuted,
    lineHeight: 1.5,
    fontStyle: "italic",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.xl,
    paddingBottom: SPACING.md,
    borderBottom: `0.5px solid ${COLORS.border}`,
  },
  logo: {
    width: 130,
    height: 44,
    objectFit: "contain",
  },
  meta: { textAlign: "right" },
  metaLabel: TYPE.eyebrow,
  metaValue: { ...TYPE.h3, marginTop: SPACING.xs },
  metaDate: {
    fontSize: FONT_SIZE.small,
    color: COLORS.textMuted,
    marginTop: 3,
    lineHeight: 1.3,
  },
});

/**
 * Header logo + meta partagé par tous les PDFs.
 * @param label      "Devis", "Facture acompte"…
 * @param number     numéro du document
 * @param subtitle   ex: "Version 2 · 12 juillet 2026"
 */
export function PdfHeader({
  label,
  number,
  subtitle,
}: {
  label: string;
  number: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.headerRow}>
      <Image src={LOGO_ATMOSPHERE_DATA_URI} style={styles.logo} />
      <View style={styles.meta}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue}>{number}</Text>
        {subtitle ? <Text style={styles.metaDate}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

/**
 * Footer légal fixe reproduit sur toutes les pages.
 * Contient la dénomination sociale, siret, RCS, code APE et TVA intra
 * — obligatoires sur les documents commerciaux + numéro de page.
 */
export function PdfLegalFooter({ docNumber }: { docNumber?: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerLegalStrong}>
        {COMPANY.legalName} · {COMPANY.capital}
      </Text>
      <Text style={styles.footerLegal}>
        N° Siret : {COMPANY.siret} · {COMPANY.rcs} · Code APE : {COMPANY.codeApe}
        {" · "}TVA intracommunautaire : {COMPANY.tvaIntra}
      </Text>
      <Text style={styles.footerLegal}>
        {companyAddress()} · {COMPANY.email}
      </Text>
      <Text style={styles.footerPage}>
        {docNumber ? `${docNumber} · ` : ""}
        Page{" "}
        <Text
          render={({ pageNumber, totalPages }) =>
            `${pageNumber}/${totalPages}`
          }
        />
      </Text>
    </View>
  );
}

/**
 * Bloc modalités et coordonnées bancaires — pour le devis uniquement.
 * Affiche l'acompte à verser, l'IBAN/BIC et la mention libellé virement.
 */
export function ModalitesReglementBlock({
  acomptePct,
  acompteTtc,
  eur,
}: {
  acomptePct: number;
  acompteTtc: number;
  eur: (n: number) => string;
}) {
  return (
    <View
      style={{
        marginTop: SPACING.lg,
        padding: SPACING.md,
        border: `0.5px solid ${COLORS.border}`,
        borderRadius: 4,
        backgroundColor: COLORS.surface,
      }}
    >
      <Text
        style={{
          fontSize: FONT_SIZE.body,
          fontFamily: "Helvetica-Bold",
          color: COLORS.ink,
          marginBottom: SPACING.xs,
          lineHeight: 1.35,
        }}
      >
        Modalités et conditions de règlement :
      </Text>
      <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.text, lineHeight: 1.5 }}>
        Acompte : {acomptePct}% à la commande soit{" "}
        <Text style={{ fontFamily: "Helvetica-Bold" }}>{eur(acompteTtc)}</Text>
      </Text>
      <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.text, lineHeight: 1.5 }}>
        Le restant dû 3 jours avant la pose
      </Text>
      <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.text, lineHeight: 1.5 }}>
        Par virement bancaire ou carte bancaire
      </Text>
      <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.text, lineHeight: 1.5 }}>
        Code B.I.C : {COMPANY.bic}
      </Text>
      <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.text, lineHeight: 1.5 }}>
        Code I.B.A.N : {COMPANY.iban}
      </Text>
      <Text
        style={{
          fontSize: FONT_SIZE.small,
          fontFamily: "Helvetica-Bold",
          color: COLORS.ink,
          marginTop: SPACING.sm,
          lineHeight: 1.4,
        }}
      >
        MERCI D&apos;INDIQUER LE NUMÉRO DE DEVIS DANS LE LIBELLÉ DE L&apos;ORDRE
        DE VIREMENT DE L&apos;ACOMPTE.
      </Text>
      <Text
        style={{
          fontSize: FONT_SIZE.small,
          color: COLORS.textMuted,
          marginTop: SPACING.sm,
          lineHeight: 1.4,
        }}
      >
        Ce devis est valable 30 jours.{"\n"}
        Toute commande est soumise à l&apos;acceptation préalable de nos
        conditions générales de vente.
      </Text>
    </View>
  );
}

/**
 * Page CGV réutilisable (texte exact fourni par le client).
 * Reproduite sur devis, facture d'acompte et facture de solde.
 */
export function CgvPage({ docNumber }: { docNumber: string }) {
  return (
    <Page size="A4" style={styles.page}>
      <PdfHeader label="Annexe" number="CGV" subtitle={docNumber} />

      <Text style={styles.cgvTitle}>Conditions Générales de Vente</Text>

      {CGV_SECTIONS.map((s, i) => (
        <View key={i} style={styles.cgvSection} wrap={false}>
          <Text style={styles.cgvSectionTitle}>{s.title}</Text>
          <Text style={styles.cgvBody}>{s.body}</Text>
        </View>
      ))}

      <Text style={styles.cgvAccept}>
        La signature du devis vaut acceptation sans réserve des présentes
        conditions générales de vente.
      </Text>

      <PdfLegalFooter docNumber={`${docNumber} — CGV`} />
    </Page>
  );
}

/**
 * Bloc « attestation de signature électronique » interne à Atmosphère.
 * Affiché sur le devis quand une signature a été capturée (aucun tiers).
 */
export function SignatureEvidenceBlock({
  signedAt,
  signedByName,
  signedByPhone,
}: {
  signedAt: string;
  signedByName: string;
  signedByPhone?: string | null;
}) {
  const d = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(signedAt));
  return (
    <View
      style={{
        marginTop: SPACING.lg,
        padding: SPACING.md,
        border: `1px solid #10B981`,
        borderRadius: 4,
        backgroundColor: "#ECFDF5",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: SPACING.sm,
      }}
    >
      <Text
        style={{
          fontSize: 20,
          color: "#059669",
          fontFamily: "Helvetica-Bold",
          lineHeight: 1,
        }}
      >
        ✓
      </Text>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: FONT_SIZE.body,
            fontFamily: "Helvetica-Bold",
            color: "#047857",
            lineHeight: 1.4,
          }}
        >
          Attestation de signature électronique
        </Text>
        <Text
          style={{
            fontSize: FONT_SIZE.small,
            color: "#065F46",
            marginTop: 3,
            lineHeight: 1.5,
          }}
        >
          Le {d} par{" "}
          <Text style={{ fontFamily: "Helvetica-Bold" }}>{signedByName}</Text>
          {signedByPhone ? ` (${signedByPhone})` : ""}
        </Text>
      </View>
    </View>
  );
}
