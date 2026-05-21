"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, Trash2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createEventAlertAction,
  updateEventAlertAction,
  deleteEventAlertAction,
} from "@/app/(platform)/parametres/actions";
import type { EventAlert, AlertCriteria } from "@/lib/db/event-alerts-shared";
import type { SmsTemplate } from "@/lib/db/sms-templates-shared";
import type { EmailTemplate } from "@/lib/db/email-templates-shared";
import type { AutomationRule } from "@/lib/db/automation-rules-shared";

const INPUT_CLASS =
  "h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-[13.5px] text-ink placeholder:text-muted-2 hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15";
const TEXTAREA_CLASS =
  "w-full rounded-md border border-line-strong bg-surface p-3 text-[12.5px] text-ink font-mono leading-relaxed focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15 resize-y";

type Draft = {
  label: string;
  active: boolean;
  send_sms: boolean;
  send_email: boolean;
  recipient_phones: string;
  recipient_emails: string;
  sms_mode: "template" | "custom";
  sms_template_key: string;
  sms_body: string;
  email_mode: "template" | "custom";
  email_template_key: string;
  email_subject: string;
  email_html: string;
  criteria_min: string;
  criteria_max: string;
  criteria_channels: string[];
};

const EMPTY_DRAFT: Draft = {
  label: "",
  active: true,
  send_sms: false,
  send_email: false,
  recipient_phones: "",
  recipient_emails: "",
  sms_mode: "template",
  sms_template_key: "",
  sms_body: "",
  email_mode: "template",
  email_template_key: "",
  email_subject: "",
  email_html: "",
  criteria_min: "",
  criteria_max: "",
  criteria_channels: [],
};

const ALL_CHANNELS = ["magasin", "leroy_merlin", "ecommerce", "decoratrice", "visio"];

export function EventAlertForm({
  rule,
  alert,
  smsTemplates,
  emailTemplates,
  onClose,
}: {
  rule: AutomationRule;
  alert: EventAlert | null;
  smsTemplates: SmsTemplate[];
  emailTemplates: EmailTemplate[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(alert);

  const [draft, setDraft] = useState<Draft>(() => {
    if (!alert) return EMPTY_DRAFT;
    const c = (alert.criteria as AlertCriteria) ?? {};
    return {
      label: alert.label,
      active: alert.active,
      send_sms: alert.send_sms,
      send_email: alert.send_email,
      recipient_phones: alert.recipient_phones.join("\n"),
      recipient_emails: alert.recipient_emails.join("\n"),
      sms_mode: alert.sms_template_key ? "template" : "custom",
      sms_template_key: alert.sms_template_key ?? "",
      sms_body: alert.sms_body ?? "",
      email_mode: alert.email_template_key ? "template" : "custom",
      email_template_key: alert.email_template_key ?? "",
      email_subject: alert.email_subject ?? "",
      email_html: alert.email_html ?? "",
      criteria_min: c.min_amount?.toString() ?? "",
      criteria_max: c.max_amount?.toString() ?? "",
      criteria_channels: c.channels ?? [],
    };
  });

  const submit = () => {
    startTransition(async () => {
      const criteria: AlertCriteria = {};
      if (draft.criteria_min) criteria.min_amount = Number(draft.criteria_min);
      if (draft.criteria_max) criteria.max_amount = Number(draft.criteria_max);
      if (draft.criteria_channels.length > 0) criteria.channels = draft.criteria_channels;

      const payload = {
        label: draft.label,
        active: draft.active,
        send_sms: draft.send_sms,
        send_email: draft.send_email,
        recipient_phones: draft.recipient_phones,
        recipient_emails: draft.recipient_emails,
        sms_template_key: draft.sms_mode === "template" ? draft.sms_template_key || null : null,
        sms_body: draft.sms_mode === "custom" ? draft.sms_body : "",
        email_template_key: draft.email_mode === "template" ? draft.email_template_key || null : null,
        email_subject: draft.email_mode === "custom" ? draft.email_subject : "",
        email_html: draft.email_mode === "custom" ? draft.email_html : "",
        criteria,
      };

      const r = isEdit
        ? await updateEventAlertAction(alert!.id, payload)
        : await createEventAlertAction({ ...payload, event_key: rule.event_key });
      if (!r.ok) {
        alert_(`Erreur : ${r.message}`);
        return;
      }
      onClose();
      router.refresh();
    });
  };

  const remove = () => {
    if (!alert) return;
    if (!confirm(`Supprimer l'alerte "${alert.label}" ?`)) return;
    startTransition(async () => {
      const r = await deleteEventAlertAction(alert.id);
      if (!r.ok) {
        alert_(`Erreur : ${r.message}`);
        return;
      }
      onClose();
      router.refresh();
    });
  };

  const showChannelFilter = ["devis_envoye", "devis_created", "acompte_recu"].includes(
    rule.event_key,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-line px-5 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 min-w-0">
            <Bell className="h-4 w-4 text-violet shrink-0" strokeWidth={2.2} />
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-ink">
                {isEdit ? "Modifier l'alerte" : "Nouvelle alerte interne"}
              </p>
              <p className="text-[11px] text-muted truncate">
                Événement : <span className="font-mono">{rule.event_key}</span> · {rule.label}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-2 hover:text-ink h-7 w-7 rounded-md hover:bg-canvas-2 inline-flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <label className="block">
            <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
              Libellé interne
            </span>
            <input
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              placeholder='Ex: "Alerter David par SMS si acompte > 5000€"'
              className={INPUT_CLASS}
              autoFocus
            />
          </label>

          {/* Critères */}
          <div className="rounded-lg border border-line bg-canvas-2/30 p-3 space-y-2">
            <p className="text-[11px] text-muted-2 font-semibold uppercase tracking-wider">
              Critères (l&apos;alerte ne part que si...)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="block text-[10.5px] text-muted mb-0.5">Montant min (€ TTC)</span>
                <input
                  type="number"
                  min="0"
                  value={draft.criteria_min}
                  onChange={(e) => setDraft({ ...draft, criteria_min: e.target.value })}
                  placeholder="aucun"
                  className={INPUT_CLASS + " h-8 text-[12.5px]"}
                />
              </label>
              <label className="block">
                <span className="block text-[10.5px] text-muted mb-0.5">Montant max (€ TTC)</span>
                <input
                  type="number"
                  min="0"
                  value={draft.criteria_max}
                  onChange={(e) => setDraft({ ...draft, criteria_max: e.target.value })}
                  placeholder="aucun"
                  className={INPUT_CLASS + " h-8 text-[12.5px]"}
                />
              </label>
            </div>
            {showChannelFilter && (
              <div>
                <span className="block text-[10.5px] text-muted mb-1">
                  Canaux concernés (vide = tous)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_CHANNELS.map((ch) => {
                    const active = draft.criteria_channels.includes(ch);
                    return (
                      <button
                        key={ch}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            criteria_channels: active
                              ? draft.criteria_channels.filter((c) => c !== ch)
                              : [...draft.criteria_channels, ch],
                          })
                        }
                        className={
                          "h-7 px-2.5 rounded-full text-[11.5px] font-medium border transition-colors " +
                          (active
                            ? "bg-ink text-white border-ink"
                            : "bg-white text-muted-2 border-line hover:border-line-strong")
                        }
                      >
                        {ch}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* SMS section */}
          <div className="rounded-lg border border-line p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-semibold text-ink">Envoyer un SMS</span>
              <Toggle
                on={draft.send_sms}
                onChange={() => setDraft({ ...draft, send_sms: !draft.send_sms })}
              />
            </div>
            {draft.send_sms && (
              <>
                <label className="block">
                  <span className="block text-[10.5px] text-muted mb-0.5">
                    Destinataires (un numéro E.164 par ligne ou séparés par virgule)
                  </span>
                  <textarea
                    value={draft.recipient_phones}
                    onChange={(e) => setDraft({ ...draft, recipient_phones: e.target.value })}
                    rows={2}
                    placeholder="+33612345678&#10;+33712345678"
                    className={TEXTAREA_CLASS}
                  />
                </label>
                <div className="flex items-center gap-3 text-[11.5px] text-muted">
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="radio"
                      checked={draft.sms_mode === "template"}
                      onChange={() => setDraft({ ...draft, sms_mode: "template" })}
                    />
                    Template existant
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="radio"
                      checked={draft.sms_mode === "custom"}
                      onChange={() => setDraft({ ...draft, sms_mode: "custom" })}
                    />
                    Corps custom
                  </label>
                </div>
                {draft.sms_mode === "template" ? (
                  <select
                    value={draft.sms_template_key}
                    onChange={(e) => setDraft({ ...draft, sms_template_key: e.target.value })}
                    className={INPUT_CLASS + " h-8 text-[12.5px]"}
                  >
                    <option value="">— choisir un template —</option>
                    {smsTemplates.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <textarea
                    value={draft.sms_body}
                    onChange={(e) => setDraft({ ...draft, sms_body: e.target.value })}
                    rows={3}
                    placeholder="Acompte de {{montant}}€ reçu pour {{client_nom}}. Action requise."
                    className={TEXTAREA_CLASS}
                  />
                )}
              </>
            )}
          </div>

          {/* Email section */}
          <div className="rounded-lg border border-line p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-semibold text-ink">Envoyer un email</span>
              <Toggle
                on={draft.send_email}
                onChange={() => setDraft({ ...draft, send_email: !draft.send_email })}
              />
            </div>
            {draft.send_email && (
              <>
                <label className="block">
                  <span className="block text-[10.5px] text-muted mb-0.5">
                    Destinataires (un email par ligne ou séparés par virgule)
                  </span>
                  <textarea
                    value={draft.recipient_emails}
                    onChange={(e) => setDraft({ ...draft, recipient_emails: e.target.value })}
                    rows={2}
                    placeholder="david@atmospheretissus.fr&#10;equipe@atmospheretissus.fr"
                    className={TEXTAREA_CLASS}
                  />
                </label>
                <div className="flex items-center gap-3 text-[11.5px] text-muted">
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="radio"
                      checked={draft.email_mode === "template"}
                      onChange={() => setDraft({ ...draft, email_mode: "template" })}
                    />
                    Template existant
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="radio"
                      checked={draft.email_mode === "custom"}
                      onChange={() => setDraft({ ...draft, email_mode: "custom" })}
                    />
                    Sujet + HTML custom
                  </label>
                </div>
                {draft.email_mode === "template" ? (
                  <select
                    value={draft.email_template_key}
                    onChange={(e) => setDraft({ ...draft, email_template_key: e.target.value })}
                    className={INPUT_CLASS + " h-8 text-[12.5px]"}
                  >
                    <option value="">— choisir un template —</option>
                    {emailTemplates.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input
                      value={draft.email_subject}
                      onChange={(e) => setDraft({ ...draft, email_subject: e.target.value })}
                      placeholder="Sujet de l'email"
                      className={INPUT_CLASS + " h-8 text-[12.5px]"}
                    />
                    <textarea
                      value={draft.email_html}
                      onChange={(e) => setDraft({ ...draft, email_html: e.target.value })}
                      rows={4}
                      placeholder="<p>Acompte reçu de {{montant}}€ pour {{client_nom}}.</p>"
                      className={TEXTAREA_CLASS}
                    />
                  </>
                )}
              </>
            )}
          </div>

          <div className="text-[10.5px] text-muted-2 leading-relaxed">
            Variables disponibles dans le corps :{" "}
            {["prenom", "nom", "client_nom", "client_email", "client_phone", "montant", "canal", "numero_devis", "produit", "total_ttc", "acompte"].map(
              (v) => (
                <span key={v} className="font-mono mr-1">
                  {`{{${v}}}`}
                </span>
              ),
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-line px-5 py-3 flex items-center justify-between">
          <div>
            {isEdit && (
              <Button variant="ghost" size="sm" onClick={remove} disabled={pending}>
                <Trash2 className="h-3.5 w-3.5 text-pink" /> Supprimer
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isEdit ? "Enregistrer" : "Créer l'alerte"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={
        "inline-flex items-center h-5 w-9 rounded-full transition-colors " +
        (on ? "bg-emerald" : "bg-line-strong")
      }
    >
      <span
        className={
          "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform " +
          (on ? "translate-x-[18px]" : "translate-x-0.5")
        }
      />
    </button>
  );
}

// Renamed to avoid collision with the `alert` shadow
function alert_(msg: string) {
  if (typeof window !== "undefined") window.alert(msg);
}
