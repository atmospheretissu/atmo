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
  page: { ...PAGE },
  // Header
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
  // Two-column block (Émetteur / Client)
  twoCol: { flexDirection: "row", gap: SPACING.xl, marginBottom: SPACING.xl },
  col: { flex: 1 },
  blockTitle: { ...TYPE.eyebrow, marginBottom: SPACING.sm },
  blockBody: { ...TYPE.body, fontFamily: "Helvetica-Bold", color: COLORS.ink },
  blockSub: { ...TYPE.body, color: COLORS.text, marginTop: 2 },
  // Hero number
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
  // Table
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
  lineRefMuted: {
    fontSize: FONT_SIZE.small,
    color: COLORS.textFaint,
    fontFamily: "Helvetica",
    lineHeight: 1.3,
  },
  lineDetail: {
    fontSize: FONT_SIZE.small,
    color: COLORS.textMuted,
    marginTop: 3,
    lineHeight: 1.4,
  },
  cellNum: {
    fontSize: FONT_SIZE.body,
    color: COLORS.text,
    lineHeight: 1.35,
  },
  cellNumBold: {
    fontSize: FONT_SIZE.body,
    color: COLORS.ink,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.35,
  },
  specRow: { flexDirection: "row", marginTop: 3 },
  specLabel: {
    fontSize: FONT_SIZE.small,
    color: COLORS.textMuted,
    width: 100,
    lineHeight: 1.35,
  },
  specValue: {
    fontSize: FONT_SIZE.small,
    color: COLORS.text,
    flex: 1,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.35,
  },
  // Totals
  totals: { width: 240, marginLeft: "auto", marginTop: SPACING.sm },
  tot: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 5,
    paddingBottom: 5,
  },
  totLabel: { ...TYPE.body, color: COLORS.textMuted },
  totValue: { ...TYPE.body, color: COLORS.text },
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
  // Acompte block
  acompte: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    paddingLeft: SPACING.lg,
    paddingRight: SPACING.lg,
    backgroundColor: COLORS.ink,
    borderRadius: 4,
  },
  acompteRow: { flexDirection: "row", justifyContent: "space-between" },
  acompteLabel: {
    fontSize: FONT_SIZE.micro,
    color: "#FFFFFF",
    opacity: 0.65,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: SPACING.sm,
    lineHeight: 1.3,
  },
  acompteValue: {
    color: "#FFFFFF",
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.05,
    letterSpacing: -0.3,
  },
  acompteSub: {
    color: "#FFFFFF",
    opacity: 0.8,
    fontSize: FONT_SIZE.small,
    marginTop: SPACING.sm,
    maxWidth: 380,
    lineHeight: 1.5,
  },
  acompteSideValue: {
    color: "#FFFFFF",
    fontSize: FONT_SIZE.h3,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.1,
  },
  // Footer
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

type MetaRecord = Record<string, unknown>;

const metaGet = (m: MetaRecord | null | undefined, ...keys: string[]): string | null => {
  if (!m) return null;
  for (const k of keys) {
    const v = m[k];
    if (v != null && v !== "") return String(v);
  }
  return null;
};

const metaNum = (m: MetaRecord | null | undefined, ...keys: string[]): number | null => {
  if (!m) return null;
  for (const k of keys) {
    const v = m[k];
    if (v == null || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

const FINITION_BASSE_LABELS: Record<string, string> = {
  ras_du_sol: "Ras du sol (+0 cm)",
  reserve_proprete: "Réserve de propreté",
  cassant: "Cassant",
};

const DOUBLURE_LABELS: Record<string, string> = {
  aucune: "Non",
  occultante: "Oui — Occultante",
  thermique: "Oui — Thermique",
  cotonnade: "Oui — Cotonnade",
  ouatine: "Oui — Ouatine",
};

type SpecRow = { label: string; value: string };

/** Construit la liste structurée de specs depuis le meta JSON d'une ligne. */
function buildSpecsFromMeta(
  meta: MetaRecord | null | undefined,
  hideMeasurements: boolean,
): SpecRow[] {
  if (!meta) return [];
  const ta = String(meta["typeArticle"] ?? "");
  const rows: SpecRow[] = [];

  // ----- Rideau sur mesure (Tissu & Confection) -----
  if (ta === "rideau_tissu_confection") {
    const typeRideau = metaGet(meta, "typeRideau");
    const typeMontage = metaGet(meta, "typeMontage");
    const finitionBasse = metaGet(meta, "finitionBasse");
    const finitionBasseCm = metaNum(meta, "finitionBasseCm");
    const finitionBasseLabel = metaGet(meta, "finitionBasseLabel");
    const ref = metaGet(meta, "referenceTissu");
    const doublure = metaGet(meta, "doublure");
    const pose = metaGet(meta, "poseRail");
    const largeur = metaNum(meta, "largeurFinie");
    const hauteur = metaNum(meta, "hauteurFinie");
    const nbGalets = metaNum(meta, "nombreGalets");
    const ongletCote = metaNum(meta, "ongletCote", "ourletBas");
    const supportMural = metaGet(meta, "supportMural");
    const supportMuralRef = metaGet(meta, "supportMuralRef");
    const sensConf = metaGet(meta, "sensConfectionPref");
    const couleurOeillets = metaGet(meta, "couleurOeillets");

    rows.push({ label: "Type", value: typeMontage === "paire" ? "Paire" : "Panneau" });
    if (typeRideau) rows.push({ label: "Finition Haute", value: typeRideau });

    if (finitionBasse) {
      let fb = FINITION_BASSE_LABELS[finitionBasse] ?? finitionBasse;
      if (finitionBasse === "reserve_proprete" && finitionBasseCm)
        fb = `Réserve de propreté (-${finitionBasseCm}cm)`;
      else if (finitionBasse === "cassant" && finitionBasseCm)
        fb = `Cassant (+${finitionBasseCm}cm)`;
      rows.push({ label: "Finition Basse", value: finitionBasseLabel ?? fb });
    }
    if (nbGalets) rows.push({ label: "Nombre de plis", value: `${nbGalets} plis` });
    if (ref) rows.push({ label: "Tissu", value: ref });
    if (doublure) rows.push({ label: "Doublage", value: DOUBLURE_LABELS[doublure] ?? doublure });
    if (pose) rows.push({ label: "Pose", value: pose === "plafond" ? "Plafond" : "Mural" });
    if (supportMural) {
      rows.push({
        label: "Support mural",
        value: supportMuralRef ? `${supportMural} (${supportMuralRef})` : supportMural,
      });
    }
    if (!hideMeasurements && largeur) rows.push({ label: "Largeur finie", value: `${largeur} cm` });
    if (!hideMeasurements && hauteur) rows.push({ label: "Hauteur finie", value: `${hauteur} cm` });
    if (ongletCote && !hideMeasurements)
      rows.push({ label: "Onglet sur le côté", value: `${ongletCote} cm` });
    if (couleurOeillets) rows.push({ label: "Couleur œillets", value: couleurOeillets });
    if (sensConf && sensConf !== "auto") {
      rows.push({
        label: "Sens confection",
        value: sensConf === "droit_gauche" ? "Droit / Gauche" : "Haut / Bas",
      });
    }
    return rows;
  }

  // ----- Store bateau (Tissu & Confection) -----
  if (ta === "store_tissu_confection") {
    const typeStore = metaGet(meta, "typeStore");
    const ref = metaGet(meta, "referenceTissu");
    const doublure = metaGet(meta, "doublure");
    const pose = metaGet(meta, "poseRail");
    const largeur = metaNum(meta, "largeurFinie");
    const hauteur = metaNum(meta, "hauteurFinie");
    const refoulement = metaNum(meta, "hauteurRefoulement");
    const chainetteCote = metaGet(meta, "chainetteCote");

    if (typeStore) rows.push({ label: "Type store", value: typeStore });
    if (ref) rows.push({ label: "Tissu", value: ref });
    if (doublure) rows.push({ label: "Doublage", value: DOUBLURE_LABELS[doublure] ?? doublure });
    if (pose) rows.push({ label: "Pose", value: pose === "plafond" ? "Plafond" : "De face" });
    if (chainetteCote)
      rows.push({ label: "Chaînette", value: chainetteCote === "gauche" ? "Gauche" : "Droite" });
    if (refoulement && refoulement > 0 && !hideMeasurements)
      rows.push({ label: "Refoulement", value: `${refoulement} cm` });
    if (!hideMeasurements && largeur) rows.push({ label: "Largeur finie", value: `${largeur} cm` });
    if (!hideMeasurements && hauteur) rows.push({ label: "Hauteur finie", value: `${hauteur} cm` });
    return rows;
  }

  // ----- Mécanisme store bateau -----
  if (ta === "mecanisme") {
    const cote = metaGet(meta, "chainetteCote");
    const couleur = metaGet(meta, "chainetteCouleur");
    if (couleur) rows.push({ label: "Couleur chaînette", value: capitalize(couleur) });
    if (cote) rows.push({ label: "Côté", value: cote === "gauche" ? "Gauche" : "Droite" });
    return rows;
  }

  // ----- Store enrouleur tissu -----
  if (ta === "store_enrouleur_tissu") {
    const ref = metaGet(meta, "referenceTissu");
    const largeur = metaNum(meta, "largeurFinie");
    const hauteur = metaNum(meta, "hauteurFinie");
    const enroulement = metaGet(meta, "enroulement");
    if (ref) rows.push({ label: "Tissu", value: ref });
    if (enroulement)
      rows.push({
        label: "Enroulement",
        value: enroulement === "avant" ? "Avant" : "Arrière",
      });
    if (!hideMeasurements && largeur) rows.push({ label: "Largeur finie", value: `${largeur} cm` });
    if (!hideMeasurements && hauteur) rows.push({ label: "Hauteur finie", value: `${hauteur} cm` });
    return rows;
  }

  // ----- Collection Atmosphère -----
  if (ta === "collection_atmosphere") {
    const sf = metaGet(meta, "sousFamille");
    const matiere = metaGet(meta, "matiere");
    const ref = metaGet(meta, "reference");
    const routing = metaGet(meta, "routingLabel");
    if (sf) {
      const map: Record<string, string> = {
        rideau: "Rideau",
        store_bateau: "Store bateau",
        store_enrouleur: "Store enrouleur",
      };
      rows.push({ label: "Sous-famille", value: map[sf] ?? sf });
    }
    if (matiere) rows.push({ label: "Matière", value: matiere.toUpperCase() });
    if (ref) rows.push({ label: "Référence", value: ref });
    if (routing) rows.push({ label: "Routing fournisseur", value: routing });
    const largeur = metaNum(meta, "largeurFinie");
    const hauteur = metaNum(meta, "hauteurFinie");
    if (!hideMeasurements && largeur) rows.push({ label: "Largeur finie", value: `${largeur} cm` });
    if (!hideMeasurements && hauteur) rows.push({ label: "Hauteur finie", value: `${hauteur} cm` });
    return rows;
  }

  return rows;
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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
            <Text style={styles.brandName}>Atmosphère.</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaLabel}>Devis</Text>
            <Text style={styles.metaValue}>{devis.number}</Text>
            <Text style={styles.metaDate}>
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
          {visibleLines.map((l) => {
            const meta = (l.meta ?? null) as MetaRecord | null;
            const specs = buildSpecsFromMeta(meta, hideMeasurements);
            const useSpecs = specs.length > 0;
            return (
              <View style={styles.tRow} key={l.id}>
                <Text style={[styles.cRef, styles.lineRefMuted]}>{l.ref ?? "—"}</Text>
                <View style={styles.cLabel}>
                  <Text style={styles.lineLabel}>{l.label}</Text>
                  {useSpecs ? (
                    <View style={{ marginTop: SPACING.xs }}>
                      {specs.map((s, i) => (
                        <View key={i} style={styles.specRow}>
                          <Text style={styles.specLabel}>{s.label}</Text>
                          <Text style={styles.specValue}>{s.value}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    l.detail && <Text style={styles.lineDetail}>{l.detail}</Text>
                  )}
                </View>
                <Text style={[styles.cQty, styles.cellNum]}>
                  {Number(l.qty)} {l.unit_label}
                </Text>
                <Text style={[styles.cUnit, styles.cellNum]}>{eur(Number(l.unit_price_ht))}</Text>
                <Text style={[styles.cTotal, styles.cellNumBold]}>{eur(Number(l.total_ht ?? 0))}</Text>
              </View>
            );
          })}
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
          <View style={styles.acompteRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.acompteLabel}>
                {acomptePct === 100
                  ? "Paiement intégral à la commande"
                  : `Acompte ${acomptePct} % à la validation`}
              </Text>
              <Text style={styles.acompteValue}>{eur(acompte)}</Text>
              <Text style={styles.acompteSub}>
                {acomptePct === 100
                  ? "Le montant TTC est à régler intégralement à la commande."
                  : `Un acompte de ${acomptePct} % du montant TTC est requis à la validation pour déclencher la commande des fournitures et la confection. Solde dû avant la pose.`}
              </Text>
            </View>
            {acomptePct < 100 && (
              <View style={{ alignItems: "flex-end", marginLeft: SPACING.xl }}>
                <Text style={[styles.acompteLabel, { textAlign: "right" }]}>Solde</Text>
                <Text style={styles.acompteSideValue}>{eur(solde)}</Text>
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

      {/* Conditions Générales de Vente */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Text style={styles.brandName}>Atmosphère.</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaLabel}>Annexe au devis</Text>
            <Text style={styles.metaValue}>CGV</Text>
            <Text style={styles.metaDate}>{devis.number}</Text>
          </View>
        </View>

        <Text
          style={{
            fontSize: FONT_SIZE.h2,
            fontFamily: "Helvetica-Bold",
            color: COLORS.ink,
            lineHeight: 1.15,
            marginBottom: SPACING.md,
          }}
        >
          Conditions Générales de Vente
        </Text>

        <CgvSection
          number="1"
          title="Objet et champ d'application"
          body="Les présentes Conditions Générales de Vente (CGV) régissent les ventes de produits et prestations sur mesure (rideaux, stores, voilages, accessoires, pose et confection) réalisées par Atmosphère Tissus auprès de ses clients particuliers ou professionnels. Toute commande implique l'acceptation pleine et entière des présentes CGV."
        />
        <CgvSection
          number="2"
          title="Devis"
          body={`Le devis remis au client est valable trente (30) jours à compter de sa date d'émission. Au-delà, les prix indiqués peuvent être révisés. Toute commande devient ferme à la signature du devis par le client et au versement de l'acompte indiqué (généralement 50 %). Les côtes mentionnées sont relevées par le client ou par Atmosphère Tissus à titre indicatif ; toute prise de mesure définitive engage la responsabilité de la partie qui l'a effectuée.`}
        />
        <CgvSection
          number="3"
          title="Acompte, solde et règlement"
          body="La commande est validée à réception de l'acompte (ou de la totalité si paiement intégral indiqué). Le solde est exigible avant la pose ou à la livraison. Modes de règlement acceptés : carte bancaire, virement, chèque, espèces (dans la limite des plafonds légaux). Tout retard de paiement entraîne de plein droit, dès l'échéance, des pénalités au taux annuel de trois fois le taux d'intérêt légal, ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 €."
        />
        <CgvSection
          number="4"
          title="Délais et exécution"
          body="Les délais de fabrication et de pose sont communiqués à titre indicatif. Atmosphère Tissus met tout en œuvre pour les respecter mais ne peut être tenue responsable des retards causés par les fournisseurs, transporteurs, événements de force majeure ou retards de prise de mesure / réception de matériel. Les retards ne sauraient ouvrir droit à des pénalités ou à l'annulation de la commande."
        />
        <CgvSection
          number="5"
          title="Livraison et pose"
          body="La pose à domicile est facturée selon le devis. Le client s'engage à rendre les locaux accessibles et libres de tout obstacle le jour convenu. En cas d'impossibilité de poser le jour prévu du fait du client, un nouveau rendez-vous sera planifié et un éventuel surcoût de déplacement pourra être facturé."
        />
        <CgvSection
          number="6"
          title="Réserves et réclamations"
          body="Lors de la livraison / pose, le client est tenu de vérifier la conformité des produits. Toute réserve doit être formulée par écrit dans les huit (8) jours suivant la livraison. Au-delà, les produits sont considérés comme acceptés."
        />
        <CgvSection
          number="7"
          title="Garantie"
          body="Les produits bénéficient de la garantie légale de conformité (articles L. 217-4 et s. du Code de la consommation) et de la garantie des vices cachés (articles 1641 et s. du Code civil). La garantie ne s'applique pas aux dommages résultant d'une utilisation non conforme, d'un entretien inadapté ou d'une modification effectuée par le client ou un tiers."
        />
        <CgvSection
          number="8"
          title="Réserve de propriété"
          body="Les produits livrés demeurent la propriété d'Atmosphère Tissus jusqu'au paiement intégral du prix par le client. À ce titre, en cas de défaut de paiement, Atmosphère Tissus se réserve le droit d'en exiger la restitution."
        />
        <CgvSection
          number="9"
          title="Rétractation"
          body="Conformément à l'article L. 221-28 du Code de la consommation, le droit de rétractation ne peut être exercé pour les produits confectionnés sur mesure ou nettement personnalisés. Le client renonce expressément à ce droit en validant la commande."
        />
        <CgvSection
          number="10"
          title="Données personnelles"
          body="Les données collectées sont strictement nécessaires à la gestion de la commande et conservées pendant la durée légale. Conformément au RGPD, le client dispose d'un droit d'accès, de rectification et d'effacement de ses données. Pour exercer ce droit, écrire à contact@atmospheretissus.fr."
        />
        <CgvSection
          number="11"
          title="Litiges"
          body="Les présentes CGV sont régies par le droit français. À défaut de règlement amiable, tout litige sera soumis au tribunal compétent du siège social d'Atmosphère Tissus."
        />

        <Text
          style={{
            marginTop: SPACING.xl,
            fontSize: FONT_SIZE.small,
            color: COLORS.textMuted,
            lineHeight: 1.5,
            fontStyle: "italic",
          }}
        >
          La signature du devis vaut acceptation sans réserve des présentes CGV.
        </Text>

        <View style={styles.footer} fixed>
          <Text>
            Atmosphère Tissus · SAS · 33 cours du Maréchal Foch, 33000 Bordeaux
          </Text>
          <Text>
            {devis.number} — CGV · Page <Text render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
          </Text>
        </View>
      </Page>
    </Document>
  );
}

function CgvSection({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <View style={{ marginBottom: SPACING.md }} wrap={false}>
      <Text
        style={{
          fontSize: FONT_SIZE.body,
          fontFamily: "Helvetica-Bold",
          color: COLORS.ink,
          lineHeight: 1.35,
          marginBottom: 3,
        }}
      >
        {number}. {title}
      </Text>
      <Text
        style={{
          fontSize: FONT_SIZE.body,
          color: COLORS.text,
          lineHeight: 1.55,
        }}
      >
        {body}
      </Text>
    </View>
  );
}
