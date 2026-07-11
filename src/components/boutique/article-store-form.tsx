"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Hint, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ColorChip } from "@/components/ui/status-pill";
import { Sparkles, AlertCircle, AlertTriangle } from "lucide-react";
import type { BoutiquePieceArticle } from "@/app/(platform)/boutique/actions";
import { CONFIG, type TypeStore } from "@/lib/boutique/data";
import { calculateStore } from "@/lib/boutique/pricing/helpers";
import { TissuPicker } from "@/components/boutique/tissu-picker";
import type { ChainettePrice } from "@/lib/db/boutique-chainette";

const FALLBACK_CHAINETTES: ChainettePrice[] = [
  { id: "blanc", code: "blanc", label: "Blanc (standard)", price: 0, position: 0, active: true },
  { id: "alu", code: "alu", label: "Aluminium", price: 4.42, position: 1, active: true },
  { id: "noir", code: "noir", label: "Noir", price: 4.42, position: 2, active: true },
  { id: "laiton", code: "laiton", label: "Laiton", price: 4.42, position: 3, active: true },
];

const eurFmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const TYPES_STORE: { value: TypeStore; label: string; sub: string }[] = [
  { value: "Bateau régulier", label: "Bateau régulier", sub: "Plis identiques" },
  { value: "Bateau irrégulier", label: "Bateau irrégulier", sub: "Plis variables" },
];

type ChainetteCote = "gauche" | "droite";
type Doublure = "aucune" | "occultante" | "thermique" | "cotonnade" | "ouatine";

const DOUBLURE_OPTIONS: { value: Doublure; label: string }[] = [
  { value: "aucune", label: "Aucune" },
  { value: "occultante", label: "Occultante" },
  { value: "thermique", label: "Thermique" },
  { value: "cotonnade", label: "Cotonnade" },
  { value: "ouatine", label: "Ouatine" },
];

type Inputs = {
  typeStore: TypeStore;
  referenceTissu: string;
  largeurFinie: number;
  hauteurFinie: number;
  laizeTissu: number;
  raccordTissu: number;
  prixTissu: number;
  doublure: Doublure;
  chainetteCouleur: string;
  chainetteCote: ChainetteCote;
  chainetteDimensions: number;
  hauteurRefoulement: number;
  avecPose: boolean;
};

const initial: Inputs = {
  typeStore: "Bateau régulier",
  referenceTissu: "",
  largeurFinie: 120,
  hauteurFinie: 180,
  laizeTissu: 140,
  raccordTissu: 0,
  prixTissu: 60,
  doublure: "aucune",
  chainetteCouleur: "blanc",
  chainetteCote: "droite",
  chainetteDimensions: 100,
  hauteurRefoulement: 0,
  avecPose: true,
};

export function StoreForm({
  onAdd,
  onCancel,
  chainettePrices,
}: {
  onAdd: (articles: BoutiquePieceArticle[]) => void;
  onCancel: () => void;
  chainettePrices?: ChainettePrice[];
}) {
  const chainettes =
    chainettePrices && chainettePrices.length > 0
      ? chainettePrices.filter((c) => c.active)
      : FALLBACK_CHAINETTES;
  const [v, setV] = useState<Inputs>({
    ...initial,
    chainetteCouleur: chainettes[0]?.code ?? "blanc",
  });
  const selectedChainette =
    chainettes.find((c) => c.code === v.chainetteCouleur) ?? chainettes[0];
  const chainettePriceValue = selectedChainette?.price ?? 0;

  const validationError = useMemo(() => {
    if (!v.largeurFinie || v.largeurFinie <= 0) return "Largeur store requise.";
    if (!v.hauteurFinie || v.hauteurFinie <= 0) return "Hauteur store requise.";
    if (!v.laizeTissu || v.laizeTissu <= 0) return "Laize tissu requise.";
    if (v.prixTissu < 0) return "Prix tissu invalide.";
    return null;
  }, [v]);

  // Auto : si le tissu a un raccord (motif), force doublure + glissières plates
  const aMotif = v.raccordTissu > 0;
  const doublureEffective: Doublure = aMotif && v.doublure === "aucune" ? "occultante" : v.doublure;

  // Quand le raccord passe > 0 et que doublure était "aucune", la bascule
  // automatiquement vers occultante (sans bloquer l'utilisateur de changer).
  useEffect(() => {
    if (v.raccordTissu > 0 && v.doublure === "aucune") {
      setV((s) => ({ ...s, doublure: "occultante" }));
    }
  }, [v.raccordTissu, v.doublure]);

  const calc = useMemo(() => {
    if (validationError) return null;
    try {
      return calculateStore({
        typeStore: v.typeStore,
        largeurFinie: v.largeurFinie,
        hauteurFinie: v.hauteurFinie,
        laizeTissu: v.laizeTissu,
        prixTissuMetre: v.prixTissu,
        double: doublureEffective !== "aucune",
        chainetteCouleur: v.chainetteCouleur,
        avecPose: v.avecPose,
        supplementChainetteOverride: chainettePriceValue,
      });
    } catch {
      return null;
    }
  }, [v, validationError, doublureEffective, chainettePriceValue]);

  const update = (patch: Partial<Inputs>) => setV((s) => ({ ...s, ...patch }));

  const totalGlobal = calc
    ? calc.prixTissu +
      calc.prixDoublure +
      calc.prixConfection +
      calc.prixMecanisme +
      calc.supplementChainette +
      calc.prixAccessoires +
      (v.avecPose ? calc.prixPose : 0)
    : 0;

  const articlesCount =
    1 + 1 + (v.avecPose && calc && calc.prixPose > 0 ? 1 : 0);

  const handleAdd = () => {
    if (!calc) return;
    const articles: BoutiquePieceArticle[] = [];
    const baseDetail = `${v.typeStore} · ${v.largeurFinie}×${v.hauteurFinie}cm · laize ${v.laizeTissu}cm`;
    const refSlug = v.referenceTissu ? ` · ${v.referenceTissu}` : "";

    // ARTICLE 1 — Tissu + Confection + Accessoires + Doublure
    const prixArticle1 =
      calc.prixTissu + calc.prixDoublure + calc.prixConfection + calc.prixAccessoires;
    articles.push({
      type: "store",
      designation: `Store ${v.typeStore} — Tissu & Confection`,
      ref: v.referenceTissu || undefined,
      detail:
        `${baseDetail}${refSlug}` +
        ` · métrage ${calc.metrageTotal.toFixed(2)}m (${calc.details.sensConfection}, ${calc.details.nombreLes} lé${calc.details.nombreLes > 1 ? "s" : ""})` +
        (doublureEffective !== "aucune" ? ` · doublure ${doublureEffective}` : "") +
        (aMotif ? " · raccord motif" : ""),
      qty: 1,
      unitLabel: "u",
      unitPriceHt: Math.round(prixArticle1 * 100) / 100,
      meta: {
        typeArticle: "store_tissu_confection",
        typeStore: v.typeStore,
        referenceTissu: v.referenceTissu,
        largeurFinie: v.largeurFinie,
        hauteurFinie: v.hauteurFinie,
        laizeTissu: v.laizeTissu,
        raccordTissu: v.raccordTissu,
        prixTissuMetre: v.prixTissu,
        doublure: doublureEffective,
        double: doublureEffective !== "aucune", // backward-compat
        chainetteCote: v.chainetteCote,
        chainetteDimensions: v.chainetteDimensions,
        hauteurRefoulement: v.hauteurRefoulement,
        metrageTotal: calc.metrageTotal,
        sensConfection: calc.details.sensConfection,
        nombreLes: calc.details.nombreLes,
        hauteurAvecMarge: calc.details.hauteurAvecMarge,
        prixTissu: calc.prixTissu,
        prixDoublure: calc.prixDoublure,
        prixConfection: calc.prixConfection,
        prixAccessoires: calc.prixAccessoires,
        motifAvecRaccord: aMotif,
      },
    });

    // AUTO — Glissières plates quand le tissu a un raccord (motif)
    if (aMotif) {
      articles.push({
        type: "produit",
        designation: "Glissières plates (raccord motif)",
        ref: "GLIS-PLAT",
        detail: `Pour store ${v.typeStore} ${v.largeurFinie}×${v.hauteurFinie}cm — préserve l'alignement du motif`,
        qty: 1,
        unitLabel: "u",
        unitPriceHt: 0,
        meta: {
          typeArticle: "produit",
          autoAddedReason: "raccord_motif",
          parentTypeArticle: "store_tissu_confection",
        },
      });
    }

    // ARTICLE 2 — Mécanisme (+ chainette)
    const prixArticle2 = calc.prixMecanisme + calc.supplementChainette;
    const coteLabel = v.chainetteCote === "gauche" ? "à gauche" : "à droite";
    const refoulementLabel =
      v.hauteurRefoulement > 0 ? ` · refoulement ${v.hauteurRefoulement}cm` : "";
    articles.push({
      type: "store",
      designation: `Mécanisme store ${v.typeStore}`,
      ref: "MECA-STORE",
      detail:
        `largeur ${v.largeurFinie} cm` +
        (chainettePriceValue > 0
          ? ` · chaînette ${selectedChainette?.label ?? v.chainetteCouleur} ${coteLabel} (+ ${chainettePriceValue.toFixed(2)}€)`
          : ` · chaînette ${selectedChainette?.label ?? "blanche"} ${coteLabel}`) +
        refoulementLabel,
      qty: 1,
      unitLabel: "u",
      unitPriceHt: Math.round(prixArticle2 * 100) / 100,
      meta: {
        typeArticle: "mecanisme",
        chainetteCouleur: v.chainetteCouleur,
        chainetteCote: v.chainetteCote,
        chainetteDimensions: v.chainetteDimensions,
        hauteurRefoulement: v.hauteurRefoulement,
        prixMecanismeBase: calc.details.prixMecanismeAffiche,
        prixMecanisme: calc.prixMecanisme,
        supplementChainette: calc.supplementChainette,
      },
    });

    // ARTICLE 3 — Pose
    if (v.avecPose && calc.prixPose > 0) {
      articles.push({
        type: "store",
        designation: "Pose store à domicile",
        ref: "POSE-STORE",
        detail: `${v.largeurFinie}×${v.hauteurFinie}cm · forfait déplacement inclus`,
        qty: 1,
        unitLabel: "forfait",
        unitPriceHt: Math.round(calc.prixPose * 100) / 100,
        meta: {
          typeArticle: "pose_store",
          forfaitDeplacement: CONFIG.forfaits.deplacement,
        },
      });
    }

    onAdd(articles);
  };

  return (
    <div className="flex flex-col lg:flex-row" style={{ maxHeight: "80vh" }}>
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Type store */}
          <section>
            <Label>Type de store *</Label>
            <div className="grid grid-cols-2 gap-2">
              {TYPES_STORE.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => update({ typeStore: t.value })}
                  className={
                    "p-2.5 rounded-lg border text-left transition-all " +
                    (v.typeStore === t.value
                      ? "border-ink bg-canvas-2/60 shadow-sm"
                      : "border-line hover:border-line-strong bg-white")
                  }
                >
                  <p className="text-[12.5px] font-semibold text-ink">{t.label}</p>
                  <p className="text-[10.5px] text-muted mt-0.5">{t.sub}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Dimensions */}
          <section>
            <p className="eyebrow mb-2">Dimensions</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Largeur store (cm) *</Label>
                <Input
                  type="number"
                  min={1}
                  value={v.largeurFinie || ""}
                  onChange={(e) => update({ largeurFinie: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Hauteur store (cm) *</Label>
                <Input
                  type="number"
                  min={1}
                  value={v.hauteurFinie || ""}
                  onChange={(e) => update({ hauteurFinie: Number(e.target.value) || 0 })}
                />
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
              <div
                className={
                  "text-[11.5px] rounded-md px-3 py-2 leading-relaxed flex items-start gap-2 " +
                  (aMotif
                    ? "bg-amber-soft/60 border border-amber/30 text-amber"
                    : "bg-canvas-2/40 border border-line text-muted")
                }
              >
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" strokeWidth={2.4} />
                <span>
                  <strong>Tissu à motif (raccord &gt; 0)</strong> : ajouter des glissières
                  plates et la doublure est obligatoire pour ne pas couper le motif.
                  {aMotif && (
                    <> &nbsp;<strong>Auto-ajouté</strong> au devis : glissières plates + doublure {doublureEffective}.</>
                  )}
                </span>
              </div>
              <div>
                <Label>Doublure</Label>
                <div className="grid grid-cols-5 gap-1 rounded-md border border-line p-0.5 bg-white h-9">
                  {DOUBLURE_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => update({ doublure: o.value })}
                      disabled={aMotif && o.value === "aucune"}
                      className={
                        "text-[12px] font-semibold rounded-[5px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed " +
                        (v.doublure === o.value
                          ? "bg-ink text-white"
                          : "text-muted hover:text-ink")
                      }
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Mécanisme */}
          <section>
            <p className="eyebrow mb-2">Mécanisme</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Couleur chaînette</Label>
                <Select
                  value={v.chainetteCouleur}
                  onChange={(e) => update({ chainetteCouleur: e.target.value })}
                >
                  {chainettes.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                      {c.price > 0 ? ` (+${c.price.toFixed(2)}€)` : ""}
                    </option>
                  ))}
                </Select>
                <Hint>Tarifs éditables dans Paramètres → Boutique.</Hint>
              </div>
              <div>
                <Label>Côté chaînette</Label>
                <div className="grid grid-cols-2 gap-1 rounded-md border border-line p-0.5 bg-white h-9">
                  {(["gauche", "droite"] as ChainetteCote[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => update({ chainetteCote: c })}
                      className={
                        "text-[12px] font-semibold rounded-[5px] transition-colors capitalize " +
                        (v.chainetteCote === c
                          ? "bg-ink text-white"
                          : "text-muted hover:text-ink")
                      }
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <Label>Dimensions chaînette (cm)</Label>
                <Input
                  type="number"
                  min={0}
                  value={v.chainetteDimensions || ""}
                  onChange={(e) =>
                    update({ chainetteDimensions: Number(e.target.value) || 0 })
                  }
                  placeholder="ex. 100"
                />
                <Hint>Longueur visible de la chaînette une fois posée.</Hint>
              </div>
              <div className="col-span-2">
                <Label>Hauteur de refoulement (cm)</Label>
                <Input
                  type="number"
                  min={0}
                  value={v.hauteurRefoulement || ""}
                  onChange={(e) =>
                    update({ hauteurRefoulement: Number(e.target.value) || 0 })
                  }
                  placeholder="0"
                />
                <Hint>
                  Hauteur occupée par le store relevé (utile pour préserver une vue
                  ou un linteau).
                </Hint>
              </div>
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

          {/* Mobile preview */}
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

      {/* Preview */}
      <aside className="hidden lg:flex lg:flex-col w-[280px] shrink-0 border-l border-line bg-canvas-2/30 min-h-0">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <ColorChip tone="blue" size="sm">
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
                  {calc.details.nombreLes} lé{calc.details.nombreLes > 1 ? "s" : ""} · hauteur avec marge {calc.details.hauteurAvecMarge} cm
                </p>
                <p className="text-[11.5px] text-blue font-semibold mt-1.5">
                  Métrage tissu : {calc.metrageTotal.toFixed(2)} m
                </p>
              </Card>

              <Card className="p-3 bg-white">
                <p className="text-[10.5px] font-semibold tracking-wider uppercase text-violet-strong mb-1.5">
                  Article 1 — Tissu & Confection
                </p>
                <PriceRow label="Tissu" value={calc.prixTissu} />
                {calc.prixDoublure > 0 && (
                  <PriceRow label="Doublure" value={calc.prixDoublure} />
                )}
                <PriceRow label="Confection" value={calc.prixConfection} />
                <PriceRow label="Accessoires" value={calc.prixAccessoires} />
                <PriceRow
                  label="Sous-total"
                  value={calc.prixTissu + calc.prixDoublure + calc.prixConfection + calc.prixAccessoires}
                  strong
                />
              </Card>

              <Card className="p-3 bg-white">
                <p className="text-[10.5px] font-semibold tracking-wider uppercase text-blue mb-1.5">
                  Article 2 — Mécanisme
                </p>
                <PriceRow
                  label={`Mécanisme (base ${calc.details.prixMecanismeAffiche.toFixed(0)}€ × cache ${CONFIG.coefficientCache})`}
                  value={calc.prixMecanisme}
                />
                {calc.supplementChainette > 0 && (
                  <PriceRow
                    label={`Chaînette ${v.chainetteCouleur}`}
                    value={calc.supplementChainette}
                  />
                )}
                <PriceRow
                  label="Sous-total"
                  value={calc.prixMecanisme + calc.supplementChainette}
                  strong
                />
              </Card>

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
                  Total store
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
