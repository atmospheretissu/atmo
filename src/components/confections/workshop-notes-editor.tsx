"use client";

import { useState, useTransition } from "react";
import { Edit3, Check, X, Loader2 } from "lucide-react";
import { updateDossierAction } from "@/app/(platform)/confections/actions";

/**
 * Bloc éditable « Notes atelier » sur la fiche confection.
 * Reste modifiable même après le paiement de l'acompte (spec 23/07/2026).
 */
export function WorkshopNotesEditor({
  dossierId,
  initialNotes,
}: {
  dossierId: string;
  initialNotes: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialNotes ?? "");
  const [savedValue, setSavedValue] = useState(initialNotes ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    setError(null);
    startTransition(async () => {
      const r = await updateDossierAction(dossierId, {
        workshop_notes: value,
      });
      if (r.ok) {
        setSavedValue(value);
        setEditing(false);
      } else {
        setError(r.message);
      }
    });
  };

  const cancel = () => {
    setValue(savedValue);
    setEditing(false);
    setError(null);
  };

  if (!editing) {
    return (
      <div className="group">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[11.5px] font-semibold tracking-wider uppercase text-muted-2">
            Notes atelier
          </p>
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 text-[11.5px] text-muted hover:text-ink opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Edit3 className="h-3 w-3" strokeWidth={2.4} /> Modifier
          </button>
        </div>
        {savedValue ? (
          <p className="text-[13px] text-ink-2 whitespace-pre-wrap leading-relaxed">
            {savedValue}
          </p>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-[13px] text-muted italic hover:text-ink-2 hover:underline"
          >
            + Ajouter une note pour l&apos;atelier…
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="text-[11.5px] font-semibold tracking-wider uppercase text-muted-2 mb-1.5">
        Notes atelier
      </p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={pending}
        rows={4}
        placeholder="Précisions confection, appel client, ajustement post-signature…"
        className="w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] text-ink resize-y focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/15"
        autoFocus
      />
      {error && (
        <p className="mt-1 text-[12px] text-pink">{error}</p>
      )}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={save}
          disabled={pending}
          className="inline-flex items-center gap-1 h-8 px-3 rounded-md bg-ink text-white text-[12px] font-semibold hover:bg-ink/90 disabled:opacity-40"
        >
          {pending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          Enregistrer
        </button>
        <button
          onClick={cancel}
          disabled={pending}
          className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-line text-ink-2 text-[12px] font-medium hover:bg-canvas-2"
        >
          <X className="h-3 w-3" /> Annuler
        </button>
      </div>
    </div>
  );
}
