"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Banknote,
  ChevronDown,
  CreditCard,
  Receipt,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  markSoldeRecuAction,
  type ManualPaymentMethod,
} from "@/app/(platform)/devis/actions";

const METHODS: Array<{
  value: ManualPaymentMethod;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: string;
}> = [
  { value: "virement", label: "Virement", icon: Banknote, tone: "text-blue" },
  { value: "cb", label: "Carte bancaire", icon: CreditCard, tone: "text-violet" },
  { value: "cheque", label: "Chèque", icon: Receipt, tone: "text-amber" },
  { value: "especes", label: "Espèces", icon: Wallet, tone: "text-emerald" },
];

export function MarkSoldeButton({ devisId }: { devisId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleSelect = (method: ManualPaymentMethod) => {
    setOpen(false);
    const label = METHODS.find((m) => m.value === method)?.label ?? method;
    if (!confirm(`Marquer le solde reçu (${label}) ?`)) return;
    startTransition(async () => {
      const r = await markSoldeRecuAction(devisId, method);
      if (r?.ok) {
        router.refresh();
      } else {
        alert(r?.message ?? "Erreur");
      }
    });
  };

  return (
    <div ref={wrapperRef} className="relative inline-flex">
      <Button
        variant="accent"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Traitement…
          </>
        ) : (
          <>
            <Banknote className="h-3.5 w-3.5" strokeWidth={2.4} />
            Encaisser le solde
            <ChevronDown className="h-3 w-3 -mr-1" strokeWidth={2.4} />
          </>
        )}
      </Button>

      {open && (
        <div className="absolute top-full mt-1.5 right-0 z-30 min-w-[200px] bg-white border border-line rounded-lg shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-line bg-canvas-2/40">
            <p className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-2">
              Mode de paiement
            </p>
          </div>
          <ul className="py-1">
            {METHODS.map((m) => {
              const Icon = m.icon;
              return (
                <li key={m.value}>
                  <button
                    onClick={() => handleSelect(m.value)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-ink-2 hover:bg-canvas-2 transition-colors text-left"
                  >
                    <Icon className={`h-3.5 w-3.5 ${m.tone}`} strokeWidth={2.4} />
                    {m.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
