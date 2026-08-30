"use client";

import { useMemo, useState } from "react";
import { Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Hint, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ColorChip } from "@/components/ui/status-pill";
import type { BoutiquePieceArticle } from "@/app/(platform)/boutique/actions";

const eurFmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

type ChainetteCote = "gauche" | "droite";
// Convention métier : "arriere" = enroulement Standard (le tissu passe
// derrière le tube, ressort par l'arrière — pose sans casquette la plus
// classique). "avant" = enroulement Contra (le tissu passe devant, sort
// par l'avant, plus adapté aux poses en applique).
type Enroulement = "avant" | "arriere";
type Fixation = "mural" | "plafond";
// Type de toile : enrouleur classique (opaque / occultant / tamisant) OU
// screen (voir à travers, tamise la chaleur). Même mécanisme, tarification
// tissu au m² identique — c'est juste le choix produit.
type TypeToile = "enrouleur" | "screen";
type Coloris = "" | string;

type Inputs = {
  typeToile: TypeToile;
  referenceTissu: string;
  coloris: Coloris; // champ libre coloris du tissu
  largeurFinie: number;
  hauteurFinie: number;
  prixTissu: number; // €/m² du tissu enrouleur/screen
  // Toggle saisie : soit prix au m² (prixTissu), soit prix total HT (prixTotalTissu).
  // Le champ non-sélectionné est ignoré au calcul.
  prixMode: "m2" | "total";
  prixTotalTissu: number;
  chainetteCouleur: string;
  chainetteCote: ChainetteCote;
  enroulement: Enroulement;
  fixation: Fixation;
  avecCasquette: boolean;
  casquetteHauteur: number; // cm, 0 si pas de casquette
  prixMecanisme: number; // forfait, paramétrable
  avecPose: boolean;
  prixPose: number;
};

const initial: Inputs = {
  typeToile: "enrouleur",
  referenceTissu: "",
  coloris: "",
  largeurFinie: 120,
  hauteurFinie: 180,
  prixTissu: 80,
  prixMode: "m2",
  prixTotalTissu: 0,
  chainetteCouleur: "blanc",
  chainetteCote: "droite",
  enroulement: "arriere",
  fixation: "mural",
  avecCasquette: false,
  casquetteHauteur: 8,
  prixMecanisme: 90,
  avecPose: true,
  prixPose: 70,
};

/**
 * Store enrouleur — formulaire simplifié vs bateau :
 * - pas de laize ni de doublure
 * - tarif tissu €/m²
 * - choix enroulement avant/arrière (différence visuelle pour le client)
 *
 * Le tarif mécanisme reste paramétrable côté Atmosphère (review p.6 : on
 * "scrape" les références Vedelux/Copa, le prix est ajustable).
 */
export function StoreEnrouleurForm({
  onAdd,
  onCancel,
}: {
  onAdd: (articles: BoutiquePieceArticle[]) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState<Inputs>(initial);
  const update = (patch: Partial<Inputs>) => setV((s) => ({ ...s, ...patch }));

  const validationError = useMemo(() => {
    if (!v.largeurFinie || v.largeurFinie <= 0) return "Largeur requise.";
    if (!v.hauteurFinie || v.hauteurFinie <= 0) return "Hauteur requise.";
    if (v.prixTissu < 0) return "Prix tissu invalide.";
    return null;
  }, [v]);

  const calc = useMemo(() => {
    if (validationError) return null;
    const surface = (v.largeurFinie * v.hauteurFinie) / 10_000;
    // Prix tissu : soit saisi au m² (multiplier par surface), soit saisi
    // en total HT (utilisé tel quel). On expose aussi le prix au m²
    // équivalent pour affichage / meta.
    const prixTissu =
      v.prixMode === "total"
        ? Math.round(v.prixTotalTissu * 100) / 100
        : Math.round(surface * v.prixTissu * 100) / 100;
    const prixTissuMetreCarre =
      v.prixMode === "total" && surface > 0
        ? Math.round((v.prixTotalTissu / surface) * 100) / 100
        : v.prixTissu;
    const prixMecanisme = v.prixMecanisme;
    const prixPose = v.avecPose ? v.prixPose : 0;
    const total = prixTissu + prixMecanisme + prixPose;
    return { surface, prixTissu, prixTissuMetreCarre, prixMecanisme, prixPose, total };
  }, [v, validationError]);

  const handleAdd = () => {
    if (!calc) return;
    const articles: BoutiquePieceArticle[] = [];
    const coteLabel = v.chainetteCote === "gauche" ? "à gauche" : "à droite";
    const enroulementLabel =
      v.enroulement === "avant" ? "enroulement Contra" : "enroulement Standard";
    const fixationLabel = v.fixation === "plafond" ? "plafond" : "mural";
    const casquetteLabel = v.avecCasquette
      ? ` · casquette ${v.casquetteHauteur} cm`
      : "";
    const colorisLabel = v.coloris ? ` · coloris ${v.coloris}` : "";

    const toileLabel = v.typeToile === "screen" ? "Store screen" : "Store enrouleur";
    // 1. Tissu + mécanisme groupés (1 article tissu, 1 article mécanisme)
    articles.push({
      type: "store",
      designation: `${toileLabel} — Tissu`,
      ref: v.referenceTissu || undefined,
      detail:
        `${v.largeurFinie}×${v.hauteurFinie}cm · surface ${calc.surface.toFixed(2)}m² · ${enroulementLabel}` +
        (v.referenceTissu ? ` · ${v.referenceTissu}` : "") +
        colorisLabel,
      qty: 1,
      unitLabel: "u",
      unitPriceHt: calc.prixTissu,
      meta: {
        typeArticle:
          v.typeToile === "screen"
            ? "store_screen_tissu"
            : "store_enrouleur_tissu",
        typeToile: v.typeToile,
        referenceTissu: v.referenceTissu,
        coloris: v.coloris || null,
        largeurFinie: v.largeurFinie,
        hauteurFinie: v.hauteurFinie,
        surface: calc.surface,
        enroulement: v.enroulement,
        prixTissuMetreCarre: calc.prixTissuMetreCarre,
        prixMode: v.prixMode,
      },
    });

    articles.push({
      type: "store",
      designation: `Mécanisme ${toileLabel.toLowerCase()}`,
      ref: v.typeToile === "screen" ? "MECA-SCREEN" : "MECA-ENROUL",
      detail:
        `largeur ${v.largeurFinie}cm · chaînette ${v.chainetteCouleur} ${coteLabel}` +
        ` · fixation ${fixationLabel}` +
        casquetteLabel,
      qty: 1,
      unitLabel: "u",
      unitPriceHt: calc.prixMecanisme,
      meta: {
        typeArticle: "store_enrouleur_mecanisme",
        chainetteCouleur: v.chainetteCouleur,
        chainetteCote: v.chainetteCote,
        enroulement: v.enroulement,
        fixation: v.fixation,
        avecCasquette: v.avecCasquette,
        casquetteHauteur: v.avecCasquette ? v.casquetteHauteur : null,
        prixMecanisme: calc.prixMecanisme,
      },
    });

    if (v.avecPose && calc.prixPose > 0) {
      articles.push({
        type: "pose",
        designation: "Pose store enrouleur",
        ref: "POSE-ENROUL",
        detail: `${v.largeurFinie}×${v.hauteurFinie}cm · forfait déplacement inclus`,
        qty: 1,
        unitLabel: "forfait",
        unitPriceHt: calc.prixPose,
        meta: {
          typeArticle: "pose_store_enrouleur",
          prixPose: calc.prixPose,
        },
      });
    }
    onAdd(articles);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 p-5 max-h-[75vh] overflow-y-auto">
      <div className="space-y-5">
        {/* Type de toile */}
        <section>
          <p className="eyebrow mb-2">Type de store</p>
          <div className="grid grid-cols-2 gap-1 rounded-md border border-line p-0.5 bg-white h-9">
            {(
              [
                { v: "enrouleur", label: "Enrouleur (opaque / tamisant)" },
                { v: "screen", label: "Screen (voir à travers)" },
              ] as { v: TypeToile; label: string }[]
            ).map((t) => (
              <button
                key={t.v}
                type="button"
                onClick={() => update({ typeToile: t.v })}
                className={
                  "text-[12px] font-semibold rounded-[5px] transition-colors " +
                  (v.typeToile === t.v
                    ? "bg-ink text-white"
                    : "text-muted hover:text-ink")
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>

        {/* Dimensions */}
        <section>
          <p className="eyebrow mb-2">Dimensions</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Largeur finie (cm) *</Label>
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
              <Label>Enroulement</Label>
              <div className="grid grid-cols-2 gap-1 rounded-md border border-line p-0.5 bg-white h-9">
                {(["arriere", "avant"] as Enroulement[]).map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => update({ enroulement: e })}
                    className={
                      "text-[12px] font-semibold rounded-[5px] transition-colors " +
                      (v.enroulement === e
                        ? "bg-ink text-white"
                        : "text-muted hover:text-ink")
                    }
                  >
                    {e === "arriere" ? "Standard" : "Contra"}
                  </button>
                ))}
              </div>
              <Hint>
                Standard : le tissu passe derrière le tube (usage courant) · Contra : le tissu passe devant (pose en applique).
              </Hint>
            </div>
            <div>
              <Label>Fixation</Label>
              <div className="grid grid-cols-2 gap-1 rounded-md border border-line p-0.5 bg-white h-9">
                {(["mural", "plafond"] as Fixation[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => update({ fixation: f })}
                    className={
                      "text-[12px] font-semibold rounded-[5px] transition-colors capitalize " +
                      (v.fixation === f
                        ? "bg-ink text-white"
                        : "text-muted hover:text-ink")
                    }
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-3 pt-2 border-t border-line">
              <div>
                <Label>Casquette (facultatif)</Label>
                <label className="inline-flex items-center gap-2 text-[13px] cursor-pointer h-9">
                  <input
                    type="checkbox"
                    checked={v.avecCasquette}
                    onChange={(e) => update({ avecCasquette: e.target.checked })}
                    className="h-4 w-4 rounded border-line-strong"
                  />
                  <span className="text-ink-2">Ajouter une casquette</span>
                </label>
              </div>
              {v.avecCasquette && (
                <div>
                  <Label>Hauteur casquette (cm)</Label>
                  <Input
                    type="number"
                    min={4}
                    max={20}
                    value={v.casquetteHauteur || ""}
                    onChange={(e) =>
                      update({ casquetteHauteur: Number(e.target.value) || 0 })
                    }
                  />
                </div>
              )}
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
                placeholder="ex: Vedelux Noir tamisant"
              />
            </div>
            <div>
              <Label>Coloris (champ libre)</Label>
              <Input
                value={v.coloris}
                onChange={(e) => update({ coloris: e.target.value })}
                placeholder="ex : gris anthracite, écru, sable…"
              />
              <Hint>Précise le coloris exact commandé au fournisseur.</Hint>
            </div>
            <div>
              <Label>
                Prix tissu (
                {v.prixMode === "total" ? "total HT" : "€/m²"}) *
              </Label>
              <div className="flex items-stretch gap-1.5">
                <Input
                  type="number"
                  step="0.5"
                  min={0}
                  value={
                    v.prixMode === "total"
                      ? v.prixTotalTissu || ""
                      : v.prixTissu || ""
                  }
                  onChange={(e) => {
                    const n = Number(e.target.value) || 0;
                    if (v.prixMode === "total") update({ prixTotalTissu: n });
                    else update({ prixTissu: n });
                  }}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() =>
                    update({
                      prixMode: v.prixMode === "total" ? "m2" : "total",
                    })
                  }
                  className="h-9 px-2.5 rounded-md border border-line-strong bg-white text-[11.5px] font-semibold text-ink-2 hover:border-violet hover:text-violet transition-colors"
                  title="Basculer entre prix au m² et prix total"
                >
                  ↔ {v.prixMode === "total" ? "€ / m²" : "Total HT"}
                </button>
              </div>
              <Hint>
                {v.prixMode === "total"
                  ? "Prix total HT du tissu (calculé automatiquement en €/m² selon la surface)."
                  : "Prix au m² du tissu enrouleur (Vedelux, Copahome…). Bascule pour saisir un total."}
              </Hint>
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
                <option value="blanc">Blanc</option>
                <option value="alu">Aluminium</option>
                <option value="noir">Noir</option>
                <option value="laiton">Laiton</option>
              </Select>
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
              <Label>Prix mécanisme (€)</Label>
              <Input
                type="number"
                step="1"
                min={0}
                value={v.prixMecanisme || ""}
                onChange={(e) => update({ prixMecanisme: Number(e.target.value) || 0 })}
              />
              <Hint>
                Forfait paramétrable selon le mécanisme fournisseur (Vedelux / Copa).
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
            <span className="text-ink-2">Inclure la pose</span>
          </label>
          {v.avecPose && (
            <div className="mt-3 max-w-[200px]">
              <Label>Prix pose (€)</Label>
              <Input
                type="number"
                step="1"
                min={0}
                value={v.prixPose || ""}
                onChange={(e) => update({ prixPose: Number(e.target.value) || 0 })}
              />
            </div>
          )}
        </section>
      </div>

      {/* Récap */}
      <Card className="p-4 h-fit sticky top-2">
        <div className="flex items-center justify-between mb-3">
          <p className="eyebrow">Récapitulatif</p>
          <ColorChip tone="blue" size="sm">
            <Sparkles className="h-3 w-3" strokeWidth={2.4} />
          </ColorChip>
        </div>
        {validationError ? (
          <div className="text-[12.5px] text-amber inline-flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.4} /> {validationError}
          </div>
        ) : calc ? (
          <div className="space-y-2 text-[12.5px]">
            <Row
              label={`Tissu (${calc.surface.toFixed(2)} m²)`}
              value={eurFmt.format(calc.prixTissu)}
            />
            <Row label="Mécanisme" value={eurFmt.format(calc.prixMecanisme)} />
            {v.avecPose && <Row label="Pose" value={eurFmt.format(calc.prixPose)} />}
            <div className="pt-2 border-t border-line flex items-center justify-between">
              <span className="text-[13px] font-semibold text-ink">Total HT</span>
              <span className="text-[20px] font-semibold tabular-nums text-ink leading-none">
                {eurFmt.format(calc.total)}
              </span>
            </div>
          </div>
        ) : null}
        <div className="mt-4 flex flex-col gap-2">
          <Button
            variant="primary"
            size="md"
            type="button"
            onClick={handleAdd}
            disabled={!calc}
          >
            Ajouter à la pièce
          </Button>
          <Button variant="secondary" size="md" type="button" onClick={onCancel}>
            Retour
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-2">{label}</span>
      <span className="tabular-nums text-ink">{value}</span>
    </div>
  );
}
