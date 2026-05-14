"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addBcLineAction, deleteBcLineAction } from "@/app/(platform)/commandes/actions";
import { eur } from "@/lib/formatters";

type Line = {
  id: string;
  position: number;
  ref: string | null;
  label: string;
  qty: number;
  unit_label: string;
  unit_price_ht: number;
  total_ht: number | null;
};

export function BcLinesEditor({
  bcId,
  lines,
  canEdit,
}: {
  bcId: string;
  lines: Line[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    ref: "",
    label: "",
    qty: "1",
    unit_label: "u",
    unit_price_ht: "",
  });

  const submitDraft = () => {
    const qty = Number(draft.qty);
    const unit_price_ht = Number(draft.unit_price_ht);
    if (!draft.label.trim() || !Number.isFinite(qty) || !Number.isFinite(unit_price_ht)) {
      alert("Désignation + quantité + prix unitaire requis");
      return;
    }
    startTransition(async () => {
      const r = await addBcLineAction(bcId, {
        ref: draft.ref.trim() || null,
        label: draft.label.trim(),
        qty,
        unit_label: draft.unit_label.trim() || "u",
        unit_price_ht,
      });
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      setDraft({ ref: "", label: "", qty: "1", unit_label: "u", unit_price_ht: "" });
      setAdding(false);
      router.refresh();
    });
  };

  const remove = (lineId: string) => {
    if (!confirm("Supprimer cette ligne ?")) return;
    startTransition(async () => {
      const r = await deleteBcLineAction(bcId, lineId);
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      router.refresh();
    });
  };

  return (
    <>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-canvas-2/40 border-b border-line">
            <th className="px-5 py-2.5 text-left text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">Réf.</th>
            <th className="px-2 py-2.5 text-left text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">Désignation</th>
            <th className="px-2 py-2.5 text-right text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">Qté</th>
            <th className="px-2 py-2.5 text-right text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">P.U.</th>
            <th className="px-5 py-2.5 text-right text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">Total</th>
            {canEdit && <th className="w-10 px-2 py-2.5" aria-hidden></th>}
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 && !adding && (
            <tr>
              <td colSpan={canEdit ? 6 : 5} className="px-5 py-8 text-center text-muted-2 text-[12.5px]">
                Aucune ligne — ajoute les références à commander au fournisseur.
              </td>
            </tr>
          )}
          {lines.map((l) => (
            <tr key={l.id} className="border-b border-line last:border-0 group">
              <td className="px-5 py-3">{l.ref ? <span className="ref">{l.ref}</span> : <span className="text-muted-2">—</span>}</td>
              <td className="px-2 py-3">
                <p className="text-ink font-medium leading-tight">{l.label}</p>
              </td>
              <td className="px-2 py-3 text-right">
                <span className="text-ink-2 tabular-nums">
                  {l.qty}
                  <span className="text-muted-2 text-[11px] ml-0.5">{l.unit_label}</span>
                </span>
              </td>
              <td className="px-2 py-3 text-right">
                <span className="text-ink-2 tabular-nums">{eur(Number(l.unit_price_ht))}</span>
              </td>
              <td className="px-5 py-3 text-right">
                <span className="font-semibold text-ink tabular-nums">
                  {eur(Number(l.total_ht ?? Number(l.qty) * Number(l.unit_price_ht)))}
                </span>
              </td>
              {canEdit && (
                <td className="px-2 py-3 text-right">
                  <button
                    onClick={() => remove(l.id)}
                    disabled={pending}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-2 hover:text-danger p-1"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </button>
                </td>
              )}
            </tr>
          ))}
          {adding && (
            <tr className="border-b border-line bg-canvas-2/20">
              <td className="px-5 py-2">
                <input
                  value={draft.ref}
                  onChange={(e) => setDraft({ ...draft, ref: e.target.value })}
                  placeholder="Réf."
                  className="w-full text-[12.5px] font-mono bg-white border border-line rounded px-2 py-1 outline-none focus:border-violet"
                />
              </td>
              <td className="px-2 py-2">
                <input
                  value={draft.label}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                  placeholder="Désignation"
                  autoFocus
                  className="w-full text-[12.5px] bg-white border border-line rounded px-2 py-1 outline-none focus:border-violet"
                />
              </td>
              <td className="px-2 py-2">
                <div className="flex items-center gap-1">
                  <input
                    value={draft.qty}
                    onChange={(e) => setDraft({ ...draft, qty: e.target.value })}
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-16 text-right text-[12.5px] tabular-nums bg-white border border-line rounded px-2 py-1 outline-none focus:border-violet"
                  />
                  <input
                    value={draft.unit_label}
                    onChange={(e) => setDraft({ ...draft, unit_label: e.target.value })}
                    className="w-10 text-[11px] bg-white border border-line rounded px-1 py-1 outline-none focus:border-violet"
                  />
                </div>
              </td>
              <td className="px-2 py-2 text-right">
                <input
                  value={draft.unit_price_ht}
                  onChange={(e) => setDraft({ ...draft, unit_price_ht: e.target.value })}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-20 text-right text-[12.5px] tabular-nums bg-white border border-line rounded px-2 py-1 outline-none focus:border-violet"
                />
              </td>
              <td className="px-5 py-2 text-right">
                <span className="text-[12.5px] tabular-nums text-muted-2">
                  {eur(Number(draft.qty || 0) * Number(draft.unit_price_ht || 0))}
                </span>
              </td>
              {canEdit && (
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1 justify-end">
                    <Button variant="primary" size="sm" disabled={pending} onClick={submitDraft}>
                      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : "OK"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setAdding(false)} disabled={pending}>
                      ✕
                    </Button>
                  </div>
                </td>
              )}
            </tr>
          )}
        </tbody>
      </table>
      {canEdit && !adding && (
        <div className="border-t border-line px-5 py-2.5">
          <button
            onClick={() => setAdding(true)}
            className="text-[12px] text-violet hover:underline font-medium inline-flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Ajouter une ligne
          </button>
        </div>
      )}
    </>
  );
}
