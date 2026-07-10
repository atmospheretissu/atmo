import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { BCDetail } from "@/lib/db/bons-commande";
import { COLORS, PAGE, TYPE, SPACING, FONT_SIZE } from "./pdf-design";

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
  table: { marginBottom: SPACING.lg },
  tHead: {
    flexDirection: "row",
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 10,
    paddingRight: 10,
    borderBottom: `0.5px solid ${COLORS.borderStrong}`,
  },
  tRow: {
    flexDirection: "row",
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 10,
    paddingRight: 10,
    borderBottom: `0.5px solid ${COLORS.border}`,
  },
  tHeadText: { ...TYPE.eyebrow, fontSize: 7 },
  cRef: { width: 70 },
  cLabel: { flex: 1, paddingRight: SPACING.sm },
  cQty: { width: 55, textAlign: "right" },
  cUnit: { width: 70, textAlign: "right" },
  cTotal: { width: 75, textAlign: "right" },
  lineLabel: { ...TYPE.cellBold },
  cellNum: { ...TYPE.cell },
  cellNumBold: { ...TYPE.cellBold },
  totals: { width: 240, marginLeft: "auto", marginTop: SPACING.sm },
  totTtc: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    marginTop: SPACING.xs,
    borderTop: `0.5px solid ${COLORS.border}`,
  },
  totTtcLabel: {
    fontSize: FONT_SIZE.h4,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    lineHeight: 1.1,
  },
  totTtcValue: {
    fontSize: FONT_SIZE.h2,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    lineHeight: 1.1,
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

export function BcPDF({ detail }: { detail: BCDetail }) {
  const { bc, supplier, dossier, lines } = detail;
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
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaLabel}>{t.poDocument}</Text>
            <Text style={styles.metaValue}>{bc.number}</Text>
            <Text style={styles.metaDate}>{date(bc.created_at)}</Text>
            {dossier?.number && (
              <Text style={styles.metaDate}>
                {lang === "FR" ? "Confection" : "Ref."} {dossier.number}
              </Text>
            )}
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
                {(() => {
                  const parts = (l.label ?? "").split("\n");
                  const title = parts[0];
                  const details = parts.slice(1).join(" · ");
                  return (
                    <>
                      <Text style={styles.lineLabel}>{title}</Text>
                      {details && (
                        <Text
                          style={{
                            fontSize: 8,
                            color: "#6B7280",
                            marginTop: 2,
                            lineHeight: 1.35,
                          }}
                        >
                          {details}
                        </Text>
                      )}
                    </>
                  );
                })()}
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
