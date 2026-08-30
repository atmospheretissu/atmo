"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Hint, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ColorChip } from "@/components/ui/status-pill";
import { Sparkles, AlertCircle } from "lucide-react";
import type { BoutiquePieceArticle } from "@/app/(platform)/boutique/actions";
import { CONFIG, type TypeRideau, type TypeRail, type TypePose } from "@/lib/boutique/data";
import { calculateRideau } from "@/lib/boutique/pricing/helpers";
import { TissuPicker } from "@/components/boutique/tissu-picker";

const eurFmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

/**
 * Type de rideau étendu : on ajoute "Panneau" (rideau plat sans plis) en plus
 * des 3 types existants. Côté pricing helpers ils n'acceptent que les 3 types
 * d'origine — Panneau passe en coefficient 1.0 via une coercition locale.
 */
type TypeRideauUI = TypeRideau | "Panneau";

const TYPES_RIDEAU: { value: TypeRideauUI; label: string; sub: string }[] = [
  { value: "Plis simples", label: "Plis simples", sub: `coef ${CONFIG.coefficients["Plis simples"]}` },
  { value: "Vague", label: "Vague", sub: `coef ${CONFIG.coefficients["Vague"]}` },
  { value: "À œillets", label: "Œillets", sub: `coef ${CONFIG.coefficients["À œillets"]}` },
  { value: "Panneau", label: "Panneau", sub: "plat, sans plis" },
];

type FinitionHautePanneau = "glissiere" | "velcro";
type FinitionBassePanneau = "libre" | "barre_lestage" | "jonc";

const RAILS: { value: TypeRail; label: string }[] = [
  { value: "DS", label: "DS — droit standard" },
  { value: "DV", label: "DV — droit vague" },
  { value: "CS", label: "CS — courbe standard" },
  { value: "CV", label: "CV — courbe vague" },
  { value: "Tringle", label: "Tringle (pas de rail)" },
];

type TypeMontage = "paire" | "panneau";
type Doublure = "aucune" | "occultante" | "thermique" | "cotonnade" | "ouatine";
type FinitionBasse = "ras_du_sol" | "reserve_proprete" | "cassant";
type SensConfectionPref = "auto" | "droit_gauche" | "haut_bas";
type SupportMural =
  | "aucun"
  | "face_simple_6"
  | "face_simple_9"
  | "face_double"
  | "cache_vis";

const SUPPORT_MURAL_OPTIONS: { value: SupportMural; label: string; ref: string }[] = [
  { value: "face_simple_6", label: "Support de face simple 6cm", ref: "7815.4" },
  { value: "face_simple_9", label: "Support de face simple 9cm", ref: "7816.4" },
  { value: "face_double", label: "Support de face double", ref: "7817.4" },
  { value: "cache_vis", label: "Cache vis", ref: "78158.4" },
];

type Inputs = {
  typeRideau: TypeRideauUI;
  typeMontage: TypeMontage;
  panneau: number; // conservé pour compat & calcul prix (1 si panneau, 2 si paire)
  referenceTissu: string;
  largeurFinie: number;
  hauteurFinie: number;
  laizeTissu: number;
  raccordTissu: number;
  prixTissu: number;
  doublure: Doublure;
  finitionBasse: FinitionBasse;
  // cm soustraits (réserve_proprete) ou ajoutés (cassant) — 0 sinon
  finitionBasseCm: number;
  rail: TypeRail;
  poseRail: TypePose;
  couleurRail: string;
  couleurRailAutre: string; // rempli si couleurRail === "autre"
  nombreCoudes: number;
  // Rail coudé — description + éventuel lien vers schéma externe
  raidCoudeDescription: string;
  raidCoudeSchemaUrl: string;
  avecPose: boolean;
  sensConfectionPref: SensConfectionPref;
  couleurOeillets: string;
  // Embouts (uniquement quand rail = Tringle)
  emboutType: "" | "bouchon" | "boule" | "pomme_pin" | "olive" | "autre";
  emboutCouleur: string;
  // Spécifique Panneau
  finitionHautePanneau: FinitionHautePanneau;
  finitionBassePanneau: FinitionBassePanneau;
  // Fiche atelier — précisions confection (ourletHaut retiré : standard atelier)
  ongletCote: number;
  // Support mural (uniquement si pose murale)
  supportMural: SupportMural;
};

const initial: Inputs = {
  typeRideau: "Plis simples",
  typeMontage: "panneau",
  panneau: 1,
  referenceTissu: "",
  largeurFinie: 240,
  hauteurFinie: 250,
  laizeTissu: 140,
  raccordTissu: 0,
  prixTissu: 60,
  doublure: "aucune",
  finitionBasse: "ras_du_sol",
  finitionBasseCm: 0,
  rail: "DS",
  poseRail: "plafond",
  couleurRail: "blanc",
  couleurRailAutre: "",
  nombreCoudes: 0,
  raidCoudeDescription: "",
  raidCoudeSchemaUrl: "",
  avecPose: true,
  sensConfectionPref: "auto",
  couleurOeillets: "",
  emboutType: "",
  emboutCouleur: "",
  finitionHautePanneau: "glissiere",
  finitionBassePanneau: "barre_lestage",
  ongletCote: 5,
  supportMural: "face_simple_6",
};

const COULEURS_RAIL = [
  "blanc",
  "noir",
  "gris",
  "noir mat",
  "alu",
  "chrome",
  "rouille",
  "doré",
  "autre",
] as const;
const COULEURS_TRINGLE = [
  "blanc",
  "noir mat",
  "noir brillant",
  "laiton mat",
  "laiton brillant",
  "canon de fusil",
  "vieux nickel",
  "chrome",
  "bronze",
  "autre",
] as const;
const EMBOUT_TYPES: { value: Inputs["emboutType"]; label: string }[] = [
  { value: "", label: "— Aucun —" },
  { value: "bouchon", label: "Bouchon plat" },
  { value: "boule", label: "Boule" },
  { value: "pomme_pin", label: "Pomme de pin" },
  { value: "olive", label: "Olive" },
  { value: "autre", label: "Autre (préciser)" },
];

const DOUBLURE_OPTIONS: { value: Doublure; label: string }[] = [
  { value: "aucune", label: "Aucune" },
  { value: "occultante", label: "Occultante" },
  { value: "thermique", label: "Thermique" },
  { value: "cotonnade", label: "Cotonnade" },
  { value: "ouatine", label: "Ouatine" },
];

const FINITION_OPTIONS: { value: FinitionBasse; label: string }[] = [
  { value: "ras_du_sol", label: "Ras du sol (+0 cm)" },
  { value: "reserve_proprete", label: "Réserve de propreté (−x cm)" },
  { value: "cassant", label: "Cassant (+x cm)" },
];

const COULEURS_OEILLETS = [
  "Laiton mat",
  "Canon de fusil",
  "Vieux nickel",
  "Noir brillant",
  "Noir mat",
  "Blanc brillant",
  "Beige",
];

function finitionBasseDelta(f: FinitionBasse, cm: number): number {
  if (f === "ras_du_sol") return 0;
  if (f === "reserve_proprete") return -Math.abs(cm);
  return Math.abs(cm); // cassant
}

function finitionBasseLabel(f: FinitionBasse, cm: number): string {
  if (f === "ras_du_sol") return "Ras du sol";
  if (f === "reserve_proprete") return `Réserve propreté −${Math.abs(cm)}cm`;
  return `Cassant +${Math.abs(cm)}cm`;
}

export function RideauForm({
  onAdd,
  onCancel,
}: {
  onAdd: (articles: BoutiquePieceArticle[]) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState<Inputs>(initial);

  /**
   * Nombre de galets calculé auto.
   * Convention : 1 pli simple par 10cm de largeur finie (pour plis simples).
   * Pour Vague / Œillets / Panneau : ne s'applique pas (0).
   */
  const nombreGaletsAuto = useMemo(() => {
    if (v.typeRideau !== "Plis simples") return 0;
    if (!v.largeurFinie) return 0;
    return Math.max(1, Math.round(v.largeurFinie / 10));
  }, [v.typeRideau, v.largeurFinie]);

  const validationError = useMemo(() => {
    if (!v.largeurFinie || v.largeurFinie <= 0) return "Largeur tringle requise.";
    if (!v.hauteurFinie || v.hauteurFinie <= 0) return "Hauteur finie requise.";
    if (!v.laizeTissu || v.laizeTissu <= 0) return "Laize tissu requise.";
    if (v.prixTissu < 0) return "Prix tissu invalide.";
    return null;
  }, [v]);

  const calc = useMemo(() => {
    if (validationError) return null;
    try {
      const delta = finitionBasseDelta(v.finitionBasse, v.finitionBasseCm);
      // Panneau = rideau plat → on emprunte la grille tarifaire de "Plis simples"
      // mais on overwrite le coefficient à 1.0 via un mini shim.
      const isPanneau = v.typeRideau === "Panneau";
      const typeForCalc: TypeRideau = isPanneau ? "Plis simples" : (v.typeRideau as TypeRideau);
      const res = calculateRideau({
        typeRideau: typeForCalc,
        largeurFinie: v.largeurFinie,
        hauteurFinie: v.hauteurFinie + delta,
        laizeTissu: v.laizeTissu,
        raccordTissu: v.raccordTissu || 0,
        prixTissuMetre: v.prixTissu,
        double: v.doublure !== "aucune",
        rail: v.rail,
        poseRail: v.poseRail,
        nombreCoudes: v.nombreCoudes || 0,
        avecPose: v.avecPose,
      });
      if (isPanneau) {
        // Recalcul rapide du métrage en coef 1.0 (rideau plat)
        const metrage = res.metrageTotal / (res.details.coefficient || 1);
        const prixTissu = Math.round(metrage * v.prixTissu * 100) / 100;
        return {
          ...res,
          metrageTotal: Math.round(metrage * 100) / 100,
          prixTissu,
          prixTotal:
            prixTissu + res.prixDoublure + res.prixConfection + res.prixAccessoires + res.prixRail + res.prixCoudes + res.prixPose,
          details: { ...res.details, coefficient: 1 },
        };
      }
      return res;
    } catch {
      return null;
    }
  }, [v, validationError]);

  const update = (patch: Partial<Inputs>) => setV((s) => ({ ...s, ...patch }));

  const totalGlobal = calc
    ? calc.prixTissu +
      calc.prixDoublure +
      calc.prixConfection +
      calc.prixAccessoires +
      (v.rail !== "Tringle" ? calc.prixRail + calc.prixCoudes : 0) +
      (v.avecPose ? calc.prixPose : 0)
    : 0;

  const handleAdd = () => {
    if (!calc) return;
    const articles: BoutiquePieceArticle[] = [];
    const baseDetail = `${v.typeRideau} · ${v.largeurFinie}×${v.hauteurFinie}cm · laize ${v.laizeTissu}cm`;
    const refSlug = v.referenceTissu ? ` · ${v.referenceTissu}` : "";

    const prixArticle1 =
      calc.prixTissu + calc.prixDoublure + calc.prixConfection + calc.prixAccessoires;
    const doublureLabel = v.doublure !== "aucune" ? ` · doublure ${v.doublure}` : "";
    const typeMontageLabel = v.typeMontage === "paire" ? "Paire" : "Panneau";
    const finitionLabel = finitionBasseLabel(v.finitionBasse, v.finitionBasseCm);
    articles.push({
      type: "rideau",
      designation: `Rideau ${v.typeRideau} — Tissu & Confection`,
      ref: v.referenceTissu || undefined,
      detail:
        `${baseDetail}${refSlug}` +
        ` · ${typeMontageLabel} · ${finitionLabel}` +
        ` · métrage ${calc.metrageTotal.toFixed(2)}m (${calc.details.sensConfection}, ${calc.details.nombreLes} lé${calc.details.nombreLes > 1 ? "s" : ""})` +
        doublureLabel,
      qty: 1,
      unitLabel: "u",
      unitPriceHt: Math.round(prixArticle1 * 100) / 100,
      meta: {
        typeArticle: "rideau_tissu_confection",
        typeRideau: v.typeRideau,
        typeMontage: v.typeMontage,
        panneau: v.typeMontage === "paire" ? 2 : 1,
        referenceTissu: v.referenceTissu,
        largeurFinie: v.largeurFinie,
        hauteurFinie: v.hauteurFinie,
        finitionBasse: v.finitionBasse,
        finitionBasseCm: v.finitionBasseCm,
        finitionBasseLabel: finitionLabel,
        laizeTissu: v.laizeTissu,
        raccordTissu: v.raccordTissu,
        prixTissuMetre: v.prixTissu,
        doublure: v.doublure,
        double: v.doublure !== "aucune", // backward-compat
        sensConfectionPref: v.sensConfectionPref,
        couleurOeillets: v.typeRideau === "À œillets" ? v.couleurOeillets || null : null,
        finitionHautePanneau: v.typeRideau === "Panneau" ? v.finitionHautePanneau : null,
        finitionBassePanneau: v.typeRideau === "Panneau" ? v.finitionBassePanneau : null,
        metrageTotal: calc.metrageTotal,
        sensConfection: calc.details.sensConfection,
        nombreLes: calc.details.nombreLes,
        coefficient: calc.details.coefficient,
        prixTissu: calc.prixTissu,
        prixDoublure: calc.prixDoublure,
        prixConfection: calc.prixConfection,
        prixAccessoires: calc.prixAccessoires,
        nombreGalets: nombreGaletsAuto,
        ongletCote: v.ongletCote,
        supportMural:
          v.poseRail === "face"
            ? SUPPORT_MURAL_OPTIONS.find((o) => o.value === v.supportMural)?.label ?? null
            : null,
        supportMuralRef:
          v.poseRail === "face"
            ? SUPPORT_MURAL_OPTIONS.find((o) => o.value === v.supportMural)?.ref ?? null
            : null,
      },
    });

    const couleurRailFinale =
      v.couleurRail === "autre" ? v.couleurRailAutre.trim() || "autre" : v.couleurRail;
    if (v.rail !== "Tringle") {
      const prixArticle2 = calc.prixRail + calc.prixCoudes;
      articles.push({
        type: "rideau",
        designation: `Rail ${v.rail} — pose ${v.poseRail} · ${couleurRailFinale}`,
        ref: `RAIL-${v.rail}`,
        detail:
          `${v.largeurFinie} cm linéaire` +
          (v.nombreCoudes > 0
            ? ` · ${v.nombreCoudes} coude${v.nombreCoudes > 1 ? "s" : ""}`
            : "") +
          (v.raidCoudeDescription
            ? ` · ${v.raidCoudeDescription.slice(0, 80)}${v.raidCoudeDescription.length > 80 ? "…" : ""}`
            : ""),
        qty: 1,
        unitLabel: "u",
        unitPriceHt: Math.round(prixArticle2 * 100) / 100,
        meta: {
          typeArticle: "rail",
          rail: v.rail,
          poseRail: v.poseRail,
          couleurRail: couleurRailFinale,
          nombreCoudes: v.nombreCoudes,
          raidCoudeDescription: v.raidCoudeDescription || null,
          raidCoudeSchemaUrl: v.raidCoudeSchemaUrl || null,
          prixRail: calc.prixRail,
          prixCoudes: calc.prixCoudes,
        },
      });
    } else {
      // Tringle → une "ligne accessoire" pour tracer les embouts / couleur
      // même si le prix reste 0 (les tringles sont vendues via le catalogue).
      if (couleurRailFinale || v.emboutType) {
        articles.push({
          type: "rideau",
          designation: `Tringle — ${couleurRailFinale || "coloris à préciser"}${
            v.emboutType
              ? ` · embouts ${v.emboutType}${v.emboutCouleur ? ` ${v.emboutCouleur}` : ""}`
              : ""
          }`,
          ref: "TRINGLE-SPEC",
          detail: `${v.largeurFinie} cm linéaire`,
          qty: 1,
          unitLabel: "u",
          unitPriceHt: 0,
          meta: {
            typeArticle: "tringle_spec",
            couleurTringle: couleurRailFinale,
            emboutType: v.emboutType || null,
            emboutCouleur: v.emboutCouleur || null,
          },
        });
      }
    }

    if (v.avecPose && calc.prixPose > 0) {
      articles.push({
        type: "rideau",
        designation: "Pose rideau à domicile",
        ref: "POSE-RID",
        detail: `${v.largeurFinie}×${v.hauteurFinie}cm · forfait déplacement inclus`,
        qty: 1,
        unitLabel: "forfait",
        unitPriceHt: Math.round(calc.prixPose * 100) / 100,
        meta: {
          typeArticle: "pose_rideau",
          forfaitDeplacement: CONFIG.forfaits.deplacement,
        },
      });
    }

    onAdd(articles);
  };

  const articlesCount =
    1 +
    (v.rail !== "Tringle" ? 1 : 0) +
    (v.avecPose && calc && calc.prixPose > 0 ? 1 : 0);

  return (
    <div className="flex flex-col lg:flex-row" style={{ maxHeight: "80vh" }}>
      {/* LEFT — form (scrollable) + footer (fixed) */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Type de rideau */}
          <section>
            <Label>Type de confection *</Label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES_RIDEAU.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => update({ typeRideau: t.value })}
                  className={
                    "p-2.5 rounded-lg border text-left transition-all " +
                    (v.typeRideau === t.value
                      ? "border-ink bg-canvas-2/60 shadow-sm"
                      : "border-line hover:border-line-strong bg-white")
                  }
                >
                  <p className="text-[12.5px] font-semibold text-ink">{t.label}</p>
                  <p className="text-[10.5px] text-muted font-mono mt-0.5">{t.sub}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Dimensions */}
          <section>
            <p className="eyebrow mb-2">Dimensions</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Largeur tringle (cm) *</Label>
                <Input
                  type="number"
                  min={1}
                  value={v.largeurFinie || ""}
                  onChange={(e) => update({ largeurFinie: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Hauteur finie (cm) *</Label>
                <Input
                  type="number"
                  min={1}
                  value={v.hauteurFinie || ""}
                  onChange={(e) => update({ hauteurFinie: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Type</Label>
                <div className="grid grid-cols-2 gap-1 rounded-md border border-line p-0.5 bg-white h-9">
                  {(["panneau", "paire"] as TypeMontage[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => update({ typeMontage: t })}
                      className={
                        "text-[12px] font-semibold rounded-[5px] transition-colors " +
                        (v.typeMontage === t
                          ? "bg-ink text-white"
                          : "text-muted hover:text-ink")
                      }
                    >
                      {t === "panneau" ? "Panneau" : "Paire"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Finition basse</Label>
                <Select
                  value={v.finitionBasse}
                  onChange={(e) =>
                    update({ finitionBasse: e.target.value as FinitionBasse })
                  }
                >
                  {FINITION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
              {v.finitionBasse !== "ras_du_sol" && (
                <div>
                  <Label>
                    {v.finitionBasse === "reserve_proprete"
                      ? "cm à soustraire"
                      : "cm à ajouter"}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={v.finitionBasseCm || ""}
                    onChange={(e) =>
                      update({ finitionBasseCm: Number(e.target.value) || 0 })
                    }
                    placeholder={v.finitionBasse === "reserve_proprete" ? "1.5" : "2"}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Fiche atelier — précisions confection */}
          <section>
            <p className="eyebrow mb-2">Confection — fiche atelier</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nombre de galets</Label>
                <div className="h-9 px-3 rounded-md border border-line bg-canvas-2/30 text-[13px] text-ink-2 flex items-center justify-between">
                  <span className="tabular-nums">
                    {nombreGaletsAuto > 0 ? nombreGaletsAuto : "—"}
                  </span>
                  <span className="text-[10.5px] text-muted-2 uppercase tracking-wider">Auto</span>
                </div>
                <Hint>
                  {v.typeRideau === "Plis simples"
                    ? "Calculé automatiquement (1 pli / 10 cm de largeur finie)"
                    : "Ne s'applique pas à ce type de rideau"}
                </Hint>
              </div>
              <div>
                <Label>Onglet sur le côté (cm)</Label>
                <Input
                  type="number"
                  min={0}
                  value={v.ongletCote || ""}
                  onChange={(e) => update({ ongletCote: Number(e.target.value) || 0 })}
                  placeholder="5"
                />
                <Hint>Standard atelier : 5 cm</Hint>
              </div>
            </div>
          </section>

          {/* Tissu */}
          <section>
            <p className="eyebrow mb-2">Tissu</p>
            <div className="space-y-3">
              <TissuPicker
                value={v.referenceTissu}
                onChange={(next) => update({ referenceTissu: next })}
                onProductSelected={(p) =>
                  update({
                    referenceTissu: `${p.name} · ${p.ref}`,
                    prixTissu: p.unit_price_ht || v.prixTissu,
                    laizeTissu: p.width_cm ?? v.laizeTissu,
                    raccordTissu: p.raccord_cm ?? v.raccordTissu,
                  })
                }
              />
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Laize (cm) *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={v.laizeTissu || ""}
                    onChange={(e) => update({ laizeTissu: Number(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Raccord (cm)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={v.raccordTissu || ""}
                    onChange={(e) => update({ raccordTissu: Number(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Prix tissu (€/m) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={v.prixTissu || ""}
                    onChange={(e) => update({ prixTissu: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <Label>Doublure</Label>
                <div className="grid grid-cols-4 gap-1 rounded-md border border-line p-0.5 bg-white h-9">
                  {DOUBLURE_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => update({ doublure: o.value })}
                      className={
                        "text-[12px] font-semibold rounded-[5px] transition-colors " +
                        (v.doublure === o.value
                          ? "bg-ink text-white"
                          : "text-muted hover:text-ink")
                      }
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <Hint>
                  Le tarif de la doublure est paramétrable côté Atmosphère et n'apparaît
                  pas sur le devis client.
                </Hint>
              </div>
              <div>
                <Label>Sens de confection</Label>
                <Select
                  value={v.sensConfectionPref}
                  onChange={(e) =>
                    update({ sensConfectionPref: e.target.value as SensConfectionPref })
                  }
                >
                  <option value="auto">Auto (selon laize / dimensions)</option>
                  <option value="droit_gauche">Droit / Gauche</option>
                  <option value="haut_bas">Haut / Bas</option>
                </Select>
              </div>
              {v.typeRideau === "À œillets" && (
                <div>
                  <Label>Couleur œillets</Label>
                  <Select
                    value={v.couleurOeillets}
                    onChange={(e) => update({ couleurOeillets: e.target.value })}
                  >
                    <option value="">— Choisir —</option>
                    {COULEURS_OEILLETS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              {v.typeRideau === "Panneau" && (
                <>
                  <div>
                    <Label>Finition haute</Label>
                    <Select
                      value={v.finitionHautePanneau}
                      onChange={(e) =>
                        update({
                          finitionHautePanneau: e.target.value as FinitionHautePanneau,
                        })
                      }
                    >
                      <option value="glissiere">Glissière</option>
                      <option value="velcro">Velcro</option>
                    </Select>
                  </div>
                  <div>
                    <Label>Finition basse</Label>
                    <Select
                      value={v.finitionBassePanneau}
                      onChange={(e) =>
                        update({
                          finitionBassePanneau: e.target.value as FinitionBassePanneau,
                        })
                      }
                    >
                      <option value="libre">Libre</option>
                      <option value="barre_lestage">Barre de lestage</option>
                      <option value="jonc">Jonc</option>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Rail */}
          <section>
            <p className="eyebrow mb-2">Rail / tringle</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select
                    value={v.rail}
                    onChange={(e) => update({ rail: e.target.value as TypeRail })}
                  >
                    {RAILS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Pose</Label>
                  <Select
                    value={v.poseRail}
                    onChange={(e) => update({ poseRail: e.target.value as TypePose })}
                  >
                    <option value="plafond">Plafond</option>
                    <option value="face">Face mur</option>
                  </Select>
                </div>
              </div>
              {v.poseRail === "face" && (
                <div>
                  <Label>Support mural</Label>
                  <Select
                    value={v.supportMural}
                    onChange={(e) => update({ supportMural: e.target.value as SupportMural })}
                  >
                    {SUPPORT_MURAL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label} — {o.ref}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Couleur {v.rail === "Tringle" ? "tringle" : "rail"}</Label>
                  <Select
                    value={v.couleurRail}
                    onChange={(e) => update({ couleurRail: e.target.value })}
                  >
                    {(v.rail === "Tringle" ? COULEURS_TRINGLE : COULEURS_RAIL).map((c) => (
                      <option key={c} value={c}>
                        {c === "autre" ? "Autre (préciser)" : c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </Select>
                  {v.couleurRail === "autre" && (
                    <Input
                      value={v.couleurRailAutre}
                      onChange={(e) => update({ couleurRailAutre: e.target.value })}
                      placeholder="Précise la couleur exacte"
                      className="mt-1.5"
                    />
                  )}
                </div>
                <div>
                  <Label>Coudes</Label>
                  <Input
                    type="number"
                    min={0}
                    value={v.nombreCoudes || ""}
                    onChange={(e) => update({ nombreCoudes: Number(e.target.value) || 0 })}
                  />
                  <Hint>{CONFIG.coutCoude} € par coude</Hint>
                </div>
              </div>

              {/* Embouts — uniquement si Tringle */}
              {v.rail === "Tringle" && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-line">
                  <div>
                    <Label>Type d&apos;embout</Label>
                    <Select
                      value={v.emboutType}
                      onChange={(e) =>
                        update({ emboutType: e.target.value as Inputs["emboutType"] })
                      }
                    >
                      {EMBOUT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {v.emboutType && (
                    <div>
                      <Label>Couleur / finition embout</Label>
                      <Input
                        value={v.emboutCouleur}
                        onChange={(e) => update({ emboutCouleur: e.target.value })}
                        placeholder="ex : laiton mat, chrome, bois foncé…"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Rail coudé — description + lien schéma */}
              {v.nombreCoudes > 0 && (
                <div className="pt-2 border-t border-line space-y-2">
                  <div>
                    <Label>
                      Description du rail coudé ({v.nombreCoudes} coude
                      {v.nombreCoudes > 1 ? "s" : ""})
                    </Label>
                    <textarea
                      value={v.raidCoudeDescription}
                      onChange={(e) =>
                        update({ raidCoudeDescription: e.target.value })
                      }
                      placeholder="Précise les côtes de chaque segment, l'angle et le sens des coudes (ex : 120 cm droit → 90° gauche → 40 cm)"
                      rows={3}
                      className="w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] text-ink placeholder:text-muted-2 resize-y focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/15"
                    />
                  </div>
                  <div>
                    <Label>Lien vers le schéma (optionnel)</Label>
                    <Input
                      type="url"
                      value={v.raidCoudeSchemaUrl}
                      onChange={(e) =>
                        update({ raidCoudeSchemaUrl: e.target.value })
                      }
                      placeholder="https://drive.google.com/… ou https://wetransfer.com/…"
                    />
                    <Hint>
                      Colle ici le lien Google Drive / WeTransfer du croquis. Le
                      schéma apparaîtra sur la fiche confection.
                    </Hint>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Pose */}
          <section>
            <p className="eyebrow mb-2">Pose à domicile</p>
            <label className="inline-flex items-center gap-2 text-[13px] cursor-pointer">
              <input
                type="checkbox"
                checked={v.avecPose}
                onChange={(e) => update({ avecPose: e.target.checked })}
                className="h-4 w-4 rounded border-line-strong"
              />
              <span className="text-ink-2">
                Inclure la pose (forfait déplacement {CONFIG.forfaits.deplacement} € inclus)
              </span>
            </label>
          </section>

          {/* MOBILE preview — only on small screens */}
          <section className="lg:hidden">
            <p className="eyebrow mb-2">Calcul</p>
            {calc ? (
              <Card className="p-3 bg-canvas-2/40">
                <p className="text-[12px] text-muted-2">
                  Métrage tissu : {calc.metrageTotal.toFixed(2)} m · {calc.details.sensConfection}
                </p>
                <p className="text-[18px] font-semibold text-ink tabular-nums mt-1">
                  {eurFmt.format(totalGlobal)}
                </p>
                <p className="text-[10.5px] text-muted mt-0.5">
                  {articlesCount} ligne{articlesCount > 1 ? "s" : ""} de devis
                </p>
              </Card>
            ) : (
              <p className="text-[12px] text-muted-2">{validationError ?? "—"}</p>
            )}
          </section>
        </div>

        {/* Actions footer — toujours visible */}
        <div className="shrink-0 border-t border-line bg-white px-5 py-3 flex items-center justify-between gap-3">
          {validationError ? (
            <div className="flex items-center gap-1.5 text-[12px] text-amber">
              <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.4} />
              {validationError}
            </div>
          ) : (
            <p className="text-[12px] text-muted hidden lg:block">
              {articlesCount} ligne{articlesCount > 1 ? "s" : ""} · total{" "}
              <span className="text-ink font-semibold tabular-nums">
                {eurFmt.format(totalGlobal)}
              </span>
            </p>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="secondary" size="md" type="button" onClick={onCancel}>
              Retour
            </Button>
            <Button
              variant="primary"
              size="md"
              type="button"
              onClick={handleAdd}
              disabled={!calc || totalGlobal <= 0}
            >
              Ajouter à la pièce
            </Button>
          </div>
        </div>
      </div>

      {/* RIGHT — live preview (lg+ only) */}
      <aside className="hidden lg:flex lg:flex-col w-[280px] shrink-0 border-l border-line bg-canvas-2/30 min-h-0">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <ColorChip tone="violet" size="sm">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} />
            </ColorChip>
            <p className="eyebrow">Calcul temps réel</p>
          </div>

          {!calc ? (
            <div className="text-[12px] text-muted-2">
              {validationError ?? "Remplis les champs requis…"}
            </div>
          ) : (
            <div className="space-y-3 text-[12px]">
              <Card className="p-3 bg-white">
                <p className="text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 mb-1.5">
                  Sens de confection
                </p>
                <p className="text-[12.5px] text-ink-2">{calc.details.sensConfection}</p>
                <p className="text-[11px] text-muted mt-0.5">
                  {calc.details.nombreLes} lé{calc.details.nombreLes > 1 ? "s" : ""} · hauteur lé {calc.details.hauteurLe} cm · coef {calc.details.coefficient}
                </p>
                <p className="text-[11.5px] text-violet font-semibold mt-1.5">
                  Métrage tissu : {calc.metrageTotal.toFixed(2)} m
                </p>
              </Card>

              <Card className="p-3 bg-white">
                <p className="text-[10.5px] font-semibold tracking-wider uppercase text-violet-strong mb-1.5">
                  Article 1 — Tissu & Confection
                </p>
                <PriceRow label="Tissu" value={calc.prixTissu} />
                {calc.prixDoublure > 0 && (
                  <PriceRow
                    label={`Doublure (${(calc.details.metrageDoublure ?? 0).toFixed(2)} m)`}
                    value={calc.prixDoublure}
                  />
                )}
                <PriceRow label="Confection" value={calc.prixConfection} />
                <PriceRow label="Accessoires" value={calc.prixAccessoires} />
                <PriceRow
                  label="Sous-total"
                  value={calc.prixTissu + calc.prixDoublure + calc.prixConfection + calc.prixAccessoires}
                  strong
                />
              </Card>

              {v.rail !== "Tringle" && (
                <Card className="p-3 bg-white">
                  <p className="text-[10.5px] font-semibold tracking-wider uppercase text-blue mb-1.5">
                    Article 2 — Rail
                  </p>
                  <PriceRow label={`Rail ${v.rail} ${v.poseRail}`} value={calc.prixRail} />
                  {calc.prixCoudes > 0 && (
                    <PriceRow label={`${v.nombreCoudes} coude(s)`} value={calc.prixCoudes} />
                  )}
                  <PriceRow label="Sous-total" value={calc.prixRail + calc.prixCoudes} strong />
                </Card>
              )}

              {v.avecPose && calc.prixPose > 0 && (
                <Card className="p-3 bg-white">
                  <p className="text-[10.5px] font-semibold tracking-wider uppercase text-emerald mb-1.5">
                    Article 3 — Pose
                  </p>
                  <PriceRow label="Pose à domicile" value={calc.prixPose} strong />
                </Card>
              )}

              <div className="rounded-xl bg-ink text-white p-3">
                <p className="text-[10.5px] font-semibold tracking-wider uppercase opacity-70 mb-1">
                  Total rideau
                </p>
                <p className="text-[22px] font-bold tabular-nums leading-none">
                  {eurFmt.format(totalGlobal)}
                </p>
                <p className="text-[10.5px] opacity-60 mt-1.5">
                  {articlesCount} ligne{articlesCount > 1 ? "s" : ""} générée{articlesCount > 1 ? "s" : ""}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function PriceRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-[11.5px] py-0.5">
      <span className={strong ? "text-ink font-semibold" : "text-muted"}>{label}</span>
      <span
        className={
          "font-mono tabular-nums " + (strong ? "text-ink font-semibold" : "text-ink-2")
        }
      >
        {eurFmt.format(value)}
      </span>
    </div>
  );
}
