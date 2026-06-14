import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { BCDetail } from "@/lib/db/bons-commande";

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

type Lang = "FR" | "DE" | "PL" | "UA";

const I18N: Record<Lang, {
  poDocument: string;
  supplier: string;
  buyer: string;
  reference: string;
  designation: string;
  qty: string;
  unit: string;
  total: string;
  subtotalHt: string;
  expectedDelivery: string;
  notes: string;
  thanks: string;
  pageOf: (p: number, t: number) => string;
  shipTo: string;
  billTo: string;
}> = {
  FR: {
    poDocument: "BON DE COMMANDE",
    supplier: "Fournisseur",
    buyer: "Acheteur",
    reference: "Réf.",
    designation: "Désignation",
    qty: "Qté",
    unit: "P.U. HT",
    total: "Total HT",
    subtotalHt: "Total HT",
    expectedDelivery: "Livraison attendue",
    notes: "Notes",
    thanks: "Merci de confirmer la disponibilité et la date d'expédition.",
    pageOf: (p, t) => `Page ${p}/${t}`,
    shipTo: "Adresse de livraison",
    billTo: "Adresse de facturation",
  },
  DE: {
    poDocument: "BESTELLUNG",
    supplier: "Lieferant",
    buyer: "Käufer",
    reference: "Ref.",
    designation: "Bezeichnung",
    qty: "Menge",
    unit: "Einzelpreis",
    total: "Gesamt netto",
    subtotalHt: "Gesamt netto",
    expectedDelivery: "Erwartete Lieferung",
    notes: "Anmerkungen",
    thanks: "Bitte Verfügbarkeit und Versanddatum bestätigen.",
    pageOf: (p, t) => `Seite ${p}/${t}`,
    shipTo: "Lieferadresse",
    billTo: "Rechnungsadresse",
  },
  PL: {
    poDocument: "ZAMÓWIENIE",
    supplier: "Dostawca",
    buyer: "Kupujący",
    reference: "Ref.",
    designation: "Opis",
    qty: "Ilość",
    unit: "Cena jedn.",
    total: "Suma netto",
    subtotalHt: "Suma netto",
    expectedDelivery: "Spodziewana dostawa",
    notes: "Uwagi",
    thanks: "Prosimy o potwierdzenie dostępności i terminu wysyłki.",
    pageOf: (p, t) => `Strona ${p}/${t}`,
    shipTo: "Adres dostawy",
    billTo: "Adres do faktury",
  },
  UA: {
    poDocument: "ЗАМОВЛЕННЯ",
    supplier: "Постачальник",
    buyer: "Покупець",
    reference: "Реф.",
    designation: "Опис",
    qty: "К-сть",
    unit: "Ціна",
    total: "Разом",
    subtotalHt: "Разом",
    expectedDelivery: "Очікувана доставка",
    notes: "Примітки",
    thanks: "Будь ласка, підтвердьте наявність і дату відправлення.",
    pageOf: (p, t) => `Стор. ${p}/${t}`,
    shipTo: "Адреса доставки",
    billTo: "Адреса виставлення рахунку",
  },
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: "#111111",
    lineHeight: 1.4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: "1px solid #E5E7EB",
  },
  brand: { flexDirection: "column" },
  brandName: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#111", letterSpacing: -0.3 },
  brandSub: { fontSize: 7.5, color: "#6B7280", letterSpacing: 1.8, marginTop: 2 },
  meta: { textAlign: "right" },
  metaLabel: { fontSize: 7.5, color: "#6B7280", letterSpacing: 1, textTransform: "uppercase" },
  metaValue: { fontSize: 10, fontFamily: "Helvetica-Bold" },
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
  totals: { width: 240, marginLeft: "auto", marginTop: 4 },
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

export function BcPDF({ detail }: { detail: BCDetail }) {
  const { bc, supplier, lines } = detail;
  const lang = (bc.language ?? "FR") as Lang;
  const t = I18N[lang] ?? I18N.FR;
  const total = Number(bc.amount_ht ?? 0);

  return (
    <Document
      title={`BC ${bc.number}`}
      author="Atmosphère Tissus"
      subject={`Bon de commande ${bc.number}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Text style={styles.brandName}>Atmosphère.</Text>
            <Text style={styles.brandSub}>DÉCORATION SUR MESURE</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaLabel}>{t.poDocument}</Text>
            <Text style={styles.metaValue}>{bc.number}</Text>
            <Text style={{ fontSize: 8, color: "#6B7280", marginTop: 2 }}>{date(bc.created_at)}</Text>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.blockTitle}>{t.buyer}</Text>
            <Text style={styles.blockBody}>Atmosphère Tissus</Text>
            <Text style={styles.blockSub}>33 cours du Maréchal Foch</Text>
            <Text style={styles.blockSub}>33000 Bordeaux — France</Text>
            <Text style={styles.blockSub}>contact@atmospheretissus.fr</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.blockTitle}>{t.supplier}</Text>
            <Text style={styles.blockBody}>{supplier?.name ?? "—"}</Text>
            {supplier?.country && <Text style={styles.blockSub}>{supplier.country}</Text>}
            {supplier?.contact_email && <Text style={styles.blockSub}>{supplier.contact_email}</Text>}
            {supplier?.contact_phone && <Text style={styles.blockSub}>{supplier.contact_phone}</Text>}
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>{t.subtotalHt}</Text>
          <Text style={styles.heroValue}>{eur(total)}</Text>
          {bc.expected_at && (
            <Text style={styles.heroSub}>
              {t.expectedDelivery} : {date(bc.expected_at)}
            </Text>
          )}
        </View>

        <View style={styles.table}>
          <View style={styles.tHead}>
            <Text style={[styles.tHeadText, styles.cRef]}>{t.reference}</Text>
            <Text style={[styles.tHeadText, styles.cLabel]}>{t.designation}</Text>
            <Text style={[styles.tHeadText, styles.cQty]}>{t.qty}</Text>
            <Text style={[styles.tHeadText, styles.cUnit]}>{t.unit}</Text>
            <Text style={[styles.tHeadText, styles.cTotal]}>{t.total}</Text>
          </View>
          {lines.map((l) => (
            <View style={styles.tRow} key={l.id}>
              <Text style={[styles.cRef, { fontSize: 8, color: "#6B7280" }]}>
                {l.ref ?? "—"}
              </Text>
              <View style={styles.cLabel}>
                <Text style={styles.lineLabel}>{l.label}</Text>
              </View>
              <Text style={styles.cQty}>
                {Number(l.qty)} {l.unit_label}
              </Text>
              <Text style={styles.cUnit}>{eur(Number(l.unit_price_ht ?? 0))}</Text>
              <Text style={styles.cTotal}>
                {eur(Number(l.total_ht ?? Number(l.qty) * Number(l.unit_price_ht ?? 0)))}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totTtc}>
            <Text style={styles.totTtcLabel}>{t.subtotalHt}</Text>
            <Text style={styles.totTtcValue}>{eur(total)}</Text>
          </View>
        </View>

        {bc.notes && (
          <View style={{ marginTop: 18 }}>
            <Text style={styles.blockTitle}>{t.notes}</Text>
            <Text style={styles.blockBody}>{bc.notes}</Text>
          </View>
        )}

        <View style={{ marginTop: 18 }}>
          <Text style={{ fontSize: 9, color: "#374151" }}>{t.thanks}</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>
            Atmosphère Tissus · SAS · 33 cours du Maréchal Foch, 33000 Bordeaux
          </Text>
          <Text>
            {bc.number} —{" "}
            <Text
              render={({ pageNumber, totalPages }) => t.pageOf(pageNumber, totalPages)}
            />
          </Text>
        </View>
      </Page>
    </Document>
  );
}
