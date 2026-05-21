"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2, Send, MessageSquare, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  updateSmsTemplateAction,
  sendTestSmsAction,
  createSmsTemplateAction,
  deleteSmsTemplateAction,
} from "@/app/(platform)/parametres/actions";
import type { SmsTemplate } from "@/lib/db/sms-templates-shared";
import { SMS_VARIABLES, DEFAULT_SENDER } from "@/lib/db/sms-templates-shared";

const INPUT_CLASS =
  "h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-[13.5px] text-ink placeholder:text-muted-2 hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15";

export function SmsTemplatesTab({
  templates,
  brevoConfigured,
}: {
  templates: SmsTemplate[];
  brevoConfigured: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState({
    key: "",
    label: "",
    body: "",
    sender: "",
    trigger_description: "",
  });
  const [draft, setDraft] = useState<{ body: string; sender: string }>({
    body: "",
    sender: "",
  });

  const submitCreate = () => {
    startTransition(async () => {
      const r = await createSmsTemplateAction(createDraft);
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      setCreating(false);
      setCreateDraft({ key: "", label: "", body: "", sender: "", trigger_description: "" });
      router.refresh();
    });
  };

  const remove = (t: SmsTemplate) => {
    if (!confirm(`Supprimer le template "${t.label}" ?`)) return;
    startTransition(async () => {
      const r = await deleteSmsTemplateAction(t.id);
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      router.refresh();
    });
  };

  const openEdit = (t: SmsTemplate) => {
    setDraft({ body: t.body, sender: t.sender ?? "" });
    setEditing(t.id);
  };

  const cancel = () => setEditing(null);

  const submit = () => {
    if (!editing) return;
    startTransition(async () => {
      const r = await updateSmsTemplateAction(editing, {
        body: draft.body,
        sender: draft.sender,
      });
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      cancel();
      router.refresh();
    });
  };

  const toggle = (t: SmsTemplate) => {
    startTransition(async () => {
      const r = await updateSmsTemplateAction(t.id, { active: !t.active });
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      router.refresh();
    });
  };

  const testSend = (t: SmsTemplate) => {
    if (!brevoConfigured) {
      alert("BREVO_API_KEY n'est pas configurée sur Railway.");
      return;
    }
    const phone = prompt(
      `Envoyer un SMS de test pour "${t.label}" — numéro destinataire au format E.164 :`,
      "+33",
    );
    if (!phone) return;
    startTransition(async () => {
      const r = await sendTestSmsAction(t.id, phone);
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      alert(`SMS envoyé. Message ID Brevo : ${r.messageId}`);
    });
  };

  if (templates.length === 0) {
    return (
      <Card className="py-16 px-6 flex flex-col items-center text-center">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet to-pink text-white inline-flex items-center justify-center mb-4">
          <MessageSquare className="h-6 w-6" strokeWidth={2} />
        </div>
        <h2 className="text-[16px] font-semibold text-ink mb-1">Aucun template SMS</h2>
        <p className="text-[12.5px] text-muted max-w-md">
          Aucune ligne dans <span className="font-mono">sms_templates</span>. Les templates sont
          insérés via migration.
        </p>
      </Card>
    );
  }

  const activeCount = templates.filter((t) => t.active).length;

  return (
    <div className="space-y-4">
      <Card
        className={
          "p-4 flex items-start gap-3 " +
          (brevoConfigured ? "bg-emerald-soft border-emerald/20" : "bg-amber-soft border-amber/20")
        }
      >
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-ink leading-tight">
            {activeCount} template{activeCount > 1 ? "s" : ""} actif{activeCount > 1 ? "s" : ""} sur {templates.length}
          </p>
          <p className="text-[11.5px] text-muted mt-0.5">
            Variables disponibles :{" "}
            {SMS_VARIABLES.map((v) => (
              <span key={v} className="font-mono mr-1.5">
                {`{{${v}}}`}
              </span>
            ))}
          </p>
          <p className="text-[11.5px] mt-1">
            {brevoConfigured ? (
              <span className="text-emerald font-medium">
                ✓ Brevo configuré · les SMS partent réellement.
              </span>
            ) : (
              <span className="text-amber font-medium">
                ⚠ BREVO_API_KEY non détectée — les envois échoueront.
              </span>
            )}
          </p>
        </div>
      </Card>

      {/* Bouton créer */}
      <div className="flex items-center justify-between">
        <p className="text-[11.5px] text-muted-2">
          Crée des templates spécifiques pour tes besoins métier (notifications internes, alertes, etc.).
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreating((v) => !v)}
          disabled={pending}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Nouveau template SMS
        </Button>
      </div>

      {/* Form création */}
      {creating && (
        <Card className="p-4 ring-2 ring-violet-soft">
          <p className="text-[13.5px] font-semibold text-ink mb-3">Nouveau template SMS</p>
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_180px] gap-2 mb-3">
            <label className="block">
              <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
                Clé technique
              </span>
              <input
                value={createDraft.key}
                onChange={(e) => setCreateDraft({ ...createDraft, key: e.target.value })}
                placeholder="ex: alerte_admin"
                className="h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-[13.5px] text-ink font-mono placeholder:text-muted-2 focus:border-accent focus:outline-none"
                autoFocus
              />
            </label>
            <label className="block">
              <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
                Libellé (lecture humaine)
              </span>
              <input
                value={createDraft.label}
                onChange={(e) => setCreateDraft({ ...createDraft, label: e.target.value })}
                placeholder="Ex: Alerte interne admin"
                className="h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-[13.5px] text-ink placeholder:text-muted-2 focus:border-accent focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
                Expéditeur
              </span>
              <input
                value={createDraft.sender}
                onChange={(e) => setCreateDraft({ ...createDraft, sender: e.target.value })}
                placeholder={DEFAULT_SENDER}
                maxLength={11}
                className="h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-[13.5px] text-ink placeholder:text-muted-2 focus:border-accent focus:outline-none"
              />
            </label>
          </div>
          <label className="block mb-2">
            <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
              Description (déclencheur)
            </span>
            <input
              value={createDraft.trigger_description}
              onChange={(e) =>
                setCreateDraft({ ...createDraft, trigger_description: e.target.value })
              }
              placeholder="Ex: Au scan QR du dernier élément"
              className="h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-[13.5px] text-ink placeholder:text-muted-2 focus:border-accent focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
              Corps du SMS
            </span>
            <textarea
              value={createDraft.body}
              onChange={(e) => setCreateDraft({ ...createDraft, body: e.target.value })}
              rows={4}
              placeholder="Bonjour {{prenom}}, ..."
              className="w-full rounded-md border border-line-strong bg-surface p-3 text-[12.5px] text-ink font-mono leading-relaxed focus:border-accent focus:outline-none resize-y"
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((t) => {
          if (editing === t.id) {
            return (
              <Card key={t.id} className="p-4 ring-2 ring-violet-soft">
                <p className="text-[13.5px] font-semibold text-ink leading-tight mb-1">{t.label}</p>
                <p className="text-[11px] text-muted mb-3 inline-flex items-center gap-1">
                  <Send className="h-3 w-3" /> {t.trigger_description ?? "Manuel"}
                </p>

                <label className="block mb-3">
                  <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
                    Expéditeur (3-11 car.)
                  </span>
                  <input
                    value={draft.sender}
                    onChange={(e) => setDraft({ ...draft, sender: e.target.value })}
                    placeholder={`Défaut : ${DEFAULT_SENDER}`}
                    maxLength={11}
                    className={INPUT_CLASS}
                  />
                </label>

                <label className="block">
                  <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
                    Corps du SMS
                  </span>
                  <textarea
                    value={draft.body}
                    onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                    rows={4}
                    className="w-full rounded-md border border-line-strong bg-surface p-3 text-[12.5px] text-ink font-mono leading-relaxed focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15 resize-y"
                  />
                </label>
                <p className="text-[10.5px] text-muted-2 mt-1.5">
                  {draft.body.length} caractères · {Math.ceil(draft.body.length / 160) || 1} SMS
                </p>

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
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-ink leading-tight">{t.label}</p>
                  <p className="text-[11px] text-muted mt-0.5 inline-flex items-center gap-1">
                    <Send className="h-3 w-3" /> {t.trigger_description ?? "Manuel"}
                  </p>
                  <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-canvas-2 text-[10.5px]">
                    <span className="text-muted-2">Expéditeur :</span>
                    <span className="font-mono font-semibold text-ink-2">
                      {t.sender ?? `${DEFAULT_SENDER} (défaut)`}
                    </span>
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
              <div className="mt-3 p-3 rounded-lg bg-canvas-2/40 border border-line text-[12px] text-ink-2 leading-relaxed font-mono whitespace-pre-wrap">
                {t.body}
              </div>
              <p className="text-[10.5px] text-muted-2 mt-1.5 text-right">
                {t.body.length} car. · {Math.ceil(t.body.length / 160) || 1} SMS
              </p>
              <div className="flex items-center justify-between gap-1.5 mt-2 border-t border-line pt-3">
                <button
                  onClick={() => remove(t)}
                  className="text-[11.5px] text-muted-2 hover:text-pink inline-flex items-center gap-1"
                  disabled={pending}
                >
                  <Trash2 className="h-3 w-3" /> Supprimer
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => testSend(t)}
                    className="text-[11.5px] text-muted hover:text-ink inline-flex items-center gap-1"
                    disabled={pending}
                  >
                    <Send className="h-3 w-3" /> Tester l&apos;envoi
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
