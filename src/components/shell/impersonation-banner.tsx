"use client";

import { useTransition } from "react";
import { UserCircle, X, Loader2 } from "lucide-react";
import { stopImpersonationAction } from "@/app/(platform)/impersonation-actions";

export function ImpersonationBanner({
  targetName,
  targetRole,
}: {
  targetName: string;
  targetRole: string;
}) {
  const [pending, startTransition] = useTransition();
  const stop = () => {
    startTransition(async () => {
      await stopImpersonationAction();
    });
  };
  return (
    <div className="bg-amber text-white px-4 py-2 flex items-center justify-between gap-4 text-[12.5px]">
      <div className="flex items-center gap-2">
        <UserCircle className="h-4 w-4" strokeWidth={2.4} />
        <span>
          Mode simulation — connecté en tant que <strong>{targetName}</strong> ({targetRole})
        </span>
      </div>
      <button
        onClick={stop}
        disabled={pending}
        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-white/20 hover:bg-white/30 font-semibold transition-colors disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
        Sortir du mode simulation
      </button>
    </div>
  );
}
