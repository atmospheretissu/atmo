"use client";

import { useState, useTransition } from "react";
import { Edit3, Check, X, Loader2 } from "lucide-react";
import { updateDossierItemAction } from "@/app/(platform)/confections/actions";

/**
 * Édition inline d'un item de dossier de confection.
 * Champs modifiables : libellé, ref, quantité, notes.
 */
export function ItemInlineEditor({
  itemId,
  initial,
  onSaved,
}: {
  itemId: string;
  initial: {
    label: string;
    ref: string | null;
    qty: number;
    unit_label: string;
    notes: string | null;
  };
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(initial.label);
  const [ref, setRef] = useState(initial.ref ?? "");
  const [qty, setQty] = useState<number>(Number(initial.qty));
  const [unitLabel, setUnitLabel] = useState(initial.unit_label);
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    setError(null);
    startTransition(async () => {
      const r = await updateDossierItemAction(itemId, {
        label,
        ref,
        qty,
        unit_label: unitLabel,
        notes,
      });
      if (r.ok) {
        setOpen(false);
        onSaved?.();
      } else {
        setError(r.message);
      }
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Modifier l'item"
        className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-2 hover:text-ink hover:bg-canvas-2"
      >
        <Edit3 className="h-3.5 w-3.5" strokeWidth={2.2} />
      </button>
    );
  }

  return (
    <div className="w-full col-span-full bg-canvas-2/40 border border-line rounded-md p-3 mt-2 space-y-2">
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-7">
          <label className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 block mb-0.5">
            Libellé
          </label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={pending}
            className="w-full h-8 rounded-md border border-line-strong bg-white px-2 text-[12.5px] text-ink"
          />
        </div>
        <div className="col-span-3">
          <label className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 block mb-0.5">
            Réf.
          </label>
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            disabled={pending}
            className="w-full h-8 rounded-md border border-line-strong bg-white px-2 text-[12.5px] text-ink font-mono"
          />
        </div>
        <div className="col-span-1">
          <label className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 block mb-0.5">
            Qté
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value) || 0)}
            disabled={pending}
            className="w-full h-8 rounded-md border border-line-strong bg-white px-2 text-[12.5px] text-ink tabular-nums"
          />
        </div>
        <div className="col-span-1">
          <label className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 block mb-0.5">
            Unité
          </label>
          <input
            value={unitLabel}
            onChange={(e) => setUnitLabel(e.target.value)}
            disabled={pending}
            className="w-full h-8 rounded-md border border-line-strong bg-white px-2 text-[12.5px] text-ink"
          />
        </div>
      </div>
      <div>
        <label className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 block mb-0.5">
          Notes atelier (facultatif)
        </label>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={pending}
          placeholder="ex : doublure occultante côté rue"
          className="w-full h-8 rounded-md border border-line-strong bg-white px-2 text-[12.5px] text-ink"
        />
      </div>
      {error && <p className="text-[11.5px] text-pink">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={pending}
          className="inline-flex items-center gap-1 h-7 px-3 rounded-md bg-ink text-white text-[11.5px] font-semibold hover:bg-ink/90 disabled:opacity-40"
        >
          {pending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          Enregistrer
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={pending}
          className="inline-flex items-center gap-1 h-7 px-3 rounded-md border border-line text-ink-2 text-[11.5px] font-medium hover:bg-white"
        >
          <X className="h-3 w-3" /> Annuler
        </button>
      </div>
    </div>
  );
}
