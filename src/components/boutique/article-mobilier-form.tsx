"use client";

import { useMemo, useState } from "react";
import { Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Hint } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ColorChip } from "@/components/ui/status-pill";
import type { BoutiquePieceArticle } from "@/app/(platform)/boutique/actions";

const eurFmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

type SousType = "tapis" | "canape" | "banquette";

const META: Record<
  SousType,
  { label: string; simulatorUrl: string | null; placeholder: string }
> = {
  tapis: {
    label: "Tapis sur mesure",
    simulatorUrl: null, // catalogue interne à venir
    placeholder: "Tapis Velours 200×300 — bordure naturelle",
  },
  canape: {
    label: "Canapé sur mesure",
    simulatorUrl: null, // simulateur Louis Hoste à venir
    placeholder: "Canapé 3 places · L 220 cm · velours côtelé",
  },
  banquette: {
    label: "Banquette sur mesure",
    simulatorUrl: "https://banquette.lovable.app/",
    placeholder: "Banquette 180×60 · coussin assise + dossier",
  },
};

type Inputs = {
  sousType: SousType;
  designation: string;
  largeur: number;
  hauteur: number;
  profondeur: number;
  prixHt: number;
  // Champ de saisie brut — soit HT (prixHt = prixSaisi), soit TTC
  // (prixHt = prixSaisi / 1.20). TVA fixe 20% pour ce type d'article.
  prixSaisi: number;
  prixMode: "ht" | "ttc";
  qty: number;
  detail: string;
};

const initial: Inputs = {
  sousType: "banquette",
  designation: "",
  largeur: 180,
  hauteur: 45,
  profondeur: 60,
  prixHt: 0,
  prixSaisi: 0,
  prixMode: "ht",
  qty: 1,
  detail: "",
};

/**
 * Mobilier sur mesure (review p.6-7) — Tapis / Canapé / Banquette.
 *
 * Pour la banquette, le simulateur Louis Hoste est externe :
 * https://banquette.lovable.app/. L'utilisateur configure son article là-bas
 * puis recopie les dimensions + prix ici.
 *
 * Pour le tapis : catalogue interne à venir (upload de références).
 * Pour le canapé : simulateur à venir (nouveaux tarifs Louis Hoste).
 */
export function ArticleMobilierForm({
  onAdd,
  onCancel,
}: {
  onAdd: (articles: BoutiquePieceArticle[]) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState<Inputs>(initial);
  const update = (patch: Partial<Inputs>) => setV((s) => ({ ...s, ...patch }));

  const m = META[v.sousType];

  const canAdd = useMemo(
    () => v.designation.trim().length > 0 && v.prixHt > 0 && v.qty > 0,
    [v],
  );

  const total = useMemo(
    () => Math.round(v.qty * v.prixHt * 100) / 100,
    [v.qty, v.prixHt],
  );

  const handleAdd = () => {
    if (!canAdd) return;
    const dimsParts: string[] = [];
    if (v.largeur) dimsParts.push(`L ${v.largeur}cm`);
    if (v.hauteur) dimsParts.push(`H ${v.hauteur}cm`);
    if (v.profondeur) dimsParts.push(`P ${v.profondeur}cm`);
    const dims = dimsParts.join(" · ");
    onAdd([
      {
        type: "autre",
        designation: v.designation.trim(),
        ref: undefined,
        detail: [dims, v.detail.trim()].filter(Boolean).join(" · ") || undefined,
        qty: v.qty,
        unitLabel: "u",
        unitPriceHt: v.prixHt,
        meta: {
          typeArticle: "mobilier_sur_mesure",
          sousType: v.sousType,
          dimensions: { largeur: v.largeur, hauteur: v.hauteur, profondeur: v.profondeur },
          simulatorUrl: m.simulatorUrl,
        },
      },
    ]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 p-5 max-h-[75vh] overflow-y-auto">
      <div className="space-y-5">
        {/* Sous-type */}
        <section>
          <p className="eyebrow mb-2">Type de mobilier</p>
          <div className="grid grid-cols-3 gap-1 rounded-md border border-line p-0.5 bg-white h-10">
            {(Object.keys(META) as SousType[]).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => update({ sousType: st })}
                className={
                  "text-[12.5px] font-semibold rounded-[5px] transition-colors capitalize " +
                  (v.sousType === st
                    ? "bg-ink text-white"
                    : "text-muted hover:text-ink")
                }
              >
                {st}
              </button>
            ))}
          </div>
        </section>

        {/* Lien simulateur externe */}
        {m.simulatorUrl ? (
          <Card className="p-4 bg-violet-soft/30 border-violet/30">
            <div className="flex items-start gap-3">
              <ColorChip tone="violet" size="md">
                <ExternalLink className="h-4 w-4" strokeWidth={2.2} />
              </ColorChip>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-ink mb-1">
                  Simulateur {v.sousType}
                </p>
                <p className="text-[11.5px] text-muted mb-2 leading-snug">
                  Configure l'article sur le simulateur externe, puis recopie
                  dimensions + prix ici.
                </p>
                <a
                  href={m.simulatorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] text-violet hover:underline font-medium"
                >
                  Ouvrir le simulateur <ExternalLink className="h-3 w-3" strokeWidth={2.4} />
                </a>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-4 bg-amber-soft/30 border-amber/30">
            <p className="text-[12px] text-amber-strong leading-snug">
              <strong className="font-semibold">
                {v.sousType === "tapis"
                  ? "Catalogue tapis"
                  : "Simulateur canapé"}{" "}
                à venir.
              </strong>{" "}
              Pour l'instant : saisis manuellement la désignation et le prix.
            </p>
          </Card>
        )}

        {/* Désignation + détail */}
        <section className="space-y-3">
          <div>
            <Label>Désignation *</Label>
            <Input
              value={v.designation}
              onChange={(e) => update({ designation: e.target.value })}
              placeholder={m.placeholder}
            />
          </div>
          <div>
            <Label>Détail (optionnel)</Label>
            <textarea
              value={v.detail}
              onChange={(e) => update({ detail: e.target.value })}
              placeholder="Tissu, coloris, finitions, références simulateur…"
              rows={3}
              className="w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13.5px] text-ink resize-none focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/15"
            />
          </div>
        </section>

        {/* Dimensions */}
        <section>
          <p className="eyebrow mb-2">Dimensions (cm)</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Largeur</Label>
              <Input
                type="number"
                min={0}
                value={v.largeur || ""}
                onChange={(e) => update({ largeur: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Hauteur</Label>
              <Input
                type="number"
                min={0}
                value={v.hauteur || ""}
                onChange={(e) => update({ hauteur: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Profondeur</Label>
              <Input
                type="number"
                min={0}
                value={v.profondeur || ""}
                onChange={(e) => update({ profondeur: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
        </section>

        {/* Prix & qté */}
        <section>
          <p className="eyebrow mb-2">Prix</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantité *</Label>
              <Input
                type="number"
                min={1}
                value={v.qty || ""}
                onChange={(e) => update({ qty: Number(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label>
                Prix unitaire {v.prixMode === "ttc" ? "TTC" : "HT"} (€) *
              </Label>
              <div className="flex items-stretch gap-1.5">
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={v.prixSaisi || ""}
                  onChange={(e) => {
                    const n = Number(e.target.value) || 0;
                    update({
                      prixSaisi: n,
                      prixHt:
                        v.prixMode === "ttc" ? Math.round((n / 1.2) * 100) / 100 : n,
                    });
                  }}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    const nextMode = v.prixMode === "ttc" ? "ht" : "ttc";
                    // Bascule le champ saisi vers l'autre mode sans changer prixHt
                    const nextSaisi =
                      nextMode === "ttc"
                        ? Math.round(v.prixHt * 1.2 * 100) / 100
                        : v.prixHt;
                    update({ prixMode: nextMode, prixSaisi: nextSaisi });
                  }}
                  className="h-9 px-2.5 rounded-md border border-line-strong bg-white text-[11.5px] font-semibold text-ink-2 hover:border-violet hover:text-violet transition-colors"
                  title="Basculer HT / TTC"
                >
                  ↔ {v.prixMode === "ttc" ? "HT" : "TTC"}
                </button>
              </div>
              <Hint>
                {v.prixMode === "ttc"
                  ? `Équivalent HT : ${v.prixHt.toFixed(2)} € (TVA 20% déduite auto).`
                  : "Prix saisi HT. Bascule pour saisir en TTC (calcul HT auto)."}
              </Hint>
            </div>
          </div>
        </section>
      </div>

      {/* Récap */}
      <Card className="p-4 h-fit sticky top-2">
        <div className="flex items-center justify-between mb-3">
          <p className="eyebrow">Récapitulatif</p>
          <ColorChip tone="amber" size="sm">
            <Sparkles className="h-3 w-3" strokeWidth={2.4} />
          </ColorChip>
        </div>
        <div className="space-y-2 text-[12.5px]">
          <Row label="Type" value={m.label} />
          <Row label="Quantité" value={`${v.qty || 0}`} />
          <Row label="P.U. HT" value={eurFmt.format(v.prixHt || 0)} />
          <div className="pt-2 border-t border-line flex items-center justify-between">
            <span className="text-[13px] font-semibold text-ink">Total HT</span>
            <span className="text-[20px] font-semibold tabular-nums text-ink leading-none">
              {eurFmt.format(total)}
            </span>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Button
            variant="primary"
            size="md"
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
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
