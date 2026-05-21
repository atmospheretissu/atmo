"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2, Send, Mail, Eye, Code, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  updateEmailTemplateAction,
  createEmailTemplateAction,
  deleteEmailTemplateAction,
} from "@/app/(platform)/parametres/actions";
import type { EmailTemplate } from "@/lib/db/email-templates-shared";
import { EMAIL_VARIABLES } from "@/lib/db/email-templates-shared";

const INPUT_CLASS =
  "h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-[13.5px] text-ink placeholder:text-muted-2 hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15";

const TEXTAREA_CLASS =
  "w-full rounded-md border border-line-strong bg-surface p-3 text-[12.5px] text-ink font-mono leading-relaxed focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15 resize-y";

type Draft = {
  subject: string;
  html_body: string;
  text_body: string;
  sender_email: string;
  sender_name: string;
};

export function EmailTemplatesTab({
  templates,
  brevoConfigured,
}: {
  templates: EmailTemplate[];
  brevoConfigured: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState({
    key: "",
    label: "",
    subject: "",
    html_body: "",
    text_body: "",
    sender_email: "",
    sender_name: "",
    trigger_description: "",
  });

  const submitCreate = () => {
    startTransition(async () => {
      const r = await createEmailTemplateAction(createDraft);
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      setCreating(false);
      setCreateDraft({
        key: "",
        label: "",
        subject: "",
        html_body: "",
        text_body: "",
        sender_email: "",
        sender_name: "",
        trigger_description: "",
      });
      router.refresh();
    });
  };

  const remove = (t: EmailTemplate) => {
    if (!confirm(`Supprimer le template "${t.label}" ?`)) return;
    startTransition(async () => {
      const r = await deleteEmailTemplateAction(t.id);
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      router.refresh();
    });
  };
  const [draft, setDraft] = useState<Draft>({
    subject: "",
    html_body: "",
    text_body: "",
    sender_email: "",
    sender_name: "",
  });

  const openEdit = (t: EmailTemplate) => {
    setDraft({
      subject: t.subject,
      html_body: t.html_body,
      text_body: t.text_body ?? "",
      sender_email: t.sender_email ?? "",
      sender_name: t.sender_name ?? "",
    });
    setEditing(t.id);
    setPreviewing(null);
  };

  const cancel = () => setEditing(null);

  const submit = () => {
    if (!editing) return;
    startTransition(async () => {
      const r = await updateEmailTemplateAction(editing, draft);
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      cancel();
      router.refresh();
    });
  };

  const toggle = (t: EmailTemplate) => {
    startTransition(async () => {
      const r = await updateEmailTemplateAction(t.id, { active: !t.active });
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      router.refresh();
    });
  };

  if (templates.length === 0) {
    return (
      <Card className="py-16 px-6 flex flex-col items-center text-center">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet to-pink text-white inline-flex items-center justify-center mb-4">
          <Mail className="h-6 w-6" strokeWidth={2} />
        </div>
        <h2 className="text-[16px] font-semibold text-ink mb-1">Aucun template email</h2>
        <p className="text-[12.5px] text-muted max-w-md">
          Aucune ligne dans <span className="font-mono">email_templates</span>. Vérifie que la
          migration a été appliquée.
        </p>
      </Card>
    );
  }

  const activeCount = templates.filter((t) => t.active).length;

  return (
    <div className="space-y-4">
      <Card
        className={
          "p-4 " + (brevoConfigured ? "bg-emerald-soft border-emerald/20" : "bg-amber-soft border-amber/20")
        }
      >
        <p className="text-[13px] font-semibold text-ink leading-tight">
          {activeCount} template{activeCount > 1 ? "s" : ""} actif{activeCount > 1 ? "s" : ""} sur {templates.length}
        </p>
        <p className="text-[11.5px] text-muted mt-0.5">
          Variables disponibles :{" "}
          {EMAIL_VARIABLES.map((v) => (
            <span key={v} className="font-mono mr-1.5">
              {`{{${v}}}`}
            </span>
          ))}
        </p>
        <p className="text-[11.5px] mt-1">
          {brevoConfigured ? (
            <span className="text-emerald font-medium">✓ Brevo configuré · emails opérationnels</span>
          ) : (
            <span className="text-amber font-medium">
              ⚠ BREVO_API_KEY absente — les emails seront marqués <span className="font-mono">skipped</span>
            </span>
          )}
        </p>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-[11.5px] text-muted-2">
          Crée des templates email custom à plugger dans les règles ou alertes.
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreating((v) => !v)}
          disabled={pending}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Nouveau template Email
        </Button>
      </div>

      {creating && (
        <Card className="p-5 ring-2 ring-violet-soft">
          <p className="text-[14px] font-semibold text-ink mb-3">Nouveau template Email</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <label className="block">
              <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
                Clé technique
              </span>
              <input
                value={createDraft.key}
                onChange={(e) => setCreateDraft({ ...createDraft, key: e.target.value })}
                placeholder="ex: alerte_interne"
                className={INPUT_CLASS + " font-mono"}
                autoFocus
              />
            </label>
            <label className="block">
              <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
                Libellé
              </span>
              <input
                value={createDraft.label}
                onChange={(e) => setCreateDraft({ ...createDraft, label: e.target.value })}
                placeholder="Ex: Alerte admin urgente"
                className={INPUT_CLASS}
              />
            </label>
            <label className="block">
              <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
                Expéditeur · email
              </span>
              <input
                value={createDraft.sender_email}
                onChange={(e) => setCreateDraft({ ...createDraft, sender_email: e.target.value })}
                placeholder="Défaut env"
                className={INPUT_CLASS}
              />
            </label>
            <label className="block">
              <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
                Expéditeur · nom
              </span>
              <input
                value={createDraft.sender_name}
                onChange={(e) => setCreateDraft({ ...createDraft, sender_name: e.target.value })}
                placeholder="Défaut env"
                className={INPUT_CLASS}
              />
            </label>
          </div>
          <label className="block mb-3">
            <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
              Déclencheur (description)
            </span>
            <input
              value={createDraft.trigger_description}
              onChange={(e) =>
                setCreateDraft({ ...createDraft, trigger_description: e.target.value })
              }
              placeholder="Ex: À l'acompte reçu pour montant > 5000€"
              className={INPUT_CLASS}
            />
          </label>
          <label className="block mb-3">
            <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
              Sujet
            </span>
            <input
              value={createDraft.subject}
              onChange={(e) => setCreateDraft({ ...createDraft, subject: e.target.value })}
              placeholder="Ex: Alerte — gros acompte reçu"
              className={INPUT_CLASS}
            />
          </label>
          <label className="block mb-3">
            <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
              Corps HTML
            </span>
            <textarea
              value={createDraft.html_body}
              onChange={(e) => setCreateDraft({ ...createDraft, html_body: e.target.value })}
              rows={6}
              className={TEXTAREA_CLASS}
              placeholder="<p>Acompte de {{acompte}}€ reçu pour {{client_nom}}.</p>"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
              Version texte (optionnel)
            </span>
            <textarea
              value={createDraft.text_body}
              onChange={(e) => setCreateDraft({ ...createDraft, text_body: e.target.value })}
              rows={2}
              className={TEXTAREA_CLASS}
            />
          </label>
          <div className="flex items-center justify-end gap-2 mt-3">
            <Button variant="ghost" size="sm" onClick={() => setCreating(false)} disabled={pending}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" onClick={submitCreate} disabled={pending}>
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Créer"}
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {templates.map((t) => {
          if (editing === t.id) {
            return (
              <Card key={t.id} className="p-5 ring-2 ring-violet-soft">
                <p className="text-[14px] font-semibold text-ink leading-tight mb-3">{t.label}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <label className="block">
                    <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
                      Expéditeur · email
                    </span>
                    <input
                      value={draft.sender_email}
                      onChange={(e) => setDraft({ ...draft, sender_email: e.target.value })}
                      placeholder="Défaut : BREVO_SENDER_EMAIL env"
                      className={INPUT_CLASS}
                    />
                  </label>
                  <label className="block">
                    <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
                      Expéditeur · nom
                    </span>
                    <input
                      value={draft.sender_name}
                      onChange={(e) => setDraft({ ...draft, sender_name: e.target.value })}
                      placeholder="Défaut : Atmosphère Tissus"
                      className={INPUT_CLASS}
                    />
                  </label>
                </div>

                <label className="block mb-3">
                  <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
                    Sujet
                  </span>
                  <input
                    value={draft.subject}
                    onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                    className={INPUT_CLASS}
                  />
                </label>

                <label className="block mb-3">
                  <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
                    Corps HTML
                  </span>
                  <textarea
                    value={draft.html_body}
                    onChange={(e) => setDraft({ ...draft, html_body: e.target.value })}
                    rows={8}
                    className={TEXTAREA_CLASS}
                  />
                </label>

                <label className="block">
                  <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
                    Version texte (optionnel)
                  </span>
                  <textarea
                    value={draft.text_body}
                    onChange={(e) => setDraft({ ...draft, text_body: e.target.value })}
                    rows={3}
                    className={TEXTAREA_CLASS}
                    placeholder="Texte brut pour les clients sans rendu HTML"
                  />
                </label>

                <div className="flex items-center justify-end gap-2 mt-3">
                  <Button variant="ghost" size="sm" onClick={cancel} disabled={pending}>
                    Annuler
                  </Button>
                  <Button variant="primary" size="sm" onClick={submit} disabled={pending}>
                    {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Enregistrer"}
                  </Button>
                </div>
              </Card>
            );
          }

          return (
            <Card key={t.id} className={"p-4 " + (t.active ? "" : "opacity-60")}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold text-ink leading-tight">{t.label}</p>
                  <p className="text-[11px] text-muted mt-0.5 inline-flex items-center gap-1">
                    <Send className="h-3 w-3" /> {t.trigger_description ?? "Manuel"}
                  </p>
                  <p className="text-[12.5px] text-ink-2 mt-2 font-medium">{t.subject}</p>
                  <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-2">
                    De : <span className="font-mono">{t.sender_email ?? "(env)"}</span>
                    {t.sender_name && <span className="font-mono">· {t.sender_name}</span>}
                  </div>
                </div>
                <button
                  onClick={() => toggle(t)}
                  disabled={pending}
                  className={
                    "inline-flex items-center h-6 w-11 rounded-full transition-colors shrink-0 " +
                    (t.active ? "bg-emerald" : "bg-line-strong")
                  }
                  aria-label={t.active ? "Désactiver" : "Activer"}
                >
                  <span
                    className={
                      "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform " +
                      (t.active ? "translate-x-[22px]" : "translate-x-0.5")
                    }
                  />
                </button>
              </div>

              {previewing === t.id && (
                <div className="mt-3 rounded-lg border border-line bg-white overflow-hidden">
                  <div className="px-3 py-2 bg-canvas-2/40 border-b border-line text-[11px] font-mono text-muted">
                    Aperçu HTML (variables non interpolées)
                  </div>
                  <div
                    className="p-4 text-[13px] text-ink prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: t.html_body }}
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-1.5 mt-3 border-t border-line pt-2.5">
                <button
                  onClick={() => remove(t)}
                  className="text-[11.5px] text-muted-2 hover:text-pink inline-flex items-center gap-1"
                  disabled={pending}
                >
                  <Trash2 className="h-3 w-3" /> Supprimer
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPreviewing(previewing === t.id ? null : t.id)}
                    className="text-[11.5px] text-muted hover:text-ink inline-flex items-center gap-1"
                  >
                    {previewing === t.id ? (
                      <>
                        <Code className="h-3 w-3" /> Masquer
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3" /> Aperçu HTML
                      </>
                    )}
                  </button>
                  <span className="text-muted-2 mx-1">·</span>
                  <button
                    onClick={() => openEdit(t)}
                    className="text-[11.5px] text-muted hover:text-ink inline-flex items-center gap-1"
                    disabled={pending}
                  >
                    <Pencil className="h-3 w-3" /> Modifier
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
