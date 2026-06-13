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

const eurFmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const TYPES_RIDEAU: { value: TypeRideau; label: string; sub: string }[] = [
  { value: "Plis simples", label: "Plis simples", sub: `coef ${CONFIG.coefficients["Plis simples"]}` },
  { value: "Vague", label: "Vague", sub: `coef ${CONFIG.coefficients["Vague"]}` },
  { value: "À œillets", label: "Œillets", sub: `coef ${CONFIG.coefficients["À œillets"]}` },
];

const RAILS: { value: TypeRail; label: string }[] = [
  { value: "DS", label: "DS — droit standard" },
  { value: "DV", label: "DV — droit vague" },
  { value: "CS", label: "CS — courbe standard" },
  { value: "CV", label: "CV — courbe vague" },
  { value: "Tringle", label: "Tringle (pas de rail)" },
];

type Inputs = {
  typeRideau: TypeRideau;
  panneau: number;
  referenceTissu: string;
  largeurFinie: number;
  hauteurFinie: number;
  laizeTissu: number;
  raccordTissu: number;
  prixTissu: number;
  double: boolean;
  casseSol: number;
  rail: TypeRail;
  poseRail: TypePose;
  couleurRail: string;
  nombreCoudes: number;
  avecPose: boolean;
  // Fiche atelier — précisions confection
  nombreGalets: number;
  ourletHaut: number;
  ourletBas: number;
};

const initial: Inputs = {
  typeRideau: "Plis simples",
  panneau: 1,
  referenceTissu: "",
  largeurFinie: 240,
  hauteurFinie: 250,
  laizeTissu: 140,
  raccordTissu: 0,
  prixTissu: 60,
  double: false,
  casseSol: 0,
  rail: "DS",
  poseRail: "plafond",
  couleurRail: "",
  nombreCoudes: 0,
  avecPose: true,
  nombreGalets: 0,
  ourletHaut: 5,
  ourletBas: 10,
};

export function RideauForm({
  onAdd,
  onCancel,
}: {
  onAdd: (articles: BoutiquePieceArticle[]) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState<Inputs>(initial);

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
      return calculateRideau({
        typeRideau: v.typeRideau,
        largeurFinie: v.largeurFinie,
        hauteurFinie: v.hauteurFinie + (v.casseSol || 0),
        laizeTissu: v.laizeTissu,
        raccordTissu: v.raccordTissu || 0,
        prixTissuMetre: v.prixTissu,
        double: v.double,
        rail: v.rail,
        poseRail: v.poseRail,
        nombreCoudes: v.nombreCoudes || 0,
        avecPose: v.avecPose,
      });
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
    articles.push({
      type: "rideau",
      designation: `Rideau ${v.typeRideau} — Tissu & Confection`,
      ref: v.referenceTissu || undefined,
      detail:
        `${baseDetail}${refSlug}` +
        ` · métrage ${calc.metrageTotal.toFixed(2)}m (${calc.details.sensConfection}, ${calc.details.nombreLes} lé${calc.details.nombreLes > 1 ? "s" : ""})` +
        (v.double ? " · doublure occultante" : ""),
      qty: 1,
      unitLabel: "u",
      unitPriceHt: Math.round(prixArticle1 * 100) / 100,
      meta: {
        typeArticle: "rideau_tissu_confection",
        typeRideau: v.typeRideau,
        panneau: v.panneau,
        referenceTissu: v.referenceTissu,
        largeurFinie: v.largeurFinie,
        hauteurFinie: v.hauteurFinie,
        casseSol: v.casseSol,
        laizeTissu: v.laizeTissu,
        raccordTissu: v.raccordTissu,
        prixTissuMetre: v.prixTissu,
        double: v.double,
        metrageTotal: calc.metrageTotal,
        sensConfection: calc.details.sensConfection,
        nombreLes: calc.details.nombreLes,
        coefficient: calc.details.coefficient,
        prixTissu: calc.prixTissu,
        prixDoublure: calc.prixDoublure,
        prixConfection: calc.prixConfection,
        prixAccessoires: calc.prixAccessoires,
        nombreGalets: v.nombreGalets,
        ourletHaut: v.ourletHaut,
        ourletBas: v.ourletBas,
      },
    });

    if (v.rail !== "Tringle") {
      const prixArticle2 = calc.prixRail + calc.prixCoudes;
      articles.push({
        type: "rideau",
        designation: `Rail ${v.rail} — pose ${v.poseRail}${v.couleurRail ? ` · ${v.couleurRail}` : ""}`,
        ref: `RAIL-${v.rail}`,
        detail:
          `${v.largeurFinie} cm linéaire` +
          (v.nombreCoudes > 0 ? ` · ${v.nombreCoudes} coude${v.nombreCoudes > 1 ? "s" : ""}` : ""),
        qty: 1,
        unitLabel: "u",
        unitPriceHt: Math.round(prixArticle2 * 100) / 100,
        meta: {
          typeArticle: "rail",
          rail: v.rail,
          poseRail: v.poseRail,
          couleurRail: v.couleurRail,
          nombreCoudes: v.nombreCoudes,
          prixRail: calc.prixRail,
          prixCoudes: calc.prixCoudes,
        },
      });
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
                <Label>Cassé au sol (cm)</Label>
                <Input
                  type="number"
                  min={0}
                  value={v.casseSol || ""}
                  onChange={(e) => update({ casseSol: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Nombre de panneaux</Label>
                <Input
                  type="number"
                  min={1}
                  value={v.panneau || ""}
                  onChange={(e) => update({ panneau: Number(e.target.value) || 1 })}
                />
              </div>
            </div>
          </section>

          {/* Fiche atelier — précisions confection */}
          <section>
            <p className="eyebrow mb-2">Confection — fiche atelier</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Nombre de galets</Label>
                <Input
                  type="number"
                  min={0}
                  value={v.nombreGalets || ""}
                  onChange={(e) => update({ nombreGalets: Number(e.target.value) || 0 })}
                  placeholder="ex. 12"
                />
              </div>
              <div>
                <Label>Ourlet haut (cm)</Label>
                <Input
                  type="number"
                  min={0}
                  value={v.ourletHaut || ""}
                  onChange={(e) => update({ ourletHaut: Number(e.target.value) || 0 })}
                  placeholder="5"
                />
              </div>
              <div>
                <Label>Ourlet bas (cm)</Label>
                <Input
                  type="number"
                  min={0}
                  value={v.ourletBas || ""}
                  onChange={(e) => update({ ourletBas: Number(e.target.value) || 0 })}
                  placeholder="10"
                />
              </div>
            </div>
          </section>

          {/* Tissu */}
          <section>
            <p className="eyebrow mb-2">Tissu</p>
            <div className="space-y-3">
              <div>
                <Label>Référence tissu</Label>
                <Input
                  value={v.referenceTissu}
                  onChange={(e) => update({ referenceTissu: e.target.value })}
                  placeholder="ex: Casamance Saumon · 204"
                />
              </div>
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
              <label className="inline-flex items-center gap-2 text-[13px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={v.double}
                  onChange={(e) => update({ double: e.target.checked })}
                  className="h-4 w-4 rounded border-line-strong"
                />
                <span className="text-ink-2">
                  Doublure occultante (+ {CONFIG.doublureOccultante.prixParMetre} €/m)
                </span>
              </label>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Couleur rail</Label>
                  <Input
                    value={v.couleurRail}
                    onChange={(e) => update({ couleurRail: e.target.value })}
                    placeholder="blanc, alu, noir mat…"
                  />
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
