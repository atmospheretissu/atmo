"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Power, Loader2, Users, Plus, Mail, KeyRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import {
  updateProfileAction,
  toggleProfileActiveAction,
  inviteUserAction,
  sendPasswordResetAction,
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
  const [inviting, setInviting] = useState(false);
  const [inviteDraft, setInviteDraft] = useState<{
    email: string;
    full_name: string;
    phone: string;
    role: UserRole;
  }>({
    email: "",
    full_name: "",
    phone: "",
    role: "consultation_lm",
  });
  const [draft, setDraft] = useState<{ full_name: string; phone: string; role: UserRole; secondary_roles: string }>({
    full_name: "",
    phone: "",
    role: "commercial",
    secondary_roles: "",
  });

  const submitInvite = () => {
    startTransition(async () => {
      const r = await inviteUserAction(inviteDraft);
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      setInviting(false);
      setInviteDraft({ email: "", full_name: "", phone: "", role: "consultation_lm" });
      alert(`Invitation envoyée à ${inviteDraft.email} — il/elle recevra un lien pour définir son mot de passe.`);
      router.refresh();
    });
  };

  const resetPassword = (email: string) => {
    if (!confirm(`Envoyer un lien de reset de mot de passe à ${email} ?`)) return;
    startTransition(async () => {
      const r = await sendPasswordResetAction(email);
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      alert(`Lien envoyé à ${email}`);
    });
  };

  const openEdit = (p: Profile) => {
    const sr =
      (p as unknown as { secondary_roles?: string[] | null }).secondary_roles ??
      [];
    setDraft({
      full_name: p.full_name,
      phone: p.phone ?? "",
      role: p.role,
      secondary_roles: sr.join(", "),
    });
    setEditing(p.id);
  };

  const cancel = () => {
    setEditing(null);
  };

  const submit = () => {
    if (!editing) return;
    startTransition(async () => {
      const secondaryRoles = draft.secondary_roles
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const r = await updateProfileAction(editing, {
        full_name: draft.full_name,
        phone: draft.phone,
        role: draft.role,
        secondary_roles: secondaryRoles,
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


  return (
    <div className="space-y-4">
      {/* Invitation */}
      {inviting ? (
        <Card className="p-4 ring-2 ring-violet-soft">
          <p className="text-[13.5px] font-semibold text-ink mb-3">Inviter un utilisateur</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <label className="block">
              <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">Email</span>
              <input
                type="email"
                value={inviteDraft.email}
                onChange={(e) => setInviteDraft({ ...inviteDraft, email: e.target.value })}
                placeholder="nouveau@exemple.fr"
                className={INPUT_CLASS}
                autoFocus
              />
            </label>
            <label className="block">
              <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">Nom complet</span>
              <input
                value={inviteDraft.full_name}
                onChange={(e) => setInviteDraft({ ...inviteDraft, full_name: e.target.value })}
                placeholder="Prénom Nom"
                className={INPUT_CLASS}
              />
            </label>
            <label className="block">
              <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">Téléphone (option.)</span>
              <input
                value={inviteDraft.phone}
                onChange={(e) => setInviteDraft({ ...inviteDraft, phone: e.target.value })}
                placeholder="+33…"
                className={INPUT_CLASS}
              />
            </label>
            <label className="block">
              <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">Rôle</span>
              <select
                value={inviteDraft.role}
                onChange={(e) => setInviteDraft({ ...inviteDraft, role: e.target.value as UserRole })}
                className={INPUT_CLASS}
              >
                {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-[11.5px] text-muted mb-3">
            L&apos;utilisateur recevra un email avec un lien pour définir son mot de passe.
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setInviting(false)} disabled={pending}>Annuler</Button>
            <Button variant="primary" size="sm" onClick={submitInvite} disabled={pending}>
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Envoyer l'invitation"}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-[11.5px] text-muted-2">
            Invite un membre par email — il définira son mot de passe via un lien sécurisé.
          </p>
          <Button variant="primary" size="sm" onClick={() => setInviting(true)} disabled={pending}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Inviter un utilisateur
          </Button>
        </div>
      )}

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
                    <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">Rôle principal</span>
                    <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as UserRole })} className={INPUT_CLASS}>
                      {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="block">
                  <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
                    Rôles additionnels (facultatif)
                  </span>
                  <input
                    value={draft.secondary_roles}
                    onChange={(e) =>
                      setDraft({ ...draft, secondary_roles: e.target.value })
                    }
                    className={INPUT_CLASS}
                    placeholder="décoratrice, leroy_merlin, saint_maclou…"
                  />
                  <span className="block text-[10.5px] text-muted-2 mt-1">
                    Séparés par des virgules. Le rôle principal reste maître (navigation
                    et permissions). Les rôles additionnels apparaissent en badges.
                  </span>
                </label>
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
                {(() => {
                  const sr =
                    (u as unknown as { secondary_roles?: string[] | null })
                      .secondary_roles ?? [];
                  if (sr.length === 0) return null;
                  return (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {sr.map((r) => (
                        <span
                          key={r}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-soft text-violet-strong"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  );
                })()}
                {u.phone && (
                  <p className="text-[11px] text-muted-2 font-mono mt-0.5">
                    {u.phone}
                  </p>
                )}
              </div>
              <div className="hidden md:block w-28 text-right">
                <p className="text-[11.5px] text-muted-2">{timeAgo(u.last_seen_at)}</p>
              </div>
              <StatusPill tone={u.active ? "emerald" : "muted"} dot={false}>
                {u.active ? "Actif" : "Inactif"}
              </StatusPill>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon-sm" aria-label="Reset mot de passe" disabled={pending} onClick={() => resetPassword(u.email)}>
                  <KeyRound className="h-3.5 w-3.5" />
                </Button>
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
    </div>
  );
}
