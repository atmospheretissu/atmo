"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Power,
  Loader2,
  Users,
  Plus,
  Mail,
  KeyRound,
  Copy,
  Check,
  Link2,
  AlertTriangle,
  UserPlus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import {
  updateProfileAction,
  toggleProfileActiveAction,
  inviteUserAction,
  sendPasswordResetAction,
  createUserWithPasswordAction,
  adminSetPasswordAction,
  generateAuthLinkAction,
  createMissingProfileAction,
} from "@/app/(platform)/parametres/actions";
import type { AuthUserRow } from "@/lib/db/profiles";
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

/** Génère un mot de passe lisible mais solide (14 car., sans ambiguïté). */
function suggestPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const symbols = "!@#$%&*?-+";
  const pick = (src: string, n: number) =>
    Array.from(
      { length: n },
      () => src[Math.floor(Math.random() * src.length)],
    ).join("");
  return pick(alphabet, 12) + pick(symbols, 2);
}

export function UsersTab({
  profiles,
  authUsers = [],
}: {
  profiles: Profile[];
  authUsers?: AuthUserRow[];
}) {
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
  /** "password" = l'admin fixe le mot de passe et le communique lui-même.
   *  "link"     = on génère un lien d'activation copiable (pas d'email).
   *  "email"    = Supabase envoie l'invitation (limité par le SMTP). */
  const [createMode, setCreateMode] = useState<"password" | "link" | "email">(
    "password",
  );
  const [newPassword, setNewPassword] = useState(suggestPassword());
  /** Lien généré à afficher/copier dans une modale. */
  const [generatedLink, setGeneratedLink] = useState<{
    label: string;
    link: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  /** Reset de mot de passe en cours pour cet utilisateur. */
  const [resetFor, setResetFor] = useState<Profile | null>(null);
  const [resetPwd, setResetPwd] = useState("");
  const [draft, setDraft] = useState<{
    full_name: string;
    phone: string;
    role: UserRole;
    secondary_roles: UserRole[];
  }>({
    full_name: "",
    phone: "",
    role: "commercial",
    secondary_roles: [],
  });

  const resetCreateForm = () => {
    setInviting(false);
    setInviteDraft({ email: "", full_name: "", phone: "", role: "consultation_lm" });
    setNewPassword(suggestPassword());
  };

  const submitInvite = () => {
    startTransition(async () => {
      // Mode 1 — compte immédiatement utilisable avec un mot de passe
      // choisi par l'admin. Aucun email, aucune dépendance SMTP.
      if (createMode === "password") {
        const r = await createUserWithPasswordAction({
          ...inviteDraft,
          password: newPassword,
        });
        if (!r.ok) {
          alert(`Erreur : ${r.message}`);
          return;
        }
        const created = inviteDraft.email;
        const pwd = newPassword;
        resetCreateForm();
        setGeneratedLink({
          label: `Compte créé pour ${created} — mot de passe à transmettre`,
          link: pwd,
        });
        router.refresh();
        return;
      }

      // Mode 2 — lien d'activation copiable (contourne la limite SMTP)
      if (createMode === "link") {
        const r = await inviteUserAction(inviteDraft);
        if (!r.ok) {
          alert(`Erreur : ${r.message}`);
          return;
        }
        const linkRes = await generateAuthLinkAction({
          email: inviteDraft.email,
          kind: "invite",
        });
        const created = inviteDraft.email;
        resetCreateForm();
        router.refresh();
        if (linkRes.ok) {
          setGeneratedLink({
            label: `Lien d'activation pour ${created}`,
            link: linkRes.link,
          });
        } else {
          alert(`Compte créé, mais lien non généré : ${linkRes.message}`);
        }
        return;
      }

      // Mode 3 — invitation par email Supabase (historique)
      const r = await inviteUserAction(inviteDraft);
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      const sentTo = inviteDraft.email;
      resetCreateForm();
      alert(
        `Invitation envoyée à ${sentTo}. Attention : le SMTP Supabase est limité à quelques envois par heure — préfère le mode « lien à copier » si rien n'arrive.`,
      );
      router.refresh();
    });
  };

  /** Fixe directement le mot de passe d'un utilisateur existant. */
  const submitReset = () => {
    if (!resetFor) return;
    startTransition(async () => {
      const r = await adminSetPasswordAction({
        userId: resetFor.id,
        password: resetPwd,
      });
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      const email = resetFor.email;
      const pwd = resetPwd;
      setResetFor(null);
      setResetPwd("");
      setGeneratedLink({
        label: `Nouveau mot de passe de ${email} — à transmettre`,
        link: pwd,
      });
    });
  };

  /** Génère un lien de réinitialisation copiable (sans email). */
  const generateResetLink = (email: string) => {
    startTransition(async () => {
      const r = await generateAuthLinkAction({ email, kind: "recovery" });
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      setResetFor(null);
      setResetPwd("");
      setGeneratedLink({
        label: `Lien de réinitialisation pour ${email}`,
        link: r.link,
      });
    });
  };

  /** Envoi email classique (dépend du SMTP Supabase). */
  const sendResetEmail = (email: string) => {
    startTransition(async () => {
      const r = await sendPasswordResetAction(email);
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      setResetFor(null);
      alert(
        `Email envoyé à ${email}. Si rien n'arrive sous 2 min, utilise « Copier un lien » (le SMTP Supabase est bridé).`,
      );
    });
  };

  /** Rattache un compte auth orphelin en lui créant un profil. */
  const attachProfile = (u: AuthUserRow) => {
    const name = prompt(
      `Nom complet pour ${u.email} ?`,
      u.email.split("@")[0],
    );
    if (!name) return;
    startTransition(async () => {
      const r = await createMissingProfileAction({
        userId: u.id,
        email: u.email,
        full_name: name,
        role: "consultation_lm",
      });
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      router.refresh();
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copie manuelle :", text);
    }
  };

  const openEdit = (p: Profile) => {
    const sr =
      (p as unknown as { secondary_roles?: string[] | null }).secondary_roles ??
      [];
    setDraft({
      full_name: p.full_name,
      phone: p.phone ?? "",
      role: p.role,
      secondary_roles: sr.filter((r): r is UserRole =>
        (Object.keys(ROLE_LABELS) as string[]).includes(r),
      ) as UserRole[],
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
        // On retire le rôle principal des secondaires (redondant) et on
        // envoie la liste dédupée directement.
        secondary_roles: draft.secondary_roles.filter((r) => r !== draft.role),
      });
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      cancel();
      router.refresh();
    });
  };

  const toggleSecondaryRole = (r: UserRole) => {
    setDraft((d) => ({
      ...d,
      secondary_roles: d.secondary_roles.includes(r)
        ? d.secondary_roles.filter((x) => x !== r)
        : [...d.secondary_roles, r],
    }));
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


  const orphans = authUsers.filter((u) => !u.has_profile);

  return (
    <div className="space-y-4">
      {/* Modale : mot de passe ou lien généré, à copier */}
      {generatedLink && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setGeneratedLink(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="h-9 w-9 rounded-md bg-emerald-soft text-emerald inline-flex items-center justify-center shrink-0">
                <Check className="h-4 w-4" strokeWidth={2.4} />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-ink">
                  {generatedLink.label}
                </p>
                <p className="text-[12px] text-muted mt-0.5">
                  Copie-le maintenant — il ne sera plus affiché après fermeture.
                </p>
              </div>
            </div>
            <div className="rounded-md border border-line-strong bg-canvas-2/40 p-3 mb-3">
              <p className="font-mono text-[12.5px] text-ink break-all select-all">
                {generatedLink.link}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setGeneratedLink(null)}>
                Fermer
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => copyToClipboard(generatedLink.link)}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Copié
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copier
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Panneau : réinitialisation du mot de passe d'un utilisateur */}
      {resetFor && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setResetFor(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[14px] font-semibold text-ink mb-1">
              Réinitialiser le mot de passe
            </p>
            <p className="text-[12.5px] text-muted mb-4">{resetFor.email}</p>

            <div className="mb-3">
              <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
                Nouveau mot de passe
              </span>
              <div className="flex items-stretch gap-1.5">
                <input
                  value={resetPwd}
                  onChange={(e) => setResetPwd(e.target.value)}
                  className={INPUT_CLASS + " font-mono"}
                />
                <Button variant="secondary" size="sm" onClick={() => setResetPwd(suggestPassword())} disabled={pending}>
                  Regénérer
                </Button>
              </div>
            </div>
            <Button variant="primary" size="sm" className="w-full mb-3" onClick={submitReset} disabled={pending || resetPwd.length < 8}>
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
              Définir ce mot de passe
            </Button>

            <div className="relative my-3">
              <div className="border-t border-line" />
              <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-white px-2 text-[10.5px] uppercase tracking-wider text-muted-2">
                ou laisser l&apos;utilisateur choisir
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={() => generateResetLink(resetFor.email)} disabled={pending}>
                <Link2 className="h-3.5 w-3.5" /> Copier un lien
              </Button>
              <Button variant="secondary" size="sm" onClick={() => sendResetEmail(resetFor.email)} disabled={pending}>
                <Mail className="h-3.5 w-3.5" /> Envoyer par email
              </Button>
            </div>
            <p className="text-[11px] text-muted-2 mt-3 leading-relaxed">
              Le lien à copier ne consomme pas le quota SMTP Supabase — à
              privilégier si les emails n&apos;arrivent pas.
            </p>
          </div>
        </div>
      )}

      {/* Comptes auth sans profil — invisibles dans la liste jusqu'ici */}
      {orphans.length > 0 && (
        <Card className="p-4 border-amber/40 bg-amber-soft/30">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-md bg-amber text-white inline-flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4" strokeWidth={2.4} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-semibold text-ink">
                {orphans.length} compte{orphans.length > 1 ? "s" : ""} sans profil
              </p>
              <p className="text-[12px] text-muted mt-0.5 mb-2.5">
                Ces comptes existent côté authentification mais n&apos;ont pas de
                fiche utilisateur — ils ne peuvent pas se connecter
                correctement tant qu&apos;un rôle ne leur est pas attribué.
              </p>
              <div className="space-y-1.5">
                {orphans.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-2 bg-white rounded-md border border-line px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-medium text-ink truncate">{u.email}</p>
                      <p className="text-[11px] text-muted-2">
                        Créé le {new Date(u.created_at).toLocaleDateString("fr-FR")}
                        {u.last_sign_in_at
                          ? ` · dernière connexion ${timeAgo(u.last_sign_in_at)}`
                          : " · jamais connecté"}
                      </p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => attachProfile(u)} disabled={pending}>
                      <UserPlus className="h-3.5 w-3.5" /> Créer le profil
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

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
          {/* Choix du mode d'activation du compte */}
          <div className="mb-3">
            <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1.5">
              Comment activer ce compte ?
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              {([
                { v: "password", label: "Mot de passe", hint: "Immédiat" },
                { v: "link", label: "Lien à copier", hint: "Sans email" },
                { v: "email", label: "Email d'invitation", hint: "Via Supabase" },
              ] as const).map((m) => (
                <button
                  key={m.v}
                  type="button"
                  onClick={() => setCreateMode(m.v)}
                  className={
                    "text-left px-3 py-2 rounded-md border transition-colors " +
                    (createMode === m.v
                      ? "bg-ink text-white border-ink"
                      : "bg-white text-ink-2 border-line hover:border-violet")
                  }
                >
                  <span className="block text-[12.5px] font-semibold">{m.label}</span>
                  <span className={"block text-[10.5px] " + (createMode === m.v ? "text-white/70" : "text-muted-2")}>
                    {m.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {createMode === "password" && (
            <div className="mb-3">
              <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
                Mot de passe initial
              </span>
              <div className="flex items-stretch gap-1.5">
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={INPUT_CLASS + " font-mono"}
                />
                <Button variant="secondary" size="sm" onClick={() => setNewPassword(suggestPassword())} disabled={pending}>
                  Regénérer
                </Button>
              </div>
              <p className="text-[11px] text-muted-2 mt-1">
                Le compte est utilisable tout de suite. Transmets ce mot de passe à la personne — elle pourra le changer ensuite.
              </p>
            </div>
          )}

          <p className="text-[11.5px] text-muted mb-3">
            {createMode === "password"
              ? "Aucun email envoyé — tu communiques le mot de passe toi-même."
              : createMode === "link"
                ? "Un lien d'activation sera généré et affiché pour que tu le copies (WhatsApp, SMS, email perso…)."
                : "Supabase enverra l'email d'invitation. Attention : quota SMTP limité à quelques envois par heure."}
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setInviting(false)} disabled={pending}>Annuler</Button>
            <Button variant="primary" size="sm" onClick={submitInvite} disabled={pending}>
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : createMode === "password" ? (
                "Créer le compte"
              ) : createMode === "link" ? (
                "Créer et générer le lien"
              ) : (
                "Envoyer l'invitation"
              )}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-[11.5px] text-muted-2">
            Crée un compte avec un mot de passe, un lien à copier, ou une invitation par email.
          </p>
          <Button variant="primary" size="sm" onClick={() => { setInviting(true); setNewPassword(suggestPassword()); }} disabled={pending}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Nouvel utilisateur
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
                <div>
                  <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1.5">
                    Rôles additionnels (facultatif)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(ROLE_LABELS) as UserRole[])
                      .filter((r) => r !== draft.role)
                      .map((r) => {
                        const active = draft.secondary_roles.includes(r);
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => toggleSecondaryRole(r)}
                            className={
                              "h-7 px-2.5 rounded-full text-[11.5px] font-medium border transition-colors " +
                              (active
                                ? "bg-violet text-white border-violet"
                                : "bg-white text-muted-2 border-line hover:border-violet hover:text-violet")
                            }
                          >
                            {ROLE_LABELS[r]}
                          </button>
                        );
                      })}
                  </div>
                  <span className="block text-[10.5px] text-muted-2 mt-2">
                    Cliquez pour ajouter un rôle. Le rôle principal (au-dessus)
                    reste maître pour la navigation et les permissions.
                  </span>
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
                <Button variant="ghost" size="icon-sm" aria-label="Réinitialiser le mot de passe" title="Réinitialiser le mot de passe" disabled={pending} onClick={() => { setResetFor(u); setResetPwd(suggestPassword()); }}>
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
