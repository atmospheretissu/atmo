"use client";

import { useEffect, useState, useTransition } from "react";
import { UserCog, Loader2 } from "lucide-react";
import {
  listSwitchableProfilesAction,
  setImpersonatedProfileAction,
  type SwitchableProfile,
} from "@/app/(platform)/impersonation-actions";

export function ImpersonationSwitcher() {
  const [profiles, setProfiles] = useState<SwitchableProfile[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      const list = await listSwitchableProfilesAction();
      setProfiles(list);
      setLoading(false);
    })();
  }, []);

  const impersonate = (id: string) => {
    startTransition(async () => {
      await setImpersonatedProfileAction(id);
      window.location.href = "/dashboard";
    });
  };

  return (
    <div className="border-t border-line px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-full inline-flex items-center gap-2 h-8 px-2 rounded-md text-[12px] font-semibold text-muted hover:text-ink hover:bg-canvas-2 transition-colors"
      >
        <UserCog className="h-3.5 w-3.5" strokeWidth={2.4} />
        <span className="flex-1 text-left">Mode simulation</span>
        <span className="text-muted-2 text-[10.5px]">Admin</span>
      </button>
      {open && (
        <div className="mt-2 max-h-64 overflow-auto bg-white border border-line rounded-md">
          {loading && (
            <div className="p-3 text-center text-muted text-[12px]">
              <Loader2 className="h-3.5 w-3.5 animate-spin inline-block mr-1" />
              Chargement…
            </div>
          )}
          {!loading && profiles.length === 0 && (
            <p className="p-3 text-center text-muted text-[12px]">Aucun profil</p>
          )}
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => impersonate(p.id)}
              disabled={pending}
              className="w-full text-left px-3 py-2 hover:bg-canvas-2 border-b border-line last:border-0 disabled:opacity-40"
            >
              <p className="text-[12px] font-semibold text-ink truncate">{p.full_name}</p>
              <p className="text-[10.5px] text-muted mt-0.5 truncate">
                {p.role} · {p.email}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
