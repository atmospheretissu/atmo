"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  MessageSquare,
  Mail,
  AlertTriangle,
  Plus,
  Bell,
  ChevronDown,
  ChevronRight,
  Pencil,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { ColorChip, StatusPill } from "@/components/ui/status-pill";
import { updateAutomationRuleAction } from "@/app/(platform)/parametres/actions";
import type { AutomationRule } from "@/lib/db/automation-rules-shared";
import { MODULE_LABELS, MODULE_TONES } from "@/lib/db/automation-rules-shared";
import type { SmsTemplate } from "@/lib/db/sms-templates-shared";
import type { EmailTemplate } from "@/lib/db/email-templates-shared";
import type { EventAlert, AlertCriteria } from "@/lib/db/event-alerts-shared";
import { EventAlertForm } from "./event-alert-form";

const SELECT_CLASS =
  "h-8 w-full rounded-md border border-line-strong bg-surface px-2 text-[12.5px] text-ink hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15";

const eurShort = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function ArchitectureTab({
  rules,
  smsTemplates,
  emailTemplates,
  alerts,
}: {
  rules: AutomationRule[];
  smsTemplates: SmsTemplate[];
  emailTemplates: EmailTemplate[];
  alerts: EventAlert[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingAlert, setEditingAlert] = useState<{
    rule: AutomationRule;
    alert: EventAlert | null;
  } | null>(null);

  const updateRule = (
    rule: AutomationRule,
    patch: {
      sms_enabled?: boolean;
      sms_template_key?: string | null;
      email_enabled?: boolean;
      email_template_key?: string | null;
    },
  ) => {
    setBusyId(rule.id);
    startTransition(async () => {
      const r = await updateAutomationRuleAction(rule.id, patch);
      if (!r.ok) alert(`Erreur : ${r.message}`);
      setBusyId(null);
      router.refresh();
    });
  };

  const toggleExpanded = (eventKey: string) => {
    const n = new Set(expanded);
    if (n.has(eventKey)) n.delete(eventKey);
    else n.add(eventKey);
    setExpanded(n);
  };

  const alertsByEvent = new Map<string, EventAlert[]>();
  for (const a of alerts) {
    if (!alertsByEvent.has(a.event_key)) alertsByEvent.set(a.event_key, []);
    alertsByEvent.get(a.event_key)!.push(a);
  }

  // Group rules by module
  const byModule = new Map<string, AutomationRule[]>();
  for (const r of rules) {
    const m = r.module ?? "autre";
    if (!byModule.has(m)) byModule.set(m, []);
    byModule.get(m)!.push(r);
  }

  if (rules.length === 0) {
    return (
      <Card className="py-16 px-6 text-center">
        <p className="text-[13px] text-muted">Aucune règle d&apos;automatisation.</p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <Card className="p-4 bg-canvas-2/30 border-dashed">
          <div className="flex items-start gap-3">
            <ColorChip tone="violet" size="md">
              <Zap className="h-4 w-4" strokeWidth={2.2} />
            </ColorChip>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-ink">Architecture des communications</p>
              <p className="text-[12px] text-muted mt-1 max-w-3xl">
                Pour chaque événement : configure la <strong>communication client</strong>{" "}
                (SMS/email envoyé à la personne concernée) et ajoute des{" "}
                <strong>alertes internes</strong> (équipe, admin) avec destinataires et critères
                personnalisés (montant min/max, canal). Tout est appliqué en live.
              </p>
            </div>
          </div>
        </Card>

        {Array.from(byModule.entries()).map(([module, items]) => (
          <div key={module} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <StatusPill tone={MODULE_TONES[module] ?? "muted"} dot={false}>
                {MODULE_LABELS[module] ?? module}
              </StatusPill>
              <span className="text-[11.5px] text-muted-2 tabular-nums">
                {items.length} événement{items.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="bg-white border border-line rounded-2xl overflow-hidden">
              {items.map((r, idx) => {
                const busy = busyId === r.id && pending;
                const smsBroken = r.sms_enabled && !r.sms_template_key;
                const emailBroken = r.email_enabled && !r.email_template_key;
                const rowAlerts = alertsByEvent.get(r.event_key) ?? [];
                const isExpanded = expanded.has(r.event_key);
                const activeAlertsCount = rowAlerts.filter((a) => a.active).length;

                return (
                  <div
                    key={r.id}
                    className={"border-line " + (idx < items.length - 1 ? "border-b" : "")}
                  >
                    {/* Main row */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px_300px] gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleExpanded(r.event_key)}
                            className="text-muted-2 hover:text-ink"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                          <p className="font-semibold text-ink leading-tight">{r.label}</p>
                          {activeAlertsCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-violet-soft text-violet text-[10.5px] font-semibold">
                              <Bell className="h-2.5 w-2.5" /> {activeAlertsCount} alerte
                              {activeAlertsCount > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-[10.5px] text-muted-2 mt-0.5 ml-6">
                          {r.event_key}
                        </p>
                        {r.description && (
                          <p className="text-[11.5px] text-muted mt-1 ml-6 max-w-md">
                            {r.description}
                          </p>
                        )}
                      </div>

                      {/* SMS column */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-3.5 w-3.5 text-muted-2" strokeWidth={2.2} />
                          <span className="text-[11px] text-muted-2 font-semibold">SMS client</span>
                          <Toggle
                            on={r.sms_enabled}
                            onChange={() => updateRule(r, { sms_enabled: !r.sms_enabled })}
                            disabled={busy}
                          />
                        </div>
                        <select
                          value={r.sms_template_key ?? ""}
                          onChange={(e) =>
                            updateRule(r, { sms_template_key: e.target.value || null })
                          }
                          disabled={busy || !r.sms_enabled}
                          className={SELECT_CLASS}
                        >
                          <option value="">— aucun template —</option>
                          {smsTemplates.map((t) => (
                            <option key={t.key} value={t.key} disabled={!t.active}>
                              {t.label} {!t.active && "(inactif)"}
                            </option>
                          ))}
                        </select>
                        {smsBroken && (
                          <p className="text-[10.5px] text-amber mt-1 inline-flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Activé sans template
                          </p>
                        )}
                      </div>

                      {/* Email column */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Mail className="h-3.5 w-3.5 text-muted-2" strokeWidth={2.2} />
                          <span className="text-[11px] text-muted-2 font-semibold">Email client</span>
                          <Toggle
                            on={r.email_enabled}
                            onChange={() => updateRule(r, { email_enabled: !r.email_enabled })}
                            disabled={busy}
                          />
                        </div>
                        <select
                          value={r.email_template_key ?? ""}
                          onChange={(e) =>
                            updateRule(r, { email_template_key: e.target.value || null })
                          }
                          disabled={busy || !r.email_enabled}
                          className={SELECT_CLASS}
                        >
                          <option value="">— aucun template —</option>
                          {emailTemplates.map((t) => (
                            <option key={t.key} value={t.key} disabled={!t.active}>
                              {t.label} {!t.active && "(inactif)"}
                            </option>
                          ))}
                        </select>
                        {emailBroken && (
                          <p className="text-[10.5px] text-amber mt-1 inline-flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Activé sans template
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Expanded alerts panel */}
                    {isExpanded && (
                      <div className="px-4 pb-4 ml-6">
                        <div className="rounded-lg bg-canvas-2/40 border border-line p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Bell className="h-3.5 w-3.5 text-violet" strokeWidth={2.4} />
                              <p className="text-[12px] font-semibold text-ink">
                                Alertes internes
                              </p>
                              <span className="text-[11px] text-muted-2">
                                {rowAlerts.length} configurée{rowAlerts.length > 1 ? "s" : ""}
                              </span>
                            </div>
                            <button
                              onClick={() => setEditingAlert({ rule: r, alert: null })}
                              className="text-[11.5px] text-violet hover:underline font-medium inline-flex items-center gap-1"
                            >
                              <Plus className="h-3 w-3" /> Nouvelle alerte
                            </button>
                          </div>

                          {rowAlerts.length === 0 ? (
                            <p className="text-[11.5px] text-muted-2 text-center py-2">
                              Aucune alerte interne pour cet événement.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {rowAlerts.map((a) => (
                                <AlertRow
                                  key={a.id}
                                  alert={a}
                                  onEdit={() => setEditingAlert({ rule: r, alert: a })}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {editingAlert && (
        <EventAlertForm
          rule={editingAlert.rule}
          alert={editingAlert.alert}
          smsTemplates={smsTemplates}
          emailTemplates={emailTemplates}
          onClose={() => setEditingAlert(null)}
        />
      )}
    </>
  );
}

function AlertRow({
  alert: a,
  onEdit,
}: {
  alert: EventAlert;
  onEdit: () => void;
}) {
  const c = (a.criteria as AlertCriteria) ?? {};
  const criteriaParts: string[] = [];
  if (c.min_amount != null) criteriaParts.push(`≥ ${eurShort.format(c.min_amount)}`);
  if (c.max_amount != null) criteriaParts.push(`≤ ${eurShort.format(c.max_amount)}`);
  if (c.channels && c.channels.length > 0) criteriaParts.push(c.channels.join("/"));

  return (
    <div
      className={
        "bg-white rounded-md border border-line p-2.5 flex items-start gap-2 " +
        (a.active ? "" : "opacity-60")
      }
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[12.5px] font-semibold text-ink leading-tight">{a.label}</p>
          {!a.active && <StatusPill tone="muted">Inactif</StatusPill>}
        </div>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[11px] text-muted">
          {a.send_sms && (
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> SMS · {a.recipient_phones.length}{" "}
              destinataire{a.recipient_phones.length > 1 ? "s" : ""}
            </span>
          )}
          {a.send_email && (
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3 w-3" /> Email · {a.recipient_emails.length}{" "}
              destinataire{a.recipient_emails.length > 1 ? "s" : ""}
            </span>
          )}
          {criteriaParts.length > 0 && (
            <span className="inline-flex items-center gap-1 text-muted-2">
              · Critères : {criteriaParts.join(" · ")}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={onEdit}
        className="text-muted-2 hover:text-ink h-7 w-7 rounded-md hover:bg-canvas-2 inline-flex items-center justify-center shrink-0"
        aria-label="Modifier"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Toggle({
  on,
  onChange,
  disabled,
}: {
  on: boolean;
  onChange: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={
        "inline-flex items-center h-5 w-9 rounded-full transition-colors disabled:opacity-50 " +
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
