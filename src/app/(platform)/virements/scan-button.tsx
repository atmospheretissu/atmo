"use client";

import { useTransition } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { triggerWireScanNowAction } from "@/app/(platform)/parametres/pennylane-actions";

export function ScanWirementsButton() {
  const [pending, start] = useTransition();
  const onClick = () => {
    start(async () => {
      const r = await triggerWireScanNowAction();
      if (!r.ok) {
        alert(`Échec : ${r.message ?? "erreur inconnue"}`);
      } else {
        alert(
          `Scan terminé — ${r.scanned ?? 0} scannés · ${r.acomptes ?? 0} acomptes · ${r.soldes ?? 0} soldes · ${r.skipped ?? 0} ignorés.`,
        );
        window.location.reload();
      }
    });
  };
  return (
    <Button variant="secondary" size="md" onClick={onClick} disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Scan en cours…
        </>
      ) : (
        <>
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.4} /> Scanner
          maintenant
        </>
      )}
    </Button>
  );
}
