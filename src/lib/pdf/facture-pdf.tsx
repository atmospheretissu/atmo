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
  // Tableau résumé
  summary: {
    marginTop: 16,
    border: "1px solid #E5E7EB",
    borderRadius: 6,
  },
  sumRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 12,
    paddingRight: 12,
    borderBottom: "1px solid #E5E7EB",
  },
  sumRowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 12,
    paddingRight: 12,
  },
  sumLabel: { color: "#374151" },
  sumValue: { fontFamily: "Helvetica-Bold" },
  // Bloc paid stamp
  paidStamp: {
    marginTop: 18,
    padding: 14,
    backgroundColor: "#ECFDF5",
    border: "1px solid #10B981",
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  paidLabel: {
    fontSize: 9,
    color: "#047857",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
  },
  paidSub: { fontSize: 8.5, color: "#047857", marginTop: 4 },
  duStamp: {
    marginTop: 18,
    padding: 14,
    backgroundColor: "#FEF3C7",
    border: "1px solid #F59E0B",
    borderRadius: 6,
  },
  duLabel: {
    fontSize: 9,
    color: "#92400E",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
  },
  duValue: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#92400E", marginTop: 4 },
  duSub: { fontSize: 8.5, color: "#92400E", marginTop: 4 },
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
            <View style={styles.logoMark}>
              <Text style={styles.logoMarkText}>A</Text>
            </View>
            <View>
              <Text style={styles.brandName}>Atmosphère Tissus</Text>
              <Text style={styles.brandSub}>DÉCORATION SUR MESURE</Text>
            </View>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaLabel}>
              {isAcompte ? "Facture acompte" : "Facture de solde"}
            </Text>
            <Text style={styles.metaValue}>{invoiceNumber}</Text>
            <Text style={{ fontSize: 8, color: "#6B7280", marginTop: 2 }}>
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
