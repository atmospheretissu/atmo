"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap, MessageSquare, Mail, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ColorChip, StatusPill } from "@/components/ui/status-pill";
import { updateAutomationRuleAction } from "@/app/(platform)/parametres/actions";
import type { AutomationRule } from "@/lib/db/automation-rules-shared";
import { MODULE_LABELS, MODULE_TONES } from "@/lib/db/automation-rules-shared";
import type { SmsTemplate } from "@/lib/db/sms-templates-shared";
import type { EmailTemplate } from "@/lib/db/email-templates-shared";

const SELECT_CLASS =
  "h-8 w-full rounded-md border border-line-strong bg-surface px-2 text-[12.5px] text-ink hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15";

export function ArchitectureTab({
  rules,
  smsTemplates,
  emailTemplates,
}: {
  rules: AutomationRule[];
  smsTemplates: SmsTemplate[];
  emailTemplates: EmailTemplate[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

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
        <p className="text-[13px] text-muted">
          Aucune règle d&apos;automatisation. Vérifie que la migration a inséré les seeds.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-canvas-2/30 border-dashed">
        <div className="flex items-start gap-3">
          <ColorChip tone="violet" size="md">
            <Zap className="h-4 w-4" strokeWidth={2.2} />
          </ColorChip>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-ink">Architecture des automatisations</p>
            <p className="text-[12px] text-muted mt-1 max-w-2xl">
              Chaque événement métier ci-dessous peut déclencher automatiquement un SMS et/ou un
              email avec le template de ton choix. Active/désactive l&apos;envoi, change de
              template — les triggers existants dans le code lisent ces règles à chaque exécution.
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
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-canvas-2/40 border-b border-line">
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">
                    Événement
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 w-[280px]">
                    SMS
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 w-[280px]">
                    Email
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => {
                  const busy = busyId === r.id && pending;
                  const smsBroken = r.sms_enabled && !r.sms_template_key;
                  const emailBroken = r.email_enabled && !r.email_template_key;
                  return (
                    <tr key={r.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 align-top">
                        <p className="font-semibold text-ink leading-tight">{r.label}</p>
                        <p className="font-mono text-[10.5px] text-muted-2 mt-0.5">{r.event_key}</p>
                        {r.description && (
                          <p className="text-[11.5px] text-muted mt-1 max-w-md">{r.description}</p>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-3.5 w-3.5 text-muted-2" strokeWidth={2.2} />
                          <Toggle
                            on={r.sms_enabled}
                            onChange={() =>
                              updateRule(r, { sms_enabled: !r.sms_enabled })
                            }
                            disabled={busy}
                            label="SMS"
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
                            <AlertTriangle className="h-3 w-3" /> Activé mais aucun template
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="flex items-center gap-2 mb-2">
                          <Mail className="h-3.5 w-3.5 text-muted-2" strokeWidth={2.2} />
                          <Toggle
                            on={r.email_enabled}
                            onChange={() =>
                              updateRule(r, { email_enabled: !r.email_enabled })
                            }
                            disabled={busy}
                            label="Email"
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
                            <AlertTriangle className="h-3 w-3" /> Activé mais aucun template
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function Toggle({
  on,
  onChange,
  disabled,
  label,
}: {
  on: boolean;
  onChange: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      aria-label={label}
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
