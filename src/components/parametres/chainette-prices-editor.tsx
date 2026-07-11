"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Plus, Trash2, Check, X, Palette } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  listChainettePricesAction,
  updateChainettePriceAction,
  createChainetteColorAction,
  deleteChainetteColorAction,
} from "@/app/(platform)/parametres/boutique-chainette-actions";
import type { ChainettePrice } from "@/lib/db/boutique-chainette";

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);

export function ChainettePricesEditor() {
  const [items, setItems] = useState<ChainettePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newPrice, setNewPrice] = useState(0);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await listChainettePricesAction();
      setItems(r);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const savePatch = (
    id: string,
    patch: Parameters<typeof updateChainettePriceAction>[1],
  ) => {
    setError(null);
    startTransition(async () => {
      const r = await updateChainettePriceAction(id, patch);
      if (!r.ok) setError(r.message ?? "Erreur");
      else refresh();
    });
  };

  const submitNew = () => {
    if (!newCode.trim() || !newLabel.trim()) {
      setError("Code et libellé requis.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await createChainetteColorAction({
        code: newCode,
        label: newLabel,
        price: newPrice,
      });
      if (!r.ok) {
        setError(r.message ?? "Erreur");
      } else {
        setNewCode("");
        setNewLabel("");
        setNewPrice(0);
        setAdding(false);
        refresh();
      }
    });
  };

  const remove = (item: ChainettePrice) => {
    if (!confirm(`Supprimer la couleur "${item.label}" ?`)) return;
    setError(null);
    startTransition(async () => {
      const r = await deleteChainetteColorAction(item.id);
      if (!r.ok) setError(r.message ?? "Erreur");
      else refresh();
    });
  };

  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4 border-b border-line flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-violet" strokeWidth={2.2} />
          <div>
            <h3 className="text-[15px] font-semibold text-ink">
              Tarifs couleurs de chaînette (store bateau)
            </h3>
            <p className="text-[12px] text-muted mt-0.5">
              Suppléments appliqués selon la couleur choisie dans le simulateur.
            </p>
          </div>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12.5px] font-semibold border border-line bg-white hover:border-line-strong text-ink-2"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
            Ajouter une couleur
          </button>
        )}
      </div>

      {error && (
        <div className="px-5 pt-3 text-[12.5px] text-pink">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Chargement…
        </div>
      ) : (
        <div className="divide-y divide-line">
          {adding && (
            <div className="px-5 py-3 bg-canvas-2/40 grid grid-cols-12 gap-2 items-end">
              <div className="col-span-3">
                <label className="block text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 mb-1">
                  Code
                </label>
                <input
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="ex: chrome"
                  disabled={pending}
                  className="form-input"
                />
              </div>
              <div className="col-span-4">
                <label className="block text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 mb-1">
                  Libellé
                </label>
                <input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="ex: Chrome brossé"
                  disabled={pending}
                  className="form-input"
                />
              </div>
              <div className="col-span-3">
                <label className="block text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 mb-1">
                  Prix (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  disabled={pending}
                  className="form-input"
                />
              </div>
              <div className="col-span-2 flex items-center gap-1 justify-end">
                <button
                  onClick={submitNew}
                  disabled={pending}
                  className="h-8 px-3 rounded-md text-[12px] font-semibold bg-ink text-white hover:bg-ink/90 disabled:opacity-40 inline-flex items-center gap-1"
                >
                  {pending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  Ajouter
                </button>
                <button
                  onClick={() => setAdding(false)}
                  disabled={pending}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-2 hover:text-ink hover:bg-canvas-2"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {items.length === 0 && !adding && (
            <div className="px-5 py-8 text-center text-[13px] text-muted">
              Aucune couleur configurée. Clique sur « Ajouter une couleur ».
            </div>
          )}

          {items.map((item) => (
            <ChainetteRow
              key={item.id}
              item={item}
              pending={pending}
              onSave={(patch) => savePatch(item.id, patch)}
              onDelete={() => remove(item)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function ChainetteRow({
  item,
  pending,
  onSave,
  onDelete,
}: {
  item: ChainettePrice;
  pending: boolean;
  onSave: (patch: {
    label?: string;
    price?: number;
    active?: boolean;
  }) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(item.label);
  const [price, setPrice] = useState<number>(item.price);
  const dirty = label !== item.label || price !== item.price;

  return (
    <div className="px-5 py-3 grid grid-cols-12 gap-3 items-center">
      <div className="col-span-2 text-[11.5px] font-mono text-muted-2 uppercase tracking-wide">
        {item.code}
      </div>
      <div className="col-span-4">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={pending}
          className="form-input"
        />
      </div>
      <div className="col-span-3">
        <div className="relative">
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            disabled={pending}
            className="form-input pr-8"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11.5px] text-muted-2 pointer-events-none">
            €
          </span>
        </div>
      </div>
      <div className="col-span-2">
        <button
          onClick={() => onSave({ active: !item.active })}
          disabled={pending}
          className={`h-8 px-2.5 rounded-md text-[11.5px] font-semibold ${
            item.active
              ? "bg-emerald-soft/40 text-emerald-strong border border-emerald/20"
              : "bg-canvas-2 text-muted-2 border border-line"
          }`}
        >
          {item.active ? "Visible" : "Masqué"}
        </button>
      </div>
      <div className="col-span-1 flex items-center gap-1 justify-end">
        {dirty ? (
          <button
            onClick={() => onSave({ label, price })}
            disabled={pending}
            className="h-8 px-2.5 rounded-md text-[11.5px] font-semibold bg-ink text-white hover:bg-ink/90"
          >
            {pending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
          </button>
        ) : (
          <button
            onClick={onDelete}
            disabled={pending}
            title="Supprimer"
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-2 hover:text-pink hover:bg-pink-soft/40"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
          </button>
        )}
      </div>
      <div className="col-span-12 text-[11px] text-muted-2 -mt-1">
        Actuel : <strong className="text-ink-2">{eur(item.price)}</strong>
      </div>
    </div>
  );
}
