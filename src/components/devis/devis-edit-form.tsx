"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Save,
  X,
  GripVertical,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { eur } from "@/lib/formatters";
import { updateDevisLinesAction } from "@/app/(platform)/devis/actions";

type LineDraft = {
  label: string;
  detail: string | null;
  ref: string | null;
  qty: number;
  unit_label: string;
  unit_price_ht: number;
};

export function DevisEditForm({
  devisId,
  tvaRate,
  initialLines,
}: {
  devisId: string;
  tvaRate: number;
  initialLines: LineDraft[];
}) {
  const router = useRouter();
  const [lines, setLines] = useState<LineDraft[]>(
    initialLines.length > 0 ? initialLines : [emptyLine()],
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => {
    const totalHt = lines.reduce((s, l) => s + l.qty * l.unit_price_ht, 0);
    const tva = totalHt * (tvaRate / 100);
    const totalTtc = totalHt + tva;
    return {
      totalHt: Math.round(totalHt * 100) / 100,
      tva: Math.round(tva * 100) / 100,
      totalTtc: Math.round(totalTtc * 100) / 100,
    };
  }, [lines, tvaRate]);

  const updateLine = (i: number, patch: Partial<LineDraft>) => {
    setLines((cur) => cur.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const removeLine = (i: number) => {
    if (lines.length === 1) {
      alert("Un devis doit avoir au moins une ligne.");
      return;
    }
    setLines((cur) => cur.filter((_, idx) => idx !== i));
  };

  const addLine = () => {
    setLines((cur) => [...cur, emptyLine()]);
  };

  const moveLine = (from: number, to: number) => {
    if (to < 0 || to >= lines.length) return;
    setLines((cur) => {
      const next = [...cur];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const handleSave = () => {
    setError(null);
    // Validation rapide
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.label.trim()) {
        setError(`Ligne ${i + 1} : libellé requis`);
        return;
      }
      if (l.qty <= 0) {
        setError(`Ligne ${i + 1} : quantité doit être > 0`);
        return;
      }
      if (l.unit_price_ht < 0) {
        setError(`Ligne ${i + 1} : prix HT négatif`);
        return;
      }
    }

    startTransition(async () => {
      const r = await updateDevisLinesAction(
        devisId,
        lines.map((l) => ({
          label: l.label,
          detail: l.detail ?? "",
          ref: l.ref ?? "",
          qty: Number(l.qty),
          unit_label: l.unit_label,
          unit_price_ht: Number(l.unit_price_ht),
        })),
      );
      if (r?.ok) {
        router.push(`/devis/${devisId}`);
        router.refresh();
      } else {
        setError(r?.message ?? "Erreur inconnue");
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
      {/* Colonne principale : lignes */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <div>
            <p className="eyebrow mb-1">Détail</p>
            <h2 className="text-[15px] font-semibold text-ink">
              Lignes — {lines.length} poste{lines.length > 1 ? "s" : ""}
            </h2>
          </div>
          <Button variant="secondary" size="sm" onClick={addLine} disabled={pending}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
            Ajouter une ligne
          </Button>
        </div>

        <ul className="divide-y divide-line">
          {lines.map((line, i) => (
            <li key={i} className="px-5 py-4 hover:bg-canvas-2/30 transition-colors">
              <div className="flex items-start gap-2">
                {/* Reorder */}
                <div className="flex flex-col gap-0.5 pt-1.5 shrink-0">
                  <button
                    onClick={() => moveLine(i, i - 1)}
                    disabled={i === 0 || pending}
                    className="h-4 w-4 inline-flex items-center justify-center text-muted-2 hover:text-ink disabled:opacity-30"
                    title="Monter"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveLine(i, i + 1)}
                    disabled={i === lines.length - 1 || pending}
                    className="h-4 w-4 inline-flex items-center justify-center text-muted-2 hover:text-ink disabled:opacity-30"
                    title="Descendre"
                  >
                    ▼
                  </button>
                </div>

                <div className="flex-1 min-w-0 grid grid-cols-12 gap-2">
                  {/* Référence */}
                  <div className="col-span-12 sm:col-span-3">
                    <label className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 block mb-1">
                      Référence
                    </label>
                    <Input
                      value={line.ref ?? ""}
                      onChange={(e) => updateLine(i, { ref: e.target.value })}
                      placeholder="ex: COLRES010"
                      className="h-9 text-[12.5px] font-mono"
                    />
                  </div>

                  {/* Désignation */}
                  <div className="col-span-12 sm:col-span-9">
                    <label className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 block mb-1">
                      Désignation <span className="text-pink">*</span>
                    </label>
                    <Input
                      value={line.label}
                      onChange={(e) => updateLine(i, { label: e.target.value })}
                      placeholder="ex: Rideau Plis simples — Tissu & Confection"
                      className="h-9 text-[13px]"
                    />
                  </div>

                  {/* Détail */}
                  <div className="col-span-12">
                    <label className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 block mb-1">
                      Détail (optionnel)
                    </label>
                    <Input
                      value={line.detail ?? ""}
                      onChange={(e) => updateLine(i, { detail: e.target.value })}
                      placeholder="ex: Plis simples · 240×250cm · laize 140cm"
                      className="h-9 text-[12px] text-muted-2"
                    />
                  </div>

                  {/* Qté + unité */}
                  <div className="col-span-6 sm:col-span-3">
                    <label className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 block mb-1">
                      Quantité
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.qty}
                      onChange={(e) => updateLine(i, { qty: Number(e.target.value) || 0 })}
                      className="h-9 text-[13px] tabular-nums"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 block mb-1">
                      Unité
                    </label>
                    <select
                      value={line.unit_label}
                      onChange={(e) => updateLine(i, { unit_label: e.target.value })}
                      className="h-9 w-full rounded-md border border-line bg-white px-2.5 text-[13px]"
                    >
                      <option value="u">unité</option>
                      <option value="m">mètre</option>
                      <option value="m2">m²</option>
                      <option value="ml">m. linéaire</option>
                      <option value="f">forfait</option>
                    </select>
                  </div>

                  {/* Prix unitaire HT */}
                  <div className="col-span-6 sm:col-span-3">
                    <label className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 block mb-1">
                      Prix unitaire HT
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.unit_price_ht}
                      onChange={(e) =>
                        updateLine(i, { unit_price_ht: Number(e.target.value) || 0 })
                      }
                      className="h-9 text-[13px] tabular-nums"
                    />
                  </div>

                  {/* Total ligne (calculé) */}
                  <div className="col-span-6 sm:col-span-3 flex flex-col">
                    <label className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 mb-1">
                      Total HT
                    </label>
                    <div className="h-9 rounded-md bg-canvas-2/50 px-2.5 flex items-center justify-end text-[14px] font-semibold tabular-nums text-ink-2">
                      {eur(line.qty * line.unit_price_ht)}
                    </div>
                  </div>

                  {/* Bouton supprimer */}
                  <div className="col-span-12 sm:col-span-1 flex sm:items-end justify-end">
                    <button
                      onClick={() => removeLine(i)}
                      disabled={pending}
                      className="h-9 w-9 rounded-md text-muted-2 hover:text-pink hover:bg-pink-soft/40 inline-flex items-center justify-center transition-colors disabled:opacity-30"
                      title="Supprimer la ligne"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2.2} />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="px-5 py-3 bg-canvas-2/30 border-t border-line flex items-center justify-between">
          <Button variant="secondary" size="sm" onClick={addLine} disabled={pending}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
            Nouvelle ligne
          </Button>
          <p className="text-[11.5px] text-muted-2 italic">
            Les totaux se recalculent automatiquement à droite →
          </p>
        </div>
      </Card>

      {/* Sidebar : totaux + actions */}
      <div className="space-y-4 sticky top-[80px]">
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-line">
            <p className="eyebrow mb-1">Récap</p>
            <h3 className="text-[15px] font-semibold text-ink">Totaux</h3>
          </div>
          <div className="px-5 py-4 space-y-2.5 text-[13px]">
            <div className="flex justify-between">
              <span className="text-muted">Sous-total HT</span>
              <span className="font-medium text-ink-2 tabular-nums">{eur(totals.totalHt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">TVA {tvaRate}%</span>
              <span className="font-medium text-ink-2 tabular-nums">{eur(totals.tva)}</span>
            </div>
            <div className="border-t border-line pt-2.5 flex justify-between items-baseline">
              <span className="text-[14px] font-semibold text-ink">Total TTC</span>
              <span className="text-[20px] font-bold text-ink tabular-nums">
                {eur(totals.totalTtc)}
              </span>
            </div>
          </div>
        </Card>

        {error && (
          <Card className="p-3 bg-pink-soft border-pink/30">
            <p className="text-[12.5px] text-pink font-medium">{error}</p>
          </Card>
        )}

        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            size="lg"
            onClick={handleSave}
            disabled={pending}
            className="w-full"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />
                Enregistrement…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" strokeWidth={2.4} />
                Enregistrer les modifications
              </>
            )}
          </Button>
          <Link href={`/devis/${devisId}`}>
            <Button variant="secondary" size="md" className="w-full" disabled={pending}>
              <X className="h-3.5 w-3.5" strokeWidth={2.4} />
              Annuler
            </Button>
          </Link>
        </div>

        <Link
          href={`/devis/${devisId}`}
          className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-ink-2 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
          Retour à la fiche devis
        </Link>
      </div>
    </div>
  );
}

function emptyLine(): LineDraft {
  return {
    label: "",
    detail: null,
    ref: null,
    qty: 1,
    unit_label: "u",
    unit_price_ht: 0,
  };
}
