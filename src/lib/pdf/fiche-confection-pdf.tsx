import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Database } from "@/lib/supabase/types";

type Dossier = Database["public"]["Tables"]["dossiers"]["Row"];
type Client = Database["public"]["Tables"]["clients"]["Row"];
type DevisLine = Database["public"]["Tables"]["devis_lines"]["Row"];

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
    padding: 28,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#111",
    lineHeight: 1.4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
    paddingBottom: 14,
    borderBottom: "2px solid #111",
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
  titleBlock: { textAlign: "right" },
  titleLabel: {
    fontSize: 8,
    color: "#6B7280",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  titleMain: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#111",
  },

  identityRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  identityCol: {
    flex: 1,
    border: "1px solid #E5E7EB",
    borderRadius: 4,
    padding: 10,
  },
  identityLabel: {
    fontSize: 8,
    color: "#6B7280",
    letterSpacing: 1,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  identityValue: { fontSize: 10.5, color: "#111", marginBottom: 1 },

  pieceSection: {
    border: "1px solid #D1D5DB",
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#FAFAFA",
  },
  pieceTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#111",
    backgroundColor: "#FACC15",
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 8,
    paddingRight: 8,
    marginTop: -12,
    marginLeft: -12,
    marginRight: -12,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    marginBottom: 10,
  },

  article: {
    backgroundColor: "#fff",
    borderRadius: 3,
    padding: 10,
    marginBottom: 8,
    border: "1px solid #E5E7EB",
  },
  articleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  articleLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#111",
    flex: 1,
  },
  articleType: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#7C3AED",
    backgroundColor: "#EDE9FE",
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 6,
    paddingRight: 6,
    borderRadius: 2,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    marginLeft: -3,
    marginRight: -3,
  },
  metaItem: {
    width: "33.33%",
    paddingLeft: 3,
    paddingRight: 3,
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 7.5,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 10.5,
    color: "#111",
    fontFamily: "Helvetica-Bold",
  },

  table: { marginTop: 6 },
  tHead: {
    flexDirection: "row",
    backgroundColor: "#F4F4F4",
    borderTop: "1px solid #D1D5DB",
    borderBottom: "1px solid #D1D5DB",
    paddingTop: 5,
    paddingBottom: 5,
  },
  tHeadText: {
    fontSize: 7.5,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontFamily: "Helvetica-Bold",
    paddingLeft: 6,
    paddingRight: 6,
  },
  tRow: {
    flexDirection: "row",
    borderBottom: "1px solid #E5E7EB",
    paddingTop: 5,
    paddingBottom: 5,
  },
  tCell: {
    fontSize: 9.5,
    color: "#111",
    paddingLeft: 6,
    paddingRight: 6,
  },

  observBlock: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#FFFBEB",
    borderRadius: 3,
    border: "1px solid #FDE68A",
  },
  observLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#92400E",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  observText: { fontSize: 9.5, color: "#451A03" },

  qrChip: {
    backgroundColor: "#111",
    color: "#fff",
    fontSize: 8,
    fontFamily: "Courier-Bold",
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 5,
    paddingRight: 5,
    borderRadius: 2,
  },

  commentSection: {
    marginTop: 14,
    border: "1px solid #D1D5DB",
    borderRadius: 4,
    padding: 12,
    minHeight: 70,
  },
  commentTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },

  footer: {
    position: "absolute",
    bottom: 14,
    left: 28,
    right: 28,
    paddingTop: 6,
    borderTop: "1px solid #E5E7EB",
    fontSize: 7,
    color: "#9CA3AF",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

type Meta = Record<string, unknown>;

function get(meta: Meta, ...keys: string[]): string | null {
  for (const k of keys) {
    if (meta[k] != null && meta[k] !== "") return String(meta[k]);
  }
  return null;
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getNumber(meta: Meta, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = meta[k];
    if (v == null || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function articleTypeLabel(typeArticle: string | null): string {
  switch (typeArticle) {
    case "rideau_tissu_confection":
      return "Rideau · Tissu & Confection";
    case "store_tissu_confection":
      return "Store · Tissu & Confection";
    case "rail":
      return "Rail";
    case "mecanisme":
      return "Mécanisme";
    case "pose_rideau":
      return "Pose rideau";
    case "pose_store":
      return "Pose store";
    case "rideau_serie":
      return "Rideau série";
    case "produit":
      return "Accessoire";
    default:
      return typeArticle ?? "Article";
  }
}

function isConfectionType(t: string | null): boolean {
  return t === "rideau_tissu_confection" || t === "store_tissu_confection";
}

export function FicheConfectionPDF({
  dossier,
  client,
  devisLines,
  devisNumber,
}: {
  dossier: Dossier;
  client: Client | null;
  devisLines: DevisLine[];
  devisNumber?: string | null;
}) {
  // Garde uniquement les articles de confection — c'est CE que la couturière fait
  const confectionLines = devisLines.filter((l) => {
    const meta = (l.meta ?? {}) as Meta;
    return isConfectionType(String(meta["typeArticle"] ?? meta["type"] ?? ""));
  });

  // Groupe par pièce (room)
  const piecesMap = new Map<string, DevisLine[]>();
  for (const l of confectionLines) {
    const meta = (l.meta ?? {}) as Meta;
    const pieceName = String(meta["piece"] ?? "Pièce non spécifiée");
    const arr = piecesMap.get(pieceName) ?? [];
    arr.push(l);
    piecesMap.set(pieceName, arr);
  }

  const pieces = Array.from(piecesMap.entries());
  const clientName = client?.display_name ?? "—";
  const fullAddress = [client?.address_pose, client?.postal_code, client?.city]
    .filter(Boolean)
    .join(", ");

  return (
    <Document
      title={`Fiche confection ${dossier.number}`}
      author="Atmosphère Tissus"
      subject={`Fiche de confection pour ${clientName}`}
    >
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.logoMark}>
              <Text style={styles.logoMarkText}>A</Text>
            </View>
            <View>
              <Text style={styles.brandName}>Atmosphère Tissus</Text>
              <Text style={styles.brandSub}>FICHE DE CONFECTION · ATELIER</Text>
            </View>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.titleLabel}>Dossier</Text>
            <Text style={styles.titleMain}>{dossier.number}</Text>
            {devisNumber && (
              <Text style={{ fontSize: 8, color: "#6B7280", marginTop: 4 }}>
                Devis source: {devisNumber}
              </Text>
            )}
            <Text style={{ fontSize: 8, color: "#6B7280" }}>
              Édité le {date(new Date().toISOString())}
            </Text>
          </View>
        </View>

        {/* IDENTITÉ */}
        <View style={styles.identityRow}>
          <View style={styles.identityCol}>
            <Text style={styles.identityLabel}>Client</Text>
            <Text style={styles.identityValue}>{clientName}</Text>
            {fullAddress && (
              <Text style={[styles.identityValue, { fontSize: 9.5, color: "#374151" }]}>
                {fullAddress}
              </Text>
            )}
            {client?.phone && (
              <Text style={[styles.identityValue, { fontSize: 9.5, color: "#374151" }]}>
                Tél : {client.phone}
              </Text>
            )}
          </View>
          <View style={styles.identityCol}>
            <Text style={styles.identityLabel}>Commande</Text>
            <Text style={styles.identityValue}>Créée le {date(dossier.created_at)}</Text>
            <Text style={[styles.identityValue, { fontSize: 9.5, color: "#374151" }]}>
              Acompte : {dossier.acompte_paid ? "✓ reçu" : "en attente"}
            </Text>
            <Text style={[styles.identityValue, { fontSize: 9.5, color: "#374151" }]}>
              {confectionLines.length} article{confectionLines.length > 1 ? "s" : ""} à
              confectionner · {pieces.length} pièce{pieces.length > 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        {/* PIÈCES */}
        {pieces.length === 0 && (
          <View style={styles.pieceSection}>
            <Text style={{ fontSize: 11, color: "#6B7280", textAlign: "center" }}>
              Aucun article de confection sur ce dossier.
              {"\n"}(Les articles série, accessoires et poses ne nécessitent pas de fiche atelier.)
            </Text>
          </View>
        )}

        {pieces.map(([pieceName, lines]) => (
          <View key={pieceName} style={styles.pieceSection} wrap={false}>
            <Text style={styles.pieceTitle}>{pieceName}</Text>
            {lines.map((line) => {
              const meta = (line.meta ?? {}) as Meta;
              const typeArticle = String(meta["typeArticle"] ?? "");
              const isRideau = typeArticle === "rideau_tissu_confection";
              const isStore = typeArticle === "store_tissu_confection";

              const refTissu = get(meta, "referenceTissu");
              const largeurFinie = getNumber(meta, "largeurFinie");
              const hauteurFinie = getNumber(meta, "hauteurFinie");
              const laizeTissu = getNumber(meta, "laizeTissu");
              const raccordTissu = getNumber(meta, "raccordTissu");
              const double = meta["double"] === true || meta["double"] === "true";
              const doublure = String(meta["doublure"] ?? "");

              return (
                <View key={line.id} style={styles.article}>
                  <View style={styles.articleHeader}>
                    <Text style={styles.articleLabel}>{line.label}</Text>
                    <Text style={styles.articleType}>{articleTypeLabel(typeArticle)}</Text>
                  </View>

                  {/* Métadonnées principales */}
                  <View style={styles.metaGrid}>
                    {isRideau && (
                      <>
                        <MetaCell label="Type rideau" value={get(meta, "typeRideau")} />
                        <MetaCell
                          label="Montage"
                          value={
                            get(meta, "typeMontage") === "paire"
                              ? "Paire"
                              : get(meta, "typeMontage") === "panneau"
                                ? "Panneau"
                                : get(meta, "panneau")
                          }
                        />
                        <MetaCell
                          label="Finition basse"
                          value={
                            get(meta, "finitionBasseLabel") ??
                            get(meta, "finitionBasse") ??
                            get(meta, "casseSol")
                          }
                        />
                      </>
                    )}
                    {isStore && (
                      <>
                        <MetaCell label="Type store" value={get(meta, "typeStore")} />
                        <MetaCell
                          label="Refoulement"
                          value={
                            getNumber(meta, "hauteurRefoulement") != null &&
                            getNumber(meta, "hauteurRefoulement")! > 0
                              ? `${getNumber(meta, "hauteurRefoulement")} cm`
                              : get(meta, "refoulement")
                          }
                        />
                        <MetaCell label="Barre lestage" value={get(meta, "barreLestage")} />
                        <MetaCell
                          label="Chaînette"
                          value={
                            get(meta, "chainetteCote")
                              ? `${capitalize(get(meta, "chainetteCote")!)}`
                              : null
                          }
                        />
                      </>
                    )}
                    {isRideau && get(meta, "finitionHautePanneau") && (
                      <MetaCell
                        label="Finition haute (Panneau)"
                        value={capitalize(get(meta, "finitionHautePanneau")!)}
                      />
                    )}
                    {isRideau && get(meta, "finitionBassePanneau") && (
                      <MetaCell
                        label="Finition basse (Panneau)"
                        value={capitalize(get(meta, "finitionBassePanneau")!.replace(/_/g, " "))}
                      />
                    )}
                    <MetaCell
                      label="Largeur finie"
                      value={largeurFinie != null ? `${largeurFinie} cm` : null}
                    />
                    <MetaCell
                      label="Hauteur finie"
                      value={hauteurFinie != null ? `${hauteurFinie} cm` : null}
                    />
                    <MetaCell
                      label="Doublure"
                      value={
                        doublure && doublure !== "aucune"
                          ? capitalize(doublure)
                          : double
                            ? "Occultante"
                            : "Non"
                      }
                    />
                    {isRideau && get(meta, "couleurOeillets") && (
                      <MetaCell
                        label="Couleur œillets"
                        value={get(meta, "couleurOeillets")}
                      />
                    )}
                    {isRideau && (
                      <>
                        <MetaCell
                          label="Nombre de galets"
                          value={
                            getNumber(meta, "nombreGalets") != null
                              ? String(getNumber(meta, "nombreGalets"))
                              : get(meta, "nombrePlis") ?? null
                          }
                        />
                        <MetaCell
                          label="Ourlet haut"
                          value={
                            getNumber(meta, "ourletHaut") != null
                              ? `${getNumber(meta, "ourletHaut")} cm`
                              : null
                          }
                        />
                        <MetaCell
                          label="Ourlet bas"
                          value={
                            getNumber(meta, "ourletBas") != null
                              ? `${getNumber(meta, "ourletBas")} cm`
                              : null
                          }
                        />
                      </>
                    )}
                  </View>

                  {/* Table tissu / lés / métrage */}
                  <View style={styles.table}>
                    <View style={styles.tHead}>
                      <Text style={[styles.tHeadText, { width: 110 }]}>Réf. tissu</Text>
                      <Text style={[styles.tHeadText, { width: 70 }]}>Laize</Text>
                      <Text style={[styles.tHeadText, { width: 70 }]}>Raccord</Text>
                      <Text style={[styles.tHeadText, { width: 65 }]}>Lés</Text>
                      <Text style={[styles.tHeadText, { width: 80 }]}>Sens conf.</Text>
                      <Text style={[styles.tHeadText, { flex: 1, textAlign: "right" }]}>
                        Métrage total
                      </Text>
                    </View>
                    <View style={styles.tRow}>
                      <Text style={[styles.tCell, { width: 110 }]}>{refTissu ?? "—"}</Text>
                      <Text style={[styles.tCell, { width: 70 }]}>
                        {laizeTissu != null ? `${laizeTissu} cm` : "—"}
                      </Text>
                      <Text style={[styles.tCell, { width: 70 }]}>
                        {raccordTissu != null && raccordTissu > 0 ? `${raccordTissu} cm` : "—"}
                      </Text>
                      <Text style={[styles.tCell, { width: 65 }]}>
                        {get(meta, "nombreLes") ?? "—"}
                      </Text>
                      <Text style={[styles.tCell, { width: 80 }]}>
                        {get(meta, "sensConfection") ?? "—"}
                      </Text>
                      <Text
                        style={[
                          styles.tCell,
                          { flex: 1, textAlign: "right", fontFamily: "Helvetica-Bold" },
                        ]}
                      >
                        {getNumber(meta, "metrageTotal") != null
                          ? `${getNumber(meta, "metrageTotal")!.toFixed(2)} m`
                          : "—"}
                      </Text>
                    </View>
                  </View>

                  {/* Observations */}
                  {line.detail && (
                    <View style={styles.observBlock}>
                      <Text style={styles.observLabel}>Observations</Text>
                      <Text style={styles.observText}>{line.detail}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        {/* Commentaires atelier */}
        <View style={styles.commentSection}>
          <Text style={styles.commentTitle}>Commentaires atelier</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>
            Atmosphère Tissus · 33 cours du Maréchal Foch, 33000 Bordeaux · Vérifier les mesures
            avant fabrication
          </Text>
          <Text>
            {dossier.number} ·{" "}
            <Text
              render={({ pageNumber, totalPages }) => `Page ${pageNumber}/${totalPages}`}
            />
          </Text>
        </View>
      </Page>
    </Document>
  );
}

function MetaCell({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value ?? "—"}</Text>
    </View>
  );
}
