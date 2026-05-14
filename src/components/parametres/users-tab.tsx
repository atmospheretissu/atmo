"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Power, Loader2, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import {
  updateProfileAction,
  toggleProfileActiveAction,
} from "@/app/(platform)/parametres/actions";
import type { Profile, UserRole } from "@/lib/db/profiles-shared";
import { ROLE_LABELS } from "@/lib/db/profiles-shared";

const INPUT_CLASS =
  "flex h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-[13.5px] text-ink placeholder:text-muted-2 hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15";

function timeAgo(iso: string | null): string {
  if (!iso) return "Jamais connecté";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Il y a ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export function UsersTab({ profiles }: { profiles: Profile[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ full_name: string; phone: string; role: UserRole }>({
    full_name: "",
    phone: "",
    role: "commercial",
  });

  const openEdit = (p: Profile) => {
    setDraft({
      full_name: p.full_name,
      phone: p.phone ?? "",
      role: p.role,
    });
    setEditing(p.id);
  };

  const cancel = () => {
    setEditing(null);
  };

  const submit = () => {
    if (!editing) return;
    startTransition(async () => {
      const r = await updateProfileAction(editing, {
        full_name: draft.full_name,
        phone: draft.phone,
        role: draft.role,
      });
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      cancel();
      router.refresh();
    });
  };

  const toggle = (p: Profile) => {
    startTransition(async () => {
      const r = await toggleProfileActiveAction(p.id, !p.active);
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      router.refresh();
    });
  };

  if (profiles.length === 0) {
    return (
      <Card className="py-16 px-6 flex flex-col items-center text-center">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet to-pink text-white inline-flex items-center justify-center mb-4">
          <Users className="h-6 w-6" strokeWidth={2} />
        </div>
        <h2 className="text-[16px] font-semibold text-ink mb-1">Aucun utilisateur</h2>
        <p className="text-[12.5px] text-muted max-w-md">
          Les profils sont créés automatiquement à la première connexion via Supabase Auth.
          Crée des comptes via le tableau de bord Supabase (Auth → Users) avec leur rôle attribué.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-5 pt-5 pb-3 border-b border-line">
        <p className="eyebrow mb-1">Équipe</p>
        <h3 className="text-[15px] font-semibold text-ink">
          {profiles.length} utilisateur{profiles.length > 1 ? "s" : ""}
          <span className="ml-2 text-[12.5px] text-muted font-normal">
            ({profiles.filter((p) => p.active).length} actif{profiles.filter((p) => p.active).length > 1 ? "s" : ""})
          </span>
        </h3>
      </div>
      <div className="divide-y divide-line">
        {profiles.map((u) => {
          if (editing === u.id) {
            return (
              <div key={u.id} className="px-5 py-4 bg-canvas-2/20 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="block">
                    <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">Nom complet</span>
                    <input value={draft.full_name} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} className={INPUT_CLASS} autoFocus />
                  </label>
                  <label className="block">
                    <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">Téléphone</span>
                    <input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} className={INPUT_CLASS} placeholder="+33…" />
                  </label>
                  <label className="block">
                    <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">Rôle</span>
                    <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as UserRole })} className={INPUT_CLASS}>
                      {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={cancel} disabled={pending}>Annuler</Button>
                  <Button variant="primary" size="sm" onClick={submit} disabled={pending}>
                    {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Enregistrer"}
                  </Button>
                </div>
              </div>
            );
          }
          return (
            <div key={u.id} className={"px-5 py-3.5 flex items-center gap-3 hover:bg-canvas-2/30 transition-colors group " + (u.active ? "" : "opacity-60")}>
              <LetterAvatar initial={u.avatar_initial ?? u.full_name[0] ?? "?"} tone={toneFor(u.full_name)} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-semibold text-ink leading-tight truncate">{u.full_name}</p>
                <p className="text-[11.5px] text-muted truncate mt-0.5">{u.email}</p>
              </div>
              <div className="hidden md:block w-56">
                <p className="text-[12.5px] text-ink-2">{ROLE_LABELS[u.role]}</p>
                {u.phone && <p className="text-[11px] text-muted-2 font-mono">{u.phone}</p>}
              </div>
              <div className="hidden md:block w-28 text-right">
                <p className="text-[11.5px] text-muted-2">{timeAgo(u.last_seen_at)}</p>
              </div>
              <StatusPill tone={u.active ? "emerald" : "muted"} dot={false}>
                {u.active ? "Actif" : "Inactif"}
              </StatusPill>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon-sm" aria-label={u.active ? "Désactiver" : "Réactiver"} disabled={pending} onClick={() => toggle(u)}>
                  <Power className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Modifier" disabled={pending} onClick={() => openEdit(u)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
