"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPoseForDossierAction } from "@/app/(platform)/poses/actions";

export function PlanPoseButton({ dossierId }: { dossierId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handle = () => {
    if (!confirm("Créer une intervention de pose pour ce dossier ?")) return;
    startTransition(async () => {
      const r = await createPoseForDossierAction(dossierId);
      if (r.ok && r.poseId) {
        router.push(`/poses/${r.poseId}`);
      } else if (!r.ok) {
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
          <Calendar className="h-3.5 w-3.5" strokeWidth={2.4} /> Planifier la pose
        </>
      )}
    </Button>
  );
}
