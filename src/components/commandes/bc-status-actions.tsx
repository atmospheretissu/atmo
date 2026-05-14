"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, CheckCircle2, Truck, Package, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  sendBcAction,
  confirmBcAction,
  shipBcAction,
  receiveBcAction,
  flagBcProblemAction,
} from "@/app/(platform)/commandes/actions";

type Status = "brouillon" | "envoye" | "confirme" | "expedie" | "recu" | "probleme";

export function BcStatusActions({
  bcId,
  status,
  francoOk,
}: {
  bcId: string;
  status: Status;
  francoOk: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) {
        alert(`Erreur : ${r.message ?? ""}`);
        return;
      }
      router.refresh();
    });
  };

  if (status === "recu") {
    return (
      <span className="text-[12px] text-emerald font-medium inline-flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.4} /> Marchandise reçue
      </span>
    );
  }

  if (status === "probleme") {
    return (
      <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => receiveBcAction(bcId))}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
        Marquer reçu
      </Button>
    );
  }

  return (
    <>
      {status === "brouillon" && (
        <Button
          variant="primary"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (!francoOk && !confirm("Franco non atteint. Envoyer quand même ?")) return;
            run(() => sendBcAction(bcId));
          }}
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" strokeWidth={2.4} />}
          Envoyer
        </Button>
      )}
      {status === "envoye" && (
        <Button variant="primary" size="sm" disabled={pending} onClick={() => run(() => confirmBcAction(bcId))}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.4} />}
          Confirmer
        </Button>
      )}
      {status === "confirme" && (
        <Button variant="primary" size="sm" disabled={pending} onClick={() => run(() => shipBcAction(bcId))}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" strokeWidth={2.4} />}
          Expédié
        </Button>
      )}
      {status === "expedie" && (
        <Button variant="primary" size="sm" disabled={pending} onClick={() => run(() => receiveBcAction(bcId))}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" strokeWidth={2.4} />}
          Marquer reçu
        </Button>
      )}
      {(status === "envoye" || status === "confirme" || status === "expedie") && (
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            const notes = prompt("Décrire le problème (rupture, qualité, retard…) :");
            if (notes === null) return;
            run(() => flagBcProblemAction(bcId, notes));
          }}
        >
          <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.4} /> Signaler
        </Button>
      )}
    </>
  );
}
