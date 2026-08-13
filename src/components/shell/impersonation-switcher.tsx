"use client";

import { useEffect, useState, useTransition } from "react";
import {
  UserCog,
  Loader2,
  ShieldCheck,
  Store,
  Package,
  Scissors,
  Truck,
  Palette,
} from "lucide-react";
import {
  listSwitchableProfilesAction,
  setImpersonatedProfileAction,
  setImpersonatedRoleAction,
  type SwitchableProfile,
} from "@/app/(platform)/impersonation-actions";
import { ROLE_ROUTES, type UserRole } from "@/lib/db/profiles-shared";

const ROLES: {
  key: UserRole;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}[] = [
  { key: "admin", label: "Admin", icon: ShieldCheck },
  { key: "commercial", label: "Commercial", icon: Store },
  { key: "resp_magasin", label: "Resp. magasin", icon: Store },
  { key: "resp_confection", label: "Resp. confection", icon: Package },
  { key: "couturiere", label: "Couturière", icon: Scissors },
  { key: "couturiere_externe", label: "Couturière ext.", icon: Scissors },
  { key: "poseur", label: "Poseur", icon: Truck },
  { key: "poseur_externe", label: "Poseur externe", icon: Truck },
  { key: "decoratrice", label: "Décoratrice", icon: Palette },
  { key: "consultation_lm", label: "Consult. LM", icon: Store },
];

export function ImpersonationSwitcher() {
  const [profiles, setProfiles] = useState<SwitchableProfile[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [showUsers, setShowUsers] = useState(false);

  useEffect(() => {
    if (!open || profiles.length > 0) return;
    (async () => {
      const list = await listSwitchableProfilesAction();
      setProfiles(list);
      setLoading(false);
    })();
  }, [open, profiles.length]);

  const impersonateRole = (role: UserRole) => {
    startTransition(async () => {
      await setImpersonatedRoleAction(role);
      // Redirect vers la home du rôle simulé (poseur → /poses, etc.)
      const home = ROLE_ROUTES[role]?.homeRoute ?? "/dashboard";
      window.location.href = home;
    });
  };

  const impersonateUser = (id: string) => {
    startTransition(async () => {
      await setImpersonatedProfileAction(id);
      // On ne connaît pas le rôle cible ici — retour à la racine, le
      // middleware redirige automatiquement vers la home du rôle.
      window.location.href = "/";
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
        <div className="mt-2 bg-white border border-line rounded-md overflow-hidden">
          {/* 6 rôles cliquables — simule le rôle sans profil ciblé */}
          <div className="px-2.5 pt-2.5 pb-1.5">
            <p className="text-[9.5px] font-semibold tracking-wider uppercase text-muted-2 mb-1.5 px-1">
              Simuler un rôle
            </p>
            <div className="grid grid-cols-2 gap-1">
              {ROLES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => impersonateRole(r.key)}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11.5px] font-medium text-ink-2 hover:bg-violet-soft hover:text-violet-strong border border-transparent hover:border-violet/20 transition-colors disabled:opacity-40"
                >
                  <r.icon className="h-3 w-3" strokeWidth={2.4} />
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fold-out : impersonner un utilisateur précis */}
          <button
            type="button"
            onClick={() => setShowUsers((s) => !s)}
            className="w-full text-left px-3 py-2 text-[11px] font-medium text-muted-2 hover:text-ink border-t border-line bg-canvas-2/40 hover:bg-canvas-2"
          >
            {showUsers ? "− " : "+ "}
            Ou impersonner un utilisateur précis
          </button>
          {showUsers && (
            <div className="max-h-48 overflow-auto border-t border-line">
              {loading && (
                <div className="p-3 text-center text-muted text-[12px]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin inline-block mr-1" />
                  Chargement…
                </div>
              )}
              {!loading && profiles.length === 0 && (
                <p className="p-3 text-center text-muted text-[12px]">
                  Aucun autre profil disponible.
                </p>
              )}
              {profiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => impersonateUser(p.id)}
                  disabled={pending}
                  className="w-full text-left px-3 py-2 hover:bg-canvas-2 border-b border-line last:border-0 disabled:opacity-40"
                >
                  <p className="text-[12px] font-semibold text-ink truncate">
                    {p.full_name}
                  </p>
                  <p className="text-[10.5px] text-muted mt-0.5 truncate">
                    {p.role} · {p.email}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
