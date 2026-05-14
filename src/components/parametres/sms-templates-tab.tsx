"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2, Send, AlertTriangle, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ColorChip } from "@/components/ui/status-pill";
import { updateSmsTemplateAction } from "@/app/(platform)/parametres/actions";
import type { SmsTemplate } from "@/lib/db/sms-templates-shared";
import { SMS_VARIABLES } from "@/lib/db/sms-templates-shared";

export function SmsTemplatesTab({ templates }: { templates: SmsTemplate[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [draftBody, setDraftBody] = useState("");

  const openEdit = (t: SmsTemplate) => {
    setDraftBody(t.body);
    setEditing(t.id);
  };

  const cancel = () => setEditing(null);

  const submit = () => {
    if (!editing) return;
    startTransition(async () => {
      const r = await updateSmsTemplateAction(editing, { body: draftBody });
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

  if (templates.length === 0) {
    return (
      <Card className="py-16 px-6 flex flex-col items-center text-center">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet to-pink text-white inline-flex items-center justify-center mb-4">
          <MessageSquare className="h-6 w-6" strokeWidth={2} />
        </div>
        <h2 className="text-[16px] font-semibold text-ink mb-1">Aucun template SMS</h2>
        <p className="text-[12.5px] text-muted max-w-md">
          Les templates SMS sont créés par migration. Aucun template n'a encore été inséré
          dans la table <span className="font-mono">sms_templates</span>.
        </p>
      </Card>
    );
  }

  const activeCount = templates.filter((t) => t.active).length;

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-amber-soft border-amber/20 flex items-start gap-3">
        <ColorChip tone="amber" size="sm">
          <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.4} />
        </ColorChip>
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-ink leading-tight">
            {activeCount} template{activeCount > 1 ? "s" : ""} actif{activeCount > 1 ? "s" : ""} sur {templates.length} · expéditeur &quot;ATMOSPHERE&quot;
          </p>
          <p className="text-[11.5px] text-muted mt-0.5">
            Variables disponibles : {SMS_VARIABLES.map((v) => (
              <span key={v} className="font-mono mr-1.5">{`{{${v}}}`}</span>
            ))}
          </p>
          <p className="text-[11px] text-muted mt-1">
            ⚠ Envoi réel SMS désactivé tant que la clé Brevo n&apos;est pas configurée.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((t) => {
          if (editing === t.id) {
            return (
              <Card key={t.id} className="p-4 ring-2 ring-violet-soft">
                <p className="text-[13.5px] font-semibold text-ink leading-tight mb-1">{t.label}</p>
                <p className="text-[11px] text-muted mb-3 inline-flex items-center gap-1">
                  <Send className="h-3 w-3" /> {t.trigger_description ?? "Manuel"}
                </p>
                <textarea
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-line-strong bg-surface p-3 text-[12.5px] text-ink font-mono leading-relaxed focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15 resize-y"
                />
                <p className="text-[10.5px] text-muted-2 mt-1.5">
                  {draftBody.length} caractères · {Math.ceil(draftBody.length / 160)} SMS
                </p>
                <div className="flex items-center justify-end gap-2 mt-3">
                  <Button variant="ghost" size="sm" onClick={cancel} disabled={pending}>Annuler</Button>
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
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-ink leading-tight">{t.label}</p>
                  <p className="text-[11px] text-muted mt-0.5 inline-flex items-center gap-1">
                    <Send className="h-3 w-3" /> {t.trigger_description ?? "Manuel"}
                  </p>
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
              <div className="flex items-center justify-end gap-1 mt-3">
                <button
                  onClick={() => openEdit(t)}
                  className="text-[11.5px] text-muted hover:text-ink inline-flex items-center gap-1"
                  disabled={pending}
                >
                  <Pencil className="h-3 w-3" /> Modifier
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
