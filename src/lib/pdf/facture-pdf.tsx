/* eslint-disable jsx-a11y/alt-text */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Database } from "@/lib/supabase/types";
import { COLORS, PAGE, TYPE, SPACING, FONT_SIZE } from "./pdf-design";

type Devis = Database["public"]["Tables"]["devis"]["Row"];
type Client = Database["public"]["Tables"]["clients"]["Row"];

export type FactureKind = "acompte" | "solde";

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n);

const date = (d: string | null | Date) =>
  d
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date(d))
    : "—";

const styles = StyleSheet.create({
  page: { ...PAGE },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.xl,
    paddingBottom: SPACING.md,
    borderBottom: `0.5px solid ${COLORS.border}`,
  },
  brand: { flexDirection: "column" },
  brandName: TYPE.wordmark,
  meta: { textAlign: "right" },
  metaLabel: TYPE.eyebrow,
  metaValue: { ...TYPE.h3, marginTop: SPACING.xs },
  metaDate: {
    fontSize: FONT_SIZE.small,
    color: COLORS.textMuted,
    marginTop: 3,
    lineHeight: 1.3,
  },
  twoCol: { flexDirection: "row", gap: SPACING.xl, marginBottom: SPACING.xl },
  col: { flex: 1 },
  blockTitle: { ...TYPE.eyebrow, marginBottom: SPACING.sm },
  blockBody: { ...TYPE.body, fontFamily: "Helvetica-Bold", color: COLORS.ink },
  blockSub: { ...TYPE.body, color: COLORS.text, marginTop: 2 },
  hero: {
    marginBottom: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    paddingLeft: SPACING.lg,
    paddingRight: SPACING.lg,
    borderRadius: 4,
    backgroundColor: COLORS.surface,
    border: `0.5px solid ${COLORS.border}`,
  },
  heroLabel: { ...TYPE.eyebrow, marginBottom: SPACING.sm },
  heroValue: TYPE.heroNumber,
  heroSub: {
    fontSize: FONT_SIZE.body,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    lineHeight: 1.4,
  },
  summary: {
    marginTop: SPACING.lg,
    border: `0.5px solid ${COLORS.border}`,
    borderRadius: 4,
  },
  sumRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    paddingLeft: SPACING.md,
    paddingRight: SPACING.md,
    borderBottom: `0.5px solid ${COLORS.border}`,
  },
  sumRowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    paddingLeft: SPACING.md,
    paddingRight: SPACING.md,
  },
  sumLabel: { ...TYPE.body, color: COLORS.text },
  sumValue: {
    ...TYPE.body,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
  },
  paidStamp: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    paddingLeft: SPACING.lg,
    paddingRight: SPACING.lg,
    backgroundColor: "#ECFDF5",
    border: "0.5px solid #10B981",
    borderRadius: 4,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  paidLabel: {
    fontSize: FONT_SIZE.micro,
    color: "#047857",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.3,
  },
  paidSub: {
    fontSize: FONT_SIZE.small,
    color: "#047857",
    marginTop: SPACING.xs,
    lineHeight: 1.4,
  },
  duStamp: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    paddingLeft: SPACING.lg,
    paddingRight: SPACING.lg,
    backgroundColor: "#FEF3C7",
    border: "0.5px solid #F59E0B",
    borderRadius: 4,
  },
  duLabel: {
    fontSize: FONT_SIZE.micro,
    color: "#92400E",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.3,
  },
  duValue: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#92400E",
    marginTop: SPACING.xs,
    lineHeight: 1.1,
    letterSpacing: -0.3,
  },
  duSub: {
    fontSize: FONT_SIZE.small,
    color: "#92400E",
    marginTop: SPACING.xs,
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: PAGE.paddingHorizontal,
    right: PAGE.paddingHorizontal,
    paddingTop: SPACING.sm,
    borderTop: `0.5px solid ${COLORS.border}`,
    fontSize: FONT_SIZE.micro,
    color: COLORS.textFaint,
    flexDirection: "row",
    justifyContent: "space-between",
    lineHeight: 1.4,
  },
});

export function FacturePDF({
  kind,
  devis,
  client,
  invoiceNumber,
  paidAt,
  paidMethod,
}: {
  kind: FactureKind;
  devis: Devis;
  client: Client | null;
  invoiceNumber: string;
  paidAt: string | null;
  paidMethod: string | null;
}) {
  const totalTtc = Number(devis.total_ttc ?? 0);
  const totalHt = Number(devis.total_ht ?? 0);
  const tva = totalTtc - totalHt;
  const acomptePct = Number((devis as { acompte_pct?: number }).acompte_pct ?? 50);
  const acompteTtc = Number(devis.acompte_ttc ?? (totalTtc * acomptePct) / 100);
  const soldeTtc = Math.max(0, totalTtc - acompteTtc);

  const isAcompte = kind === "acompte";
  const amountTtc = isAcompte ? acompteTtc : soldeTtc;
  const amountHt = round2(amountTtc / (1 + Number(devis.tva_rate ?? 20) / 100));
  const amountTva = round2(amountTtc - amountHt);

  const title = isAcompte
    ? `Facture d'acompte ${acomptePct}%`
    : "Facture de solde";

  return (
    <Document
      title={`${title} ${devis.number}`}
      author="Atmosphère Tissus"
      subject={`${title} pour ${client?.display_name ?? ""}`}
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brand}>
            <Text style={styles.brandName}>Atmosphère.</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaLabel}>
              {isAcompte ? "Facture acompte" : "Facture de solde"}
            </Text>
            <Text style={styles.metaValue}>{invoiceNumber}</Text>
            <Text style={styles.metaDate}>
              {date(paidAt ?? new Date())}
            </Text>
          </View>
        </View>

        {/* Émetteur + Client */}
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.blockTitle}>Émetteur</Text>
            <Text style={styles.blockBody}>Atmosphère Tissus</Text>
            <Text style={styles.blockSub}>33 cours du Maréchal Foch</Text>
            <Text style={styles.blockSub}>33000 Bordeaux</Text>
            <Text style={styles.blockSub}>contact@atmospheretissus.fr</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.blockTitle}>Client</Text>
            <Text style={styles.blockBody}>{client?.display_name ?? "—"}</Text>
            {client?.address_pose && <Text style={styles.blockSub}>{client.address_pose}</Text>}
            {(client?.postal_code || client?.city) && (
              <Text style={styles.blockSub}>
                {client?.postal_code} {client?.city}
              </Text>
            )}
            {client?.email && <Text style={styles.blockSub}>{client.email}</Text>}
          </View>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>{title}</Text>
          <Text style={styles.heroValue}>{eur(amountTtc)}</Text>
          <Text style={styles.heroSub}>
            Relative au devis {devis.number} · {devis.product_summary}
          </Text>
        </View>

        {/* Tableau */}
        <View style={styles.summary}>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Montant HT</Text>
            <Text style={styles.sumValue}>{eur(amountHt)}</Text>
          </View>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>
              TVA {Number(devis.tva_rate ?? 20)} %
            </Text>
            <Text style={styles.sumValue}>{eur(amountTva)}</Text>
          </View>
          <View style={styles.sumRowLast}>
            <Text style={[styles.sumLabel, { fontFamily: "Helvetica-Bold" }]}>
              Total TTC
            </Text>
            <Text style={[styles.sumValue, { fontSize: 12 }]}>
              {eur(amountTtc)}
            </Text>
          </View>
        </View>

        {/* Stamp acquittée vs dû */}
        {paidAt ? (
          <View style={styles.paidStamp}>
            <View>
              <Text style={styles.paidLabel}>Acquittée</Text>
              <Text style={styles.paidSub}>
                Payée le {date(paidAt)}
                {paidMethod ? ` · ${labelMethod(paidMethod)}` : ""}
              </Text>
            </View>
            <Text style={[styles.paidLabel, { fontSize: 18 }]}>
              {eur(amountTtc)}
            </Text>
          </View>
        ) : (
          <View style={styles.duStamp}>
            <Text style={styles.duLabel}>À régler</Text>
            <Text style={styles.duValue}>{eur(amountTtc)}</Text>
            <Text style={styles.duSub}>
              {isAcompte
                ? `Acompte de ${acomptePct}% à régler pour démarrer la commande.`
                : "Solde à régler avant la pose."}
            </Text>
          </View>
        )}

        {/* Récap global */}
        <View style={{ marginTop: 14 }}>
          <Text style={styles.blockTitle}>Récapitulatif du devis</Text>
          <View style={[styles.summary, { marginTop: 4 }]}>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>Total commande TTC</Text>
              <Text style={styles.sumValue}>{eur(totalTtc)}</Text>
            </View>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>
                Acompte {acomptePct}% {isAcompte ? "(cette facture)" : ""}
              </Text>
              <Text style={styles.sumValue}>{eur(acompteTtc)}</Text>
            </View>
            <View style={styles.sumRowLast}>
              <Text style={styles.sumLabel}>
                Solde {!isAcompte ? "(cette facture)" : ""}
              </Text>
              <Text style={styles.sumValue}>{eur(soldeTtc)}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>
            Atmosphère Tissus · SAS · 33 cours du Maréchal Foch, 33000 Bordeaux
          </Text>
          <Text>
            {invoiceNumber} — Page{" "}
            <Text render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
          </Text>
        </View>
      </Page>
    </Document>
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

const METHOD_LABELS: Record<string, string> = {
  stripe: "Stripe (CB)",
  cb: "Carte bancaire",
  cheque: "Chèque",
  virement: "Virement",
  especes: "Espèces",
};

function labelMethod(m: string): string {
  return METHOD_LABELS[m] ?? m;
}

// Tiens en sync avec les autres fonctions date
export { date };
