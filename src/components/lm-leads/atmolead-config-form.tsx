"use client";

import { useMemo, useState, useTransition } from "react";
import { Save, Calendar, Code2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ColorChip } from "@/components/ui/status-pill";
import { describeCron } from "@/lib/atmolead-cron";
import { cn } from "@/lib/utils";
import type { AtmoleadConfig } from "@/lib/db/atmolead";

type SelectorSpec = {
  key: string;
  label: string;
  hint: string;
  default: string;
};

const SELECTORS: { group: string; tone: "violet" | "pink" | "orange"; specs: SelectorSpec[] }[] = [
  {
    group: "Login",
    tone: "violet",
    specs: [
      { key: "startUrl", label: "URL de démarrage", hint: "Page qui déclenche le SSO Adeo", default: "https://partenaires.leroymerlin.fr/" },
      { key: "identifierInput", label: "Champ identifiant", hint: "Étape 1 — identifiant", default: "#identifierInput" },
      { key: "identifierSubmit", label: 'Bouton "Suivant"', hint: "Étape 1 — soumettre identifiant", default: "#my_sign_on_button" },
      { key: "passwordInput", label: "Champ mot de passe", hint: "Étape 2", default: 'input[type="password"]' },
      { key: "passwordSubmit", label: 'Bouton "Connexion"', hint: "Étape 2 — soumettre password", default: "#signOnButton" },
      { key: "loggedInUrlMatch", label: "URL post-login (regex)", hint: "Doit matcher après login", default: "leads-management" },
    ],
  },
  {
    group: "Liste des leads",
    tone: "pink",
    specs: [
      { key: "leadsUrl", label: "URL de la liste", hint: "Page principale Tandem Pro", default: "https://partenaires.leroymerlin.fr/leads-management/leads" },
      { key: "leadCardPrefix", label: "Préfixe data-testid", hint: "Préfixe des cartes lead", default: "lead-card-" },
    ],
  },
  {
    group: "Page détail",
    tone: "orange",
    specs: [
      {
        key: "leadDetailUrlTemplate",
        label: "Template URL détail",
        hint: "{id} sera remplacé par l'ID du lead",
        default: "https://partenaires.leroymerlin.fr/leads-management/leads/{id}",
      },
    ],
  },
];

const PRESETS = [
  { label: "Toutes les 15 min", value: "*/15 * * * *" },
  { label: "Toutes les 30 min", value: "*/30 * * * *" },
  { label: "Chaque heure", value: "0 * * * *" },
  { label: "Toutes les 6h", value: "0 */6 * * *" },
  { label: "Toutes les 12h", value: "0 */12 * * *" },
  { label: "Nuit (3h)", value: "0 3 * * *" },
];

export function AtmoleadConfigForm({ config }: { config: AtmoleadConfig | null }) {
  const [targetUrl, setTargetUrl] = useState(config?.target_url ?? "");
  const [cron, setCron] = useState(config?.cron_expression ?? "0 */6 * * *");
  const [enabled, setEnabled] = useState(config?.enabled ?? true);
  const [overrides, setOverrides] = useState<Record<string, string>>(config?.css_selectors ?? {});
  const [notes, setNotes] = useState(config?.notes ?? "");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const cronInfo = useMemo(() => describeCron(cron), [cron]);

  function save() {
    setMessage(null);
    startTransition(async () => {
      const filteredOverrides: Record<string, string> = {};
      for (const group of SELECTORS) {
        for (const spec of group.specs) {
          const v = overrides[spec.key];
          if (v !== undefined && v !== "" && v !== spec.default) {
            filteredOverrides[spec.key] = v;
          }
        }
      }
      const res = await fetch("/api/leads-lm/config", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          target_url: targetUrl,
          cron_expression: cron,
          enabled,
          css_selectors: filteredOverrides,
          notes,
        }),
      });
      if (res.ok) {
        setMessage({ kind: "ok", text: "Sauvegardé. Le worker rechargera la config sous 5 min." });
      } else {
        const body = await res.json().catch(() => null);
        setMessage({ kind: "err", text: body?.error ?? "Erreur — voir logs" });
      }
    });
  }

  function reset(key: string, def: string) {
    const next = { ...overrides };
    delete next[key];
    setOverrides(next);
    setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>(`input[data-key="${key}"]`);
      if (el) el.value = def;
    }, 0);
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="border-b border-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ColorChip tone="emerald" size="sm">
              <Calendar className="h-3.5 w-3.5" strokeWidth={2.2} />
            </ColorChip>
            <div>
              <div className="text-[13.5px] font-semibold">Paramètres généraux</div>
              <div className="text-[11.5px] text-muted">Activation, source et fréquence du scraping</div>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-canvas-2/50 px-4 py-3 transition-colors hover:bg-canvas-2">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 accent-ink"
            />
            <div className="flex-1">
              <div className="text-[13px] font-medium">Scraping activé</div>
              <div className="text-[11.5px] text-muted">
                {enabled ? "Le worker exécutera le cron automatiquement" : "Aucun run automatique"}
              </div>
            </div>
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                enabled ? "bg-emerald" : "bg-muted-2",
              )}
            />
          </label>

          <Field label="URL cible" hint="Point d'entrée du portail. Déclenche le SSO Adeo.">
            <input
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="input"
            />
          </Field>

          <Field
            label="Fréquence (expression cron)"
            hint={cronInfo.valid ? `→ ${cronInfo.human}` : (cronInfo.error ?? "expression invalide")}
            hintTone={cronInfo.valid ? undefined : "err"}
          >
            <div className="space-y-2.5">
              <input
                type="text"
                value={cron}
                onChange={(e) => setCron(e.target.value)}
                className="input font-mono text-[12.5px]"
                placeholder="0 */6 * * *"
              />
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setCron(p.value)}
                    className={cn(
                      "rounded-md px-2 py-1 text-[11.5px] font-medium transition-colors",
                      cron === p.value
                        ? "bg-ink text-white"
                        : "bg-canvas-2 text-ink-3 hover:bg-canvas-3",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {cronInfo.valid && cronInfo.nextRun && (
                <div className="rounded-md border border-line bg-canvas-2 px-3 py-2 text-[11.5px]">
                  <span className="text-muted">Prochain run :</span>{" "}
                  <span className="font-medium">
                    {new Date(cronInfo.nextRun).toLocaleString("fr-FR")}
                  </span>
                  <span className="ml-2 text-muted">({cronInfo.nextRunRelative})</span>
                </div>
              )}
              {!cronInfo.valid && (
                <div className="rounded-md border border-red-soft bg-red-soft px-3 py-2 text-[11.5px] text-red">
                  Expression invalide — {cronInfo.error}
                </div>
              )}
            </div>
          </Field>
        </div>
      </Card>

      <Card>
        <div className="border-b border-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ColorChip tone="violet" size="sm">
              <Code2 className="h-3.5 w-3.5" strokeWidth={2.2} />
            </ColorChip>
            <div>
              <div className="text-[13.5px] font-semibold">Sélecteurs CSS</div>
              <div className="text-[11.5px] text-muted">
                Surcharger uniquement si Leroy Merlin modifie son DOM. Sinon laisser les défauts.
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 px-5 py-5">
          {SELECTORS.map((group) => (
            <div key={group.group}>
              <div className="mb-2.5 flex items-center gap-2">
                <ColorChip tone={group.tone} size="sm">
                  <Code2 className="h-3 w-3" strokeWidth={2.2} />
                </ColorChip>
                <span className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">
                  {group.group}
                </span>
              </div>
              <div className="space-y-3">
                {group.specs.map((spec) => {
                  const current = overrides[spec.key] ?? spec.default;
                  const isOverridden =
                    overrides[spec.key] !== undefined &&
                    overrides[spec.key] !== spec.default;
                  return (
                    <div key={spec.key} className="grid grid-cols-[1fr_auto] gap-2 items-start">
                      <div>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <label className="text-[13px] font-medium">{spec.label}</label>
                          {isOverridden && (
                            <span className="rounded bg-amber-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber">
                              override
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          data-key={spec.key}
                          defaultValue={current}
                          onChange={(e) =>
                            setOverrides({ ...overrides, [spec.key]: e.target.value })
                          }
                          className="input font-mono text-[12px]"
                        />
                        <div className="mt-1 text-[11.5px] text-muted">
                          {spec.hint} · Défaut :{" "}
                          <code className="rounded bg-canvas-2 px-1 py-0.5 text-[11px]">
                            {spec.default}
                          </code>
                        </div>
                      </div>
                      {isOverridden && (
                        <button
                          type="button"
                          onClick={() => reset(spec.key, spec.default)}
                          className="mt-7 rounded-md border border-line bg-white px-2 py-1 text-[11.5px] text-muted hover:text-ink-2"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="px-5 py-4">
          <Field label="Notes" hint="Mémo libre — pas utilisé par le worker.">
            <textarea
              value={notes ?? ""}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="input"
            />
          </Field>
        </div>
      </Card>

      <div className="flex items-center justify-between rounded-xl border border-line bg-white p-4">
        {message && (
          <span
            className={cn(
              "text-[12.5px]",
              message.kind === "ok" ? "text-emerald" : "text-red",
            )}
          >
            {message.text}
          </span>
        )}
        <Button
          variant="primary"
          size="md"
          onClick={save}
          disabled={pending || !cronInfo.valid}
          className="ml-auto"
        >
          <Save className="h-3.5 w-3.5" />
          {pending ? "Sauvegarde…" : "Sauvegarder"}
        </Button>
      </div>

      <style>{`
        .input {
          width: 100%;
          background: var(--color-canvas-2);
          border: 1px solid var(--color-line);
          color: var(--color-ink);
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 13px;
        }
        .input:focus {
          outline: 2px solid var(--color-violet);
          outline-offset: -1px;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  hint,
  hintTone,
  children,
}: {
  label: string;
  hint?: string;
  hintTone?: "err";
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[13px] font-medium">{label}</label>
      {children}
      {hint && (
        <div
          className={cn(
            "mt-1 text-[11.5px]",
            hintTone === "err" ? "text-red" : "text-muted",
          )}
        >
          {hint}
        </div>
      )}
    </div>
  );
}
