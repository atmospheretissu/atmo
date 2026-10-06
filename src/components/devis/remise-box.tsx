"use client";

import { useState } from "react";
import { Percent, Euro, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { setDevisDiscountAction } from "@/app/(platform)/devis/actions";
import { computeRemise, type DiscountKind } from "@/lib/devis/remise";

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

/**
 * Encadré de remise globale, dans le bloc des totaux du devis.
 *
 * Demandé le 06/10/2026 par Pauline (« ajouter un encadré comme celui
 * existant sur Axonaut ») et par Pierre-Edouard. Deux formes, pourcentage
 * ou montant fixe, et un motif facultatif repris sur le PDF.
 *
 * L'aperçu est calculé localement pour que la saisie réponde tout de suite,
 * mais c'est le serveur qui refait le calcul sur les lignes et fait foi :
 * un sous-total venu du navigateur ne décide pas d'un montant facturé.
 */
export function RemiseBox({
  devisId,
  subtotalHt,
  tvaRate,
  initialKind,
  initialValue,
  initialReason,
  locked,
}: {
  devisId: string;
  subtotalHt: number;
  tvaRate: number;
  initialKind: DiscountKind;
  initialValue: number;
  initialReason: string | null;
  /** Devis déjà réglé : la remise n'est plus modifiable. */
  locked: boolean;
}) {
  const [kind, setKind] = useState<DiscountKind>(initialKind);
  const [value, setValue] = useState<string>(
    initialKind === "none" ? "" : String(initialValue),
  );
  const [reason, setReason] = useState(initialReason ?? "");
  const [open, setOpen] = useState(initialKind !== "none");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numeric = Number(value.replace(",", ".")) || 0;
  const preview = computeRemise(subtotalHt, kind, numeric, tvaRate);

  const save = async (next: {
    kind: DiscountKind;
    value: number;
    reason?: string | null;
  }) => {
    setError(null);
    setPending(true);
    try {
      const r = await setDevisDiscountAction(devisId, next);
      if (!r.ok) setError(r.message);
    } finally {
      setPending(false);
    }
  };

  if (locked && kind === "none") return null;

  if (!open) {
    return (
      <div className="px-5 py-2.5 border-t border-line">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-violet-strong hover:underline"
        >
          <Percent className="h-3.5 w-3.5" strokeWidth={2.3} />
          Appliquer une remise
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 py-3 border-t border-line bg-violet-soft/30">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-strong">
          Remise globale
        </p>
        {!locked && (
          <button
            onClick={async () => {
              setKind("none");
              setValue("");
              setReason("");
              setOpen(false);
              await save({ kind: "none", value: 0 });
            }}
            disabled={pending}
            title="Retirer la remise"
            className="h-6 w-6 rounded-md inline-flex items-center justify-center text-muted-2 hover:text-ink hover:bg-canvas-2 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {locked ? (
        <p className="text-[12px] text-muted">
          Devis réglé — la remise n&apos;est plus modifiable.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-lg border border-line overflow-hidden">
              {(["pct", "amount"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  disabled={pending}
                  className={cn(
                    "h-9 px-3 text-[12.5px] font-medium inline-flex items-center gap-1 transition-colors disabled:opacity-50",
                    kind === k
                      ? "bg-ink text-white"
                      : "bg-surface text-ink-2 hover:bg-canvas-2",
                  )}
                >
                  {k === "pct" ? (
                    <Percent className="h-3.5 w-3.5" strokeWidth={2.4} />
                  ) : (
                    <Euro className="h-3.5 w-3.5" strokeWidth={2.4} />
                  )}
                  {k === "pct" ? "Pourcentage" : "Montant"}
                </button>
              ))}
            </div>

            <input
              type="number"
              min={0}
              max={kind === "pct" ? 100 : undefined}
              step="0.01"
              value={value}
              disabled={pending}
              onChange={(e) => setValue(e.target.value)}
              onBlur={() => {
                if (kind === "none") return;
                void save({ kind, value: numeric, reason });
              }}
              placeholder={kind === "pct" ? "10" : "150,00"}
              aria-label={kind === "pct" ? "Pourcentage de remise" : "Montant de la remise en euros HT"}
              className="h-9 w-28 rounded-lg border border-line bg-surface px-2.5 text-[13px] text-ink tabular-nums outline-none focus:border-violet disabled:opacity-50"
            />
            <span className="text-[12.5px] text-muted">
              {kind === "pct" ? "%" : "€ HT"}
            </span>

            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-2" />}
          </div>

          <input
            value={reason}
            disabled={pending}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => {
              if (kind === "none") return;
              void save({ kind, value: numeric, reason });
            }}
            placeholder="Motif de la remise (facultatif) — repris sur le devis"
            aria-label="Motif de la remise"
            className="mt-2 h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-[12.5px] text-ink outline-none placeholder:text-muted-2 focus:border-violet disabled:opacity-50"
          />
        </>
      )}

      {preview.discountHt > 0 && (
        <p className="mt-2 text-[12px] text-ink-2">
          Remise appliquée :{" "}
          <strong className="tabular-nums">−{eur(preview.discountHt)}</strong>
          {kind === "amount" && preview.effectivePct > 0 && (
            <span className="text-muted-2"> ({preview.effectivePct} %)</span>
          )}
        </p>
      )}

      {error && <p className="mt-2 text-[12px] text-red">{error}</p>}
    </div>
  );
}
