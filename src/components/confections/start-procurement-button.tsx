"use client";

import { useTransition, useState } from "react";
import { Truck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startProcurementAction } from "@/app/(platform)/confections/actions";

export function StartProcurementButton({ dossierId }: { dossierId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    if (
      !confirm(
        "Démarrer l'approvisionnement ?\n\nLe dossier passe en \"Attente matière\" — les bons de commande fournisseurs sont prêts à être envoyés.",
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const r = await startProcurementAction(dossierId);
      if (!r.ok) setError(r.message);
    });
  };

  return (
    <>
      <Button variant="accent" size="sm" onClick={run} disabled={pending}>
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
        ) : (
          <Truck className="h-3.5 w-3.5" strokeWidth={2.4} />
        )}
        Lancer l&apos;approvisionnement
      </Button>
      {error && <span className="text-[11px] text-pink ml-1">{error}</span>}
    </>
  );
}
