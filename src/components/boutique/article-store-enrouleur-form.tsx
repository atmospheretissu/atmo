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
type Enroulement = "avant" | "arriere";

type Inputs = {
  referenceTissu: string;
  largeurFinie: number;
  hauteurFinie: number;
  prixTissu: number; // €/m² du tissu enrouleur
  chainetteCouleur: string;
  chainetteCote: ChainetteCote;
  enroulement: Enroulement;
  prixMecanisme: number; // forfait, paramétrable
  avecPose: boolean;
  prixPose: number;
};

const initial: Inputs = {
  referenceTissu: "",
  largeurFinie: 120,
  hauteurFinie: 180,
  prixTissu: 80,
  chainetteCouleur: "blanc",
  chainetteCote: "droite",
  enroulement: "arriere",
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
    const prixTissu = Math.round(surface * v.prixTissu * 100) / 100;
    const prixMecanisme = v.prixMecanisme;
    const prixPose = v.avecPose ? v.prixPose : 0;
    const total = prixTissu + prixMecanisme + prixPose;
    return { surface, prixTissu, prixMecanisme, prixPose, total };
  }, [v, validationError]);

  const handleAdd = () => {
    if (!calc) return;
    const articles: BoutiquePieceArticle[] = [];
    const coteLabel = v.chainetteCote === "gauche" ? "à gauche" : "à droite";
    const enroulementLabel =
      v.enroulement === "avant" ? "enroulement avant" : "enroulement arrière";

    // 1. Tissu + mécanisme groupés (1 article tissu, 1 article mécanisme)
    articles.push({
      type: "store",
      designation: "Store enrouleur — Tissu",
      ref: v.referenceTissu || undefined,
      detail:
        `${v.largeurFinie}×${v.hauteurFinie}cm · surface ${calc.surface.toFixed(2)}m² · ${enroulementLabel}` +
        (v.referenceTissu ? ` · ${v.referenceTissu}` : ""),
      qty: 1,
      unitLabel: "u",
      unitPriceHt: calc.prixTissu,
      meta: {
        typeArticle: "store_enrouleur_tissu",
        referenceTissu: v.referenceTissu,
        largeurFinie: v.largeurFinie,
        hauteurFinie: v.hauteurFinie,
        surface: calc.surface,
        enroulement: v.enroulement,
        prixTissuMetreCarre: v.prixTissu,
      },
    });

    articles.push({
      type: "store",
      designation: "Mécanisme store enrouleur",
      ref: "MECA-ENROUL",
      detail: `largeur ${v.largeurFinie}cm · chaînette ${v.chainetteCouleur} ${coteLabel}`,
      qty: 1,
      unitLabel: "u",
      unitPriceHt: calc.prixMecanisme,
      meta: {
        typeArticle: "store_enrouleur_mecanisme",
        chainetteCouleur: v.chainetteCouleur,
        chainetteCote: v.chainetteCote,
        enroulement: v.enroulement,
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
                    {e === "arriere" ? "Arrière" : "Avant"}
                  </button>
                ))}
              </div>
              <Hint>
                Arrière (standard) : le tissu passe derrière le tube · Avant : le
                tissu passe devant.
              </Hint>
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
              <Label>Prix tissu (€/m²) *</Label>
              <Input
                type="number"
                step="0.5"
                min={0}
                value={v.prixTissu || ""}
                onChange={(e) => update({ prixTissu: Number(e.target.value) || 0 })}
              />
              <Hint>
                Tissu spécifique au store enrouleur (Vedelux / Copahome…) — prix au m².
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
