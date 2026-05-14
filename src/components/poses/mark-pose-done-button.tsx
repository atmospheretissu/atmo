"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markPoseDoneAction } from "@/app/(platform)/poses/actions";

export function MarkPoseDoneButton({ poseId }: { poseId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handle = () => {
    if (!confirm("Marquer la pose comme effectuée ? Le dossier passera en statut 'Posé'.")) return;
    startTransition(async () => {
      const r = await markPoseDoneAction(poseId);
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <Button variant="primary" size="sm" onClick={handle} disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> …
        </>
      ) : (
        <>
          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.4} /> Marquer posé
        </>
      )}
    </Button>
  );
}
