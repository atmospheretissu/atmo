"use client";

import { useState, useTransition } from "react";
import {
  Calculator,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  verifyDevisOnPennylaneAction,
  type VerifyResult,
} from "@/app/(platform)/devis/pennylane-actions";

/**
 * Bouton « Vérifier chez Pennylane » — appelle l'API en direct depuis
 * la fiche devis, affiche le résultat dans une popover.
 */
export function PennylaneVerifyButton({ devisId }: { devisId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [open, setOpen] = useState(false);

  const verify = () => {
    setOpen(true);
    setResult(null);
    startTransition(async () => {
      const r = await verifyDevisOnPennylaneAction(devisId);
      setResult(r);
    });
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={verify} disabled={pending}>
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.2} />
        ) : (
          <Calculator className="h-3.5 w-3.5" strokeWidth={2.2} />
        )}
        Vérifier chez Pennylane
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-[15px] font-semibold text-ink">
                Vérification Pennylane
              </h2>
              <button
                onClick={() => setOpen(false)}
                disabled={pending}
                className="h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-2 hover:text-ink hover:bg-canvas-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {pending && (
              <div className="py-6 text-center text-[13px] text-muted inline-flex items-center gap-2 w-full justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Vérification…
              </div>
            )}

            {result && !pending && "disabled" in result && result.disabled && (
              <div className="rounded-md bg-amber-soft/40 border border-amber/30 p-3 text-[12.5px] text-ink-2">
                <AlertCircle className="h-4 w-4 text-amber inline-block mr-1.5 -mt-0.5" />
                {result.message}
              </div>
            )}

            {result && !pending && !result.ok && (
              <div className="rounded-md bg-pink-soft/40 border border-pink/30 p-3 text-[12.5px] text-pink">
                {result.message}
              </div>
            )}

            {result &&
              !pending &&
              result.ok &&
              !("disabled" in result && result.disabled) &&
              !result.matched && (
                <div className="rounded-md bg-canvas-2 border border-line p-3 text-[12.5px] text-ink-2">
                  Aucune facture Pennylane trouvée pour ce devis. Elle sera
                  créée automatiquement dès qu&apos;un paiement sera encaissé
                  (si le push est activé).
                </div>
              )}

            {result &&
              !pending &&
              result.ok &&
              !("disabled" in result && result.disabled) &&
              result.matched && (
                <div className="space-y-3">
                  <div className="rounded-md bg-emerald-soft/40 border border-emerald/30 p-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-strong shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-emerald-strong">
                          Facture trouvée{" "}
                          {result.invoiceNumber && (
                            <>
                              (
                              <span className="font-mono">
                                {result.invoiceNumber}
                              </span>
                              )
                            </>
                          )}
                        </p>
                        <p className="text-[11.5px] text-ink-2 mt-1">
                          Statut Pennylane :{" "}
                          <strong>{result.pennylaneStatus ?? "?"}</strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  {result.payments && result.payments.length > 0 ? (
                    <div>
                      <p className="text-[10.5px] uppercase tracking-widest font-semibold text-muted-2 mb-1.5">
                        Paiements ({result.payments.length})
                      </p>
                      <ul className="border border-line rounded-md divide-y divide-line">
                        {result.payments.map((p) => (
                          <li
                            key={p.id}
                            className="px-3 py-2 flex items-center justify-between text-[12px]"
                          >
                            <span className="text-ink-2">
                              {new Intl.DateTimeFormat("fr-FR", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }).format(new Date(p.date))}
                              {p.method && (
                                <span className="text-muted-2 ml-2">
                                  · {p.method}
                                </span>
                              )}
                            </span>
                            <span className="font-semibold text-ink tabular-nums">
                              {p.amount} €
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-[12px] text-muted italic">
                      La facture existe mais n&apos;a pas encore de paiement
                      rapproché côté Pennylane.
                    </p>
                  )}
                </div>
              )}
          </div>
        </div>
      )}
    </>
  );
}
