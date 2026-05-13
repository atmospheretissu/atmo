"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Hint, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ColorChip } from "@/components/ui/status-pill";
import { ShoppingBag, AlertCircle, Check } from "lucide-react";
import type { BoutiquePieceArticle } from "@/app/(platform)/boutique/actions";
import { RIDEAUX_EN_SERIE, type RideauSerie } from "@/lib/boutique/data";

const eurFmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

/**
 * Picker cascading depuis les 56 modèles de rideaux en série :
 *   Type → Finition → Doublage → Tissu → (Largeur, Hauteur) → Quantité
 */
export function RideauSerieForm({
  onAdd,
  onCancel,
}: {
  onAdd: (articles: BoutiquePieceArticle[]) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<string>("");
  const [finition, setFinition] = useState<string>("");
  const [doublage, setDoublage] = useState<string>("");
  const [tissu, setTissu] = useState<string>("");
  const [selectedDim, setSelectedDim] = useState<{ largeur: number; hauteur: number } | null>(null);
  const [qty, setQty] = useState(1);

  const types = useMemo(() => Array.from(new Set(RIDEAUX_EN_SERIE.map((r) => r.type))).sort(), []);
  const finitions = useMemo(
    () =>
      type
        ? Array.from(new Set(RIDEAUX_EN_SERIE.filter((r) => r.type === type).map((r) => r.finition))).sort()
        : [],
    [type]
  );
  const doublages = useMemo(
    () =>
      type && finition
        ? Array.from(
            new Set(
              RIDEAUX_EN_SERIE.filter((r) => r.type === type && r.finition === finition).map(
                (r) => r.doublage
              )
            )
          ).sort()
        : [],
    [type, finition]
  );
  const tissus = useMemo(
    () =>
      type && finition && doublage
        ? Array.from(
            new Set(
              RIDEAUX_EN_SERIE.filter(
                (r) => r.type === type && r.finition === finition && r.doublage === doublage
              ).map((r) => r.tissu)
            )
          ).sort()
        : [],
    [type, finition, doublage]
  );
  const dimensions = useMemo<RideauSerie[]>(
    () =>
      type && finition && doublage && tissu
        ? RIDEAUX_EN_SERIE.filter(
            (r) =>
              r.type === type &&
              r.finition === finition &&
              r.doublage === doublage &&
              r.tissu === tissu
          ).sort((a, b) => a.largeur - b.largeur || a.hauteur - b.hauteur)
        : [],
    [type, finition, doublage, tissu]
  );

  const selectedRow = useMemo(
    () =>
      selectedDim
        ? dimensions.find(
            (d) => d.largeur === selectedDim.largeur && d.hauteur === selectedDim.hauteur
          )
        : null,
    [selectedDim, dimensions]
  );

  // Reset levels when parent changes
  const onChangeType = (t: string) => {
    setType(t);
    setFinition("");
    setDoublage("");
    setTissu("");
    setSelectedDim(null);
  };
  const onChangeFinition = (f: string) => {
    setFinition(f);
    setDoublage("");
    setTissu("");
    setSelectedDim(null);
  };
  const onChangeDoublage = (d: string) => {
    setDoublage(d);
    setTissu("");
    setSelectedDim(null);
  };
  const onChangeTissu = (t: string) => {
    setTissu(t);
    setSelectedDim(null);
  };

  const validationError = !selectedRow
    ? "Sélectionne un modèle complet (type, finition, doublage, tissu, dimensions)"
    : qty <= 0
    ? "Quantité invalide"
    : null;

  const totalLigne = selectedRow ? selectedRow.prix * qty : 0;

  const handleAdd = () => {
    if (!selectedRow) return;
    onAdd([
      {
        type: "rideau_serie",
        designation: `${selectedRow.type} ${selectedRow.finition} ${selectedRow.doublage}`,
        ref: `RID-SERIE-${selectedRow.tissu.replace(/\s+/g, "-")}-${selectedRow.largeur}x${selectedRow.hauteur}`,
        detail: `${selectedRow.tissu} · ${selectedRow.largeur}×${selectedRow.hauteur} cm`,
        qty,
        unitLabel: "u",
        unitPriceHt: selectedRow.prix,
        meta: {
          typeArticle: "rideau_serie",
          type: selectedRow.type,
          finition: selectedRow.finition,
          doublage: selectedRow.doublage,
          tissu: selectedRow.tissu,
          largeur: selectedRow.largeur,
          hauteur: selectedRow.hauteur,
          prixUnitaire: selectedRow.prix,
        },
      },
    ]);
  };

  return (
    <div className="flex flex-col" style={{ maxHeight: "80vh" }}>
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <Card className="p-3 bg-canvas-2/40 border-pink/30">
          <div className="flex items-start gap-2.5">
            <ColorChip tone="pink" size="sm">
              <ShoppingBag className="h-3.5 w-3.5" strokeWidth={2.4} />
            </ColorChip>
            <div>
              <p className="text-[12.5px] font-semibold text-ink">Rideaux en série</p>
              <p className="text-[11.5px] text-muted">
                {RIDEAUX_EN_SERIE.length} modèles prêts à poser — sélectionne en cascade pour
                affiner.
              </p>
            </div>
          </div>
        </Card>

        {/* Niveau 1 — Type */}
        <Step
          number={1}
          label="Type"
          options={types}
          value={type}
          onChange={onChangeType}
        />

        {/* Niveau 2 — Finition */}
        {type && (
          <Step
            number={2}
            label="Finition"
            options={finitions}
            value={finition}
            onChange={onChangeFinition}
          />
        )}

        {/* Niveau 3 — Doublage */}
        {finition && (
          <Step
            number={3}
            label="Doublage"
            options={doublages}
            value={doublage}
            onChange={onChangeDoublage}
          />
        )}

        {/* Niveau 4 — Tissu */}
        {doublage && (
          <Step
            number={4}
            label="Tissu"
            options={tissus}
            value={tissu}
            onChange={onChangeTissu}
          />
        )}

        {/* Niveau 5 — Dimensions */}
        {tissu && dimensions.length > 0 && (
          <section>
            <Label>5 · Dimensions disponibles</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {dimensions.map((d) => {
                const isSelected =
                  selectedDim?.largeur === d.largeur && selectedDim?.hauteur === d.hauteur;
                return (
                  <button
                    key={`${d.largeur}-${d.hauteur}`}
                    type="button"
                    onClick={() => setSelectedDim({ largeur: d.largeur, hauteur: d.hauteur })}
                    className={
                      "p-3 rounded-lg border text-left transition-all " +
                      (isSelected
                        ? "border-ink bg-canvas-2/60 shadow-sm"
                        : "border-line hover:border-line-strong bg-white")
                    }
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[13px] font-semibold text-ink">
                        {d.largeur}×{d.hauteur} cm
                      </p>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-ink" strokeWidth={2.4} />
                      )}
                    </div>
                    <p className="text-[13.5px] font-mono tabular-nums text-violet-strong font-semibold">
                      {eurFmt.format(d.prix)}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Niveau 6 — Quantité */}
        {selectedDim && (
          <section>
            <Label>6 · Quantité</Label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Input
                  type="number"
                  min={1}
                  value={qty || ""}
                  onChange={(e) => setQty(Number(e.target.value) || 1)}
                />
              </div>
              <div className="col-span-2 flex items-center px-3 rounded-md bg-canvas-2/40 border border-line">
                <span className="text-[12.5px] text-muted">
                  {qty} × {eurFmt.format(selectedRow?.prix ?? 0)} ={" "}
                  <span className="font-semibold text-ink tabular-nums">
                    {eurFmt.format(totalLigne)}
                  </span>
                </span>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Action footer */}
      <div className="shrink-0 border-t border-line bg-white px-5 py-3 flex items-center justify-between gap-3">
        {validationError ? (
          <div className="flex items-center gap-1.5 text-[12px] text-amber">
            <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.4} />
            {validationError}
          </div>
        ) : (
          <p className="text-[12px] text-muted">
            Total ligne ·{" "}
            <span className="text-ink font-semibold tabular-nums">
              {eurFmt.format(totalLigne)}
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
            disabled={!selectedRow || qty <= 0}
          >
            Ajouter à la pièce
          </Button>
        </div>
      </div>
    </div>
  );
}

function Step({
  number,
  label,
  options,
  value,
  onChange,
}: {
  number: number;
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <section>
      <Label>
        {number} · {label}
      </Label>
      <div className="flex items-center gap-1.5 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={
              "h-8 px-3 rounded-full text-[12.5px] font-medium transition-all " +
              (value === opt
                ? "bg-ink text-white"
                : "bg-white text-muted hover:text-ink border border-line")
            }
          >
            {opt}
          </button>
        ))}
      </div>
    </section>
  );
}
