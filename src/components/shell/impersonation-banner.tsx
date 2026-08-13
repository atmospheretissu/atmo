"use client";

import { UserCircle } from "lucide-react";
import { StopImpersonationButton } from "@/components/shell/stop-impersonation-button";

export function ImpersonationBanner({
  targetName,
  targetRole,
}: {
  targetName: string;
  targetRole: string;
}) {
  return (
    <div className="bg-amber text-white px-4 py-2 flex items-center justify-between gap-4 text-[12.5px]">
      <div className="flex items-center gap-2">
        <UserCircle className="h-4 w-4" strokeWidth={2.4} />
        <span>
          Mode simulation — connecté en tant que <strong>{targetName}</strong> ({targetRole})
        </span>
      </div>
      <StopImpersonationButton target="/dashboard" />
    </div>
  );
}
