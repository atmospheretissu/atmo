/* eslint-disable jsx-a11y/alt-text */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Database } from "@/lib/supabase/types";

type Devis = Database["public"]["Tables"]["devis"]["Row"];
type DevisLine = Database["public"]["Tables"]["devis_lines"]["Row"];
type Client = Database["public"]["Tables"]["clients"]["Row"];

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n);

const date = (d: string | null) =>
  d
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date(d))
    : "—";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: "#111111",
    lineHeight: 1.4,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: "1px solid #E5E7EB",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoMark: {
    width: 32,
    height: 32,
    backgroundColor: "#FACC15",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  logoMarkText: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#111" },
  brandName: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  brandSub: { fontSize: 7.5, color: "#6B7280", letterSpacing: 1.5 },
  meta: { textAlign: "right" },
  metaLabel: { fontSize: 7.5, color: "#6B7280", letterSpacing: 1, textTransform: "uppercase" },
  metaValue: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  // Two-column block
  twoCol: { flexDirection: "row", gap: 20, marginBottom: 22 },
  col: { flex: 1 },
  blockTitle: {
    fontSize: 8.5,
    color: "#6B7280",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  blockBody: { fontSize: 10 },
  blockSub: { color: "#374151" },
  // Hero number
  hero: {
    marginBottom: 22,
    padding: 16,
    borderRadius: 6,
    backgroundColor: "#F8F7FB",
    border: "1px solid #E5E7EB",
  },
  heroLabel: {
    fontSize: 8.5,
    color: "#6B7280",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  heroValue: { fontSize: 26, fontFamily: "Helvetica-Bold" },
  heroSub: { fontSize: 9, color: "#6B7280", marginTop: 4 },
  // Table
  table: { marginBottom: 18 },
  tHead: {
    flexDirection: "row",
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    backgroundColor: "#F4F4F4",
    borderTop: "1px solid #E5E7EB",
    borderBottom: "1px solid #E5E7EB",
  },
  tRow: {
    flexDirection: "row",
    paddingTop: 7,
    paddingBottom: 7,
    paddingLeft: 8,
    paddingRight: 8,
    borderBottom: "1px solid #E5E7EB",
  },
  tHeadText: { fontSize: 7.5, color: "#6B7280", letterSpacing: 1, textTransform: "uppercase" },
  cRef: { width: 60 },
  cLabel: { flex: 1 },
  cQty: { width: 50, textAlign: "right" },
  cUnit: { width: 70, textAlign: "right" },
  cTotal: { width: 70, textAlign: "right" },
  lineLabel: { fontFamily: "Helvetica-Bold" },
  lineDetail: { fontSize: 8, color: "#6B7280", marginTop: 2 },
  // Totals
  totals: { width: 240, marginLeft: "auto", marginTop: 4 },
  tot: { flexDirection: "row", justifyContent: "space-between", paddingTop: 4, paddingBottom: 4 },
  totLabel: { color: "#6B7280" },
  totValue: {},
  totTtc: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 8,
    marginTop: 4,
    borderTop: "1px solid #E5E7EB",
  },
  totTtcLabel: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  totTtcValue: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  // Acompte block
  acompte: {
    marginTop: 18,
    padding: 14,
    backgroundColor: "#111111",
    color: "#FFFFFF",
    borderRadius: 6,
  },
  acompteLabel: {
    fontSize: 8.5,
    color: "#FFFFFF",
    opacity: 0.7,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  acompteValue: { color: "#FFFFFF", fontSize: 22, fontFamily: "Helvetica-Bold" },
  acompteSub: { color: "#FFFFFF", opacity: 0.8, fontSize: 9, marginTop: 6, maxWidth: 360 },
  // Footer
  footer: {
    position: "absolute",
    bottom: 18,
    left: 32,
    right: 32,
    paddingTop: 8,
    borderTop: "1px solid #E5E7EB",
    fontSize: 7.5,
    color: "#9CA3AF",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

/**
 * Retire les mentions de mesures (laize, dimensions, métrage…) d'une chaîne libre.
 * Utilisé quand le devis a hide_measurements_for_client=true et qu'on génère
 * la version client du PDF.
 */
function stripMeasurements(input: string | null | undefined): string | null {
  if (!input) return input ?? null;
  let s = input;
  // dimensions "240×250cm" ou "240x250 cm"
  s = s.replace(/\d+\s*[×x]\s*\d+\s*cm/gi, "");
  // "laize 140cm"
  s = s.replace(/laize\s*\d+\s*cm/gi, "");
  // "métrage 8.70m"
  s = s.replace(/m[ée]trage\s*\d+[.,]?\d*\s*m/gi, "");
  // "240 cm linéaire" / "240 cm"
  s = s.replace(/\d+\s*cm\s*lin[ée]aire/gi, "");
  // bullets/séparateurs orphelins
  s = s.replace(/\s*·\s*·\s*/g, " · ");
  s = s.replace(/^\s*·\s*|\s*·\s*$/g, "");
  s = s.replace(/\s{2,}/g, " ").trim();
  return s || null;
}

export function DevisPDF({
  devis,
  client,
  lines,
  hideMeasurements = false,
}: {
  devis: Devis;
  client: Client | null;
  lines: DevisLine[];
  hideMeasurements?: boolean;
}) {
  const totalHt = Number(devis.total_ht ?? 0);
  const totalTtc = Number(devis.total_ttc ?? 0);
  const tva = totalTtc - totalHt;
  const acomptePct = Number((devis as { acompte_pct?: number }).acompte_pct ?? 50);
  const acompte = Number(devis.acompte_ttc ?? (totalTtc * acomptePct) / 100);
  const solde = totalTtc - acompte;

  const visibleLines = hideMeasurements
    ? lines.map((l) => ({ ...l, detail: stripMeasurements(l.detail) }))
    : lines;
  const productDetail = hideMeasurements
    ? stripMeasurements(devis.product_detail)
    : devis.product_detail;

  return (
    <Document
      title={`Devis ${devis.number}`}
      author="Atmosphère Tissus"
      subject={`Devis pour ${client?.display_name ?? ""}`}
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.logoMark}>
              <Text style={styles.logoMarkText}>A</Text>
            </View>
            <View>
              <Text style={styles.brandName}>Atmosphère Tissus</Text>
              <Text style={styles.brandSub}>DÉCORATION SUR MESURE</Text>
            </View>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaLabel}>DEVIS</Text>
            <Text style={styles.metaValue}>{devis.number}</Text>
            <Text style={{ fontSize: 8, color: "#6B7280", marginTop: 2 }}>
              Version {devis.version} · {date(devis.created_at)}
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
            {client?.phone && <Text style={styles.blockSub}>{client.phone}</Text>}
          </View>
        </View>

        {/* Synthèse */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>TOTAL TTC</Text>
          <Text style={styles.heroValue}>{eur(totalTtc)}</Text>
          <Text style={styles.heroSub}>
            {devis.product_summary}
            {productDetail ? ` · ${productDetail}` : ""}
          </Text>
          <Text style={[styles.heroSub, { marginTop: 2 }]}>
            Validité du devis : jusqu'au {date(devis.valid_until)}
          </Text>
        </View>

        {/* Table de lignes */}
        <View style={styles.table}>
          <View style={styles.tHead}>
            <Text style={[styles.tHeadText, styles.cRef]}>Réf.</Text>
            <Text style={[styles.tHeadText, styles.cLabel]}>Désignation</Text>
            <Text style={[styles.tHeadText, styles.cQty]}>Qté</Text>
            <Text style={[styles.tHeadText, styles.cUnit]}>P.U. HT</Text>
            <Text style={[styles.tHeadText, styles.cTotal]}>Total HT</Text>
          </View>
          {visibleLines.map((l) => (
            <View style={styles.tRow} key={l.id}>
              <Text style={[styles.cRef, { fontSize: 8, color: "#6B7280" }]}>
                {l.ref ?? "—"}
              </Text>
              <View style={styles.cLabel}>
                <Text style={styles.lineLabel}>{l.label}</Text>
                {l.detail && <Text style={styles.lineDetail}>{l.detail}</Text>}
              </View>
              <Text style={styles.cQty}>
                {Number(l.qty)} {l.unit_label}
              </Text>
              <Text style={styles.cUnit}>{eur(Number(l.unit_price_ht))}</Text>
              <Text style={styles.cTotal}>{eur(Number(l.total_ht ?? 0))}</Text>
            </View>
          ))}
        </View>

        {/* Totaux */}
        <View style={styles.totals}>
          <View style={styles.tot}>
            <Text style={styles.totLabel}>Sous-total HT</Text>
            <Text>{eur(totalHt)}</Text>
          </View>
          <View style={styles.tot}>
            <Text style={styles.totLabel}>TVA {Number(devis.tva_rate ?? 20)} %</Text>
            <Text>{eur(tva)}</Text>
          </View>
          <View style={styles.totTtc}>
            <Text style={styles.totTtcLabel}>Total TTC</Text>
            <Text style={styles.totTtcValue}>{eur(totalTtc)}</Text>
          </View>
        </View>

        {/* Acompte */}
        <View style={styles.acompte}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View>
              <Text style={styles.acompteLabel}>
                {acomptePct === 100
                  ? "PAIEMENT INTÉGRAL À LA COMMANDE"
                  : `RÈGLE ${acomptePct} % · ACOMPTE DE VALIDATION`}
              </Text>
              <Text style={styles.acompteValue}>{eur(acompte)}</Text>
              <Text style={styles.acompteSub}>
                {acomptePct === 100
                  ? "Le montant TTC est à régler intégralement à la commande."
                  : `Un acompte de ${acomptePct} % du montant TTC est requis à la validation pour déclencher la commande des fournitures et la confection. Solde dû avant la pose.`}
              </Text>
            </View>
            {acomptePct < 100 && (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.acompteLabel, { textAlign: "right" }]}>SOLDE</Text>
                <Text style={{ color: "#FFFFFF", fontSize: 12 }}>{eur(solde)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Notes atelier — optionnel */}
        {devis.workshop_notes && (
          <View style={{ marginTop: 18 }}>
            <Text style={styles.blockTitle}>Notes atelier</Text>
            <Text style={styles.blockBody}>{devis.workshop_notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>
            Atmosphère Tissus · SAS · 33 cours du Maréchal Foch, 33000 Bordeaux
          </Text>
          <Text>
            {devis.number} — Page <Text render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
          </Text>
        </View>
      </Page>
    </Document>
  );
}
