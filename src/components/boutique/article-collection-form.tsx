"use client";

import { useMemo, useState } from "react";
import { Sparkles, AlertCircle, Truck } from "lucide-react";
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

type SousFamille = "rideau" | "store_bateau" | "store_enrouleur";
type Matiere = "lin" | "polyester";

type Inputs = {
  sousFamille: SousFamille;
  matiere: Matiere;
  reference: string;
  largeurFinie: number;
  hauteurFinie: number;
  prixTissu: number; // €/m (linéaire) pour rideau/store bateau, €/m² pour enrouleur
  metrageEstime: number; // calculé approximativement, modifiable
  prixConfection: number; // forfait paramétrable
  avecPose: boolean;
  prixPose: number;
};

const initial: Inputs = {
  sousFamille: "rideau",
  matiere: "lin",
  reference: "",
  largeurFinie: 240,
  hauteurFinie: 250,
  prixTissu: 45,
  metrageEstime: 7,
  prixConfection: 120,
  avecPose: true,
  prixPose: 70,
};

const SOUS_FAMILLES_LABELS: Record<SousFamille, string> = {
  rideau: "Rideau sur mesure",
  store_bateau: "Store bateau",
  store_enrouleur: "Store enrouleur",
};

/**
 * Détermine le routing fournisseur pour un item collection.
 * Règles (review p.13) :
 *   - LIN → Pologne (Polo, BC papier)
 *   - Polyester + confection (rideau/store bateau confectionné) → Ukraine (XML)
 *   - Polyester sans confection (tissu seul, store enrouleur en kit) → Pologne
 */
function computeRouting(matiere: Matiere, sousFamille: SousFamille): {
  routing: "pologne" | "ukraine";
  label: string;
  detail: string;
  tone: "blue" | "amber";
} {
  if (matiere === "lin") {
    return {
      routing: "pologne",
      label: "Pologne (Polo)",
      detail: "Bon de commande papier — lin en Pologne",
      tone: "blue",
    };
  }
  // Polyester
  if (sousFamille === "rideau" || sousFamille === "store_bateau") {
    return {
      routing: "ukraine",
      label: "Ukraine (XML)",
      detail: "Fichier XML — polyester + confection en Ukraine",
      tone: "amber",
    };
  }
  return {
    routing: "pologne",
    label: "Pologne (Polo)",
    detail: "Polyester sans confection — Pologne",
    tone: "blue",
  };
}

export function ArticleCollectionForm({
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
    if (v.metrageEstime < 0) return "Métrage invalide.";
    return null;
  }, [v]);

  const calc = useMemo(() => {
    if (validationError) return null;
    const prixTissu = Math.round(v.metrageEstime * v.prixTissu * 100) / 100;
    const prixConfection = v.prixConfection;
    const prixPose = v.avecPose ? v.prixPose : 0;
    const total = prixTissu + prixConfection + prixPose;
    return { prixTissu, prixConfection, prixPose, total };
  }, [v, validationError]);

  const routing = computeRouting(v.matiere, v.sousFamille);

  const handleAdd = () => {
    if (!calc) return;
    const articles: BoutiquePieceArticle[] = [];
    const refLabel = v.reference ? ` · ${v.reference}` : "";
    const matiereLabel = v.matiere === "lin" ? "LIN" : "POLYESTER";

    // 1. Tissu + confection groupés
    articles.push({
      type: v.sousFamille === "store_enrouleur" ? "store_enrouleur" : v.sousFamille === "store_bateau" ? "store" : "rideau",
      designation: `Collection Atmosphère — ${SOUS_FAMILLES_LABELS[v.sousFamille]} ${matiereLabel}`,
      ref: v.reference || undefined,
      detail:
        `${v.largeurFinie}×${v.hauteurFinie}cm · métrage ${v.metrageEstime.toFixed(1)}m` +
        refLabel,
      qty: 1,
      unitLabel: "u",
      unitPriceHt: calc.prixTissu + calc.prixConfection,
      meta: {
        typeArticle: "collection_atmosphere",
        collection: true,
        sousFamille: v.sousFamille,
        matiere: v.matiere,
        reference: v.reference,
        largeurFinie: v.largeurFinie,
        hauteurFinie: v.hauteurFinie,
        metrageTotal: v.metrageEstime,
        prixTissuMetre: v.prixTissu,
        prixTissu: calc.prixTissu,
        prixConfection: calc.prixConfection,
        // Routing déterminé côté serveur lors de la création des BC mais on
        // l'embarque pour l'afficher dans la fiche dossier.
        routing: routing.routing,
        routingLabel: routing.label,
      },
    });

    if (v.avecPose && calc.prixPose > 0) {
      articles.push({
        type: "pose",
        designation: `Pose ${SOUS_FAMILLES_LABELS[v.sousFamille]} (Collection)`,
        ref: undefined,
        detail: `${v.largeurFinie}×${v.hauteurFinie}cm`,
        qty: 1,
        unitLabel: "forfait",
        unitPriceHt: calc.prixPose,
        meta: {
          typeArticle:
            v.sousFamille === "rideau"
              ? "pose_rideau"
              : v.sousFamille === "store_bateau"
                ? "pose_store"
                : "pose_store_enrouleur",
        },
      });
    }
    onAdd(articles);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 p-5 max-h-[75vh] overflow-y-auto">
      <div className="space-y-5">
        {/* Sous-famille + matière */}
        <section>
          <p className="eyebrow mb-2">Sous-famille</p>
          <div className="grid grid-cols-3 gap-1 rounded-md border border-line p-0.5 bg-white h-10">
            {(Object.keys(SOUS_FAMILLES_LABELS) as SousFamille[]).map((sf) => (
              <button
                key={sf}
                type="button"
                onClick={() => update({ sousFamille: sf })}
                className={
                  "text-[12.5px] font-semibold rounded-[5px] transition-colors " +
                  (v.sousFamille === sf
                    ? "bg-ink text-white"
                    : "text-muted hover:text-ink")
                }
              >
                {SOUS_FAMILLES_LABELS[sf]}
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="eyebrow mb-2">Matière (Collection Atmosphère)</p>
          <div className="grid grid-cols-2 gap-1 rounded-md border border-line p-0.5 bg-white h-10">
            {(["lin", "polyester"] as Matiere[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => update({ matiere: m })}
                className={
                  "text-[12.5px] font-semibold rounded-[5px] transition-colors uppercase tracking-wider " +
                  (v.matiere === m
                    ? "bg-ink text-white"
                    : "text-muted hover:text-ink")
                }
              >
                {m}
              </button>
            ))}
          </div>
          <Hint>
            Lin → Pologne (BC papier) · Polyester + confection → Ukraine (XML) ·
            Polyester sans confection → Pologne
          </Hint>
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
              <Label>Référence interne</Label>
              <Input
                value={v.reference}
                onChange={(e) => update({ reference: e.target.value })}
                placeholder="ex: COLL-LIN-NAT"
              />
            </div>
            <div>
              <Label>Métrage estimé (m) *</Label>
              <Input
                type="number"
                step="0.1"
                min={0}
                value={v.metrageEstime || ""}
                onChange={(e) => update({ metrageEstime: Number(e.target.value) || 0 })}
              />
              <Hint>Modifiable. À ajuster selon la grille atelier.</Hint>
            </div>
          </div>
        </section>

        {/* Prix */}
        <section>
          <p className="eyebrow mb-2">Tarif</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Prix tissu (€/m linéaire) *</Label>
              <Input
                type="number"
                step="0.5"
                min={0}
                value={v.prixTissu || ""}
                onChange={(e) => update({ prixTissu: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Forfait confection (€)</Label>
              <Input
                type="number"
                step="1"
                min={0}
                value={v.prixConfection || ""}
                onChange={(e) =>
                  update({ prixConfection: Number(e.target.value) || 0 })
                }
              />
              <Hint>Paramétrable côté Atmosphère.</Hint>
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

      {/* Récap + routing */}
      <div className="space-y-3 h-fit sticky top-2">
        <Card
          className={
            routing.tone === "amber"
              ? "p-4 border-amber/40 bg-amber-soft/30"
              : "p-4 border-blue/40 bg-blue-soft/30"
          }
        >
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-4 w-4 text-ink" strokeWidth={2.4} />
            <p className="eyebrow">Routing fournisseur</p>
          </div>
          <p className="text-[14px] font-semibold text-ink">{routing.label}</p>
          <p className="text-[11.5px] text-muted-2 mt-1">{routing.detail}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="eyebrow">Récapitulatif</p>
            <ColorChip tone="amber" size="sm">
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
                label={`Tissu (${v.metrageEstime.toFixed(1)} m)`}
                value={eurFmt.format(calc.prixTissu)}
              />
              <Row label="Confection" value={eurFmt.format(calc.prixConfection)} />
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

