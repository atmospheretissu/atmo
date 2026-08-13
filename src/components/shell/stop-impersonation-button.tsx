"use client";

import { useTransition } from "react";
import { X, Loader2 } from "lucide-react";
import { stopImpersonationAction } from "@/app/(platform)/impersonation-actions";

/**
 * Bouton "sortir du mode simulation" — utilisable partout (banner du
 * layout platform, page 403, etc.).
 */
export function StopImpersonationButton() {
  const [pending, startTransition] = useTransition();
  const stop = () => {
    startTransition(async () => {
      await stopImpersonationAction();
    });
  };
  return (
    <button
      onClick={stop}
      disabled={pending}
      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-white/20 hover:bg-white/30 font-semibold transition-colors disabled:opacity-50 text-[12.5px]"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <X className="h-3.5 w-3.5" />
      )}
      Sortir du mode simulation
    </button>
  );
}
