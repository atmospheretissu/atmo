"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markAcompteRecuAction } from "@/app/(platform)/devis/actions";

export function MarkAcompteButton({
  devisId,
  variant = "outline",
}: {
  devisId: string;
  variant?: "outline" | "primary";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handle = () => {
    if (
      !confirm(
        "Marquer l'acompte comme reçu ? Cela crée automatiquement le dossier de confection."
      )
    )
      return;
    startTransition(async () => {
      const result = await markAcompteRecuAction(devisId);
      if (result?.ok && "dossierId" in result && result.dossierId) {
        if (confirm("Acompte enregistré. Aller au dossier de confection créé ?")) {
          router.push(`/confections/${result.dossierId}`);
          return;
        }
        router.refresh();
      } else if (result && !result.ok) {
        alert(result.message ?? "Erreur");
      } else {
        router.refresh();
      }
    });
  };

  return (
    <Button
      variant={variant === "primary" ? "primary" : "outline"}
      size="sm"
      onClick={handle}
      disabled={isPending}
    >
      {isPending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Traitement…
        </>
      ) : (
        <>
          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.4} />
          Marquer acompte reçu
        </>
      )}
    </Button>
  );
}
