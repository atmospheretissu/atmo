import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ROLE_LABELS, ROLE_PERMISSIONS, ROLE_COLORS } from "@/lib/db/profiles-shared";
import type { UserRole } from "@/lib/db/profiles-shared";

export function RolesTab({ counts }: { counts: Record<UserRole, number> }) {
  const roles = Object.keys(ROLE_LABELS) as UserRole[];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {roles.map((role) => {
        const count = counts[role] ?? 0;
        const color = ROLE_COLORS[role];
        return (
          <Card key={role} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className={`h-2 w-6 rounded-full bg-${color}`} />
                <div>
                  <p className="text-[14px] font-semibold text-ink">{ROLE_LABELS[role]}</p>
                  <p className="text-[11.5px] text-muted">
                    <span className="tabular-nums">{count}</span> utilisateur{count > 1 ? "s" : ""} actif{count > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>
            <ul className="space-y-1.5">
              {ROLE_PERMISSIONS[role].map((p) => (
                <li key={p} className="flex items-start gap-1.5 text-[12px] text-ink-2">
                  <CheckCircle2 className="h-3 w-3 text-emerald mt-0.5 shrink-0" strokeWidth={2.4} />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
