"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
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

type Inputs = {
  designation: string;
  ref: string;
  detail: string;
  qty: number;
  unitLabel: string;
  unitPriceHt: number;
};

const initial: Inputs = {
  designation: "",
  ref: "",
  detail: "",
  qty: 1,
  unitLabel: "u",
  unitPriceHt: 0,
};

/**
 * Article libre — pour tout produit qui ne rentre pas dans les modules existants
 * (review p.6 : "Ajouter un champ libre pour ajouter d'autres produits").
 */
export function ArticleLibreForm({
  onAdd,
  onCancel,
}: {
  onAdd: (articles: BoutiquePieceArticle[]) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState<Inputs>(initial);
  const update = (patch: Partial<Inputs>) => setV((s) => ({ ...s, ...patch }));

  const canAdd = useMemo(
    () => v.designation.trim().length > 0 && v.qty > 0,
    [v],
  );

  const total = useMemo(
    () => Math.round(v.qty * v.unitPriceHt * 100) / 100,
    [v.qty, v.unitPriceHt],
  );

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd([
      {
        type: "autre",
        designation: v.designation.trim(),
        ref: v.ref.trim() || undefined,
        detail: v.detail.trim() || undefined,
        qty: v.qty,
        unitLabel: v.unitLabel,
        unitPriceHt: v.unitPriceHt,
        meta: { typeArticle: "libre" },
      },
    ]);
  };

  return (
    <div className="p-5 grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4 max-h-[70vh] overflow-y-auto">
      <div className="space-y-4">
        <div>
          <Label>Désignation *</Label>
          <Input
            autoFocus
            value={v.designation}
            onChange={(e) => update({ designation: e.target.value })}
            placeholder="ex: Pose étagère sur mesure"
          />
          <Hint>Le nom qui apparaîtra sur le devis client.</Hint>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Référence interne</Label>
            <Input
              value={v.ref}
              onChange={(e) => update({ ref: e.target.value })}
              placeholder="optionnel"
            />
          </div>
          <div>
            <Label>Unité</Label>
            <select
              value={v.unitLabel}
              onChange={(e) => update({ unitLabel: e.target.value })}
              className="flex h-9 w-full rounded-md border border-line-strong bg-white px-3 text-[13.5px] text-ink"
            >
              <option value="u">unité</option>
              <option value="m">mètre</option>
              <option value="m²">m²</option>
              <option value="h">heure</option>
              <option value="forfait">forfait</option>
            </select>
          </div>
        </div>
        <div>
          <Label>Détail (optionnel)</Label>
          <textarea
            value={v.detail}
            onChange={(e) => update({ detail: e.target.value })}
            placeholder="Précisions techniques, dimensions, matériaux…"
            rows={3}
            className="w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13.5px] text-ink resize-none focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/15"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Quantité *</Label>
            <Input
              type="number"
              step="0.01"
              min={0.01}
              value={v.qty || ""}
              onChange={(e) => update({ qty: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label>Prix unitaire HT (€) *</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={v.unitPriceHt || ""}
              onChange={(e) => update({ unitPriceHt: Number(e.target.value) || 0 })}
            />
          </div>
        </div>
      </div>

      {/* Récap */}
      <Card className="p-4 h-fit sticky top-2">
        <div className="flex items-center justify-between mb-3">
          <p className="eyebrow">Récapitulatif</p>
          <ColorChip tone="orange" size="sm">
            <Sparkles className="h-3 w-3" strokeWidth={2.4} />
          </ColorChip>
        </div>
        <div className="space-y-2 text-[12.5px]">
          <Row
            label="Quantité"
            value={`${v.qty || 0} ${v.unitLabel}`}
          />
          <Row label="P.U. HT" value={eurFmt.format(v.unitPriceHt || 0)} />
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
