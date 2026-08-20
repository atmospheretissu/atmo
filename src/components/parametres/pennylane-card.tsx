"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Zap,
  ArrowUpToLine,
  ArrowDownToLine,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calculator,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  getPennylaneStatusAction,
  togglePennylaneFeatureAction,
  triggerPennylanePullNowAction,
  type PennylaneStatus,
} from "@/app/(platform)/parametres/pennylane-actions";

type Feature =
  | "push_customer_enabled"
  | "push_invoice_enabled"
  | "pull_reconciliation_enabled";

export function PennylaneCard() {
  const [status, setStatus] = useState<PennylaneStatus | null>(null);
  const [pending, startTransition] = useTransition();
  const [pulling, startPull] = useTransition();
  const [pullMsg, setPullMsg] = useState<string | null>(null);

  const refresh = () =>
    getPennylaneStatusAction().then(setStatus).catch(() => {});

  useEffect(() => {
    refresh();
  }, []);

  const toggle = (feature: Feature, next: boolean) => {
    startTransition(async () => {
      const r = await togglePennylaneFeatureAction(feature, next);
      if (!r.ok) {
        alert(`Échec : ${r.message ?? "erreur inconnue"}`);
      }
      await refresh();
    });
  };

  const runPullNow = () => {
    setPullMsg(null);
    startPull(async () => {
      const r = await triggerPennylanePullNowAction();
      if (!r.ok) {
        setPullMsg(`❌ ${r.message ?? "Échec"}`);
      } else {
        setPullMsg(
          `✓ Pull terminé — ${r.scanned ?? 0} factures scannées, ${r.matched ?? 0} rapprochées.`,
        );
      }
      await refresh();
    });
  };

  if (!status) {
    return (
      <Card className="p-5 flex items-center gap-2 text-[13px] text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement Pennylane…
      </Card>
    );
  }

  const tokensOK = status.env.tokensReady;
  const s = status.settings;

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-line flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald to-blue text-white inline-flex items-center justify-center shrink-0">
            <Calculator className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[10.5px] uppercase tracking-widest font-semibold text-muted-2 mb-0.5">
              Intégration comptable
            </p>
            <h3 className="text-[16px] font-semibold text-ink">Pennylane</h3>
            <p className="text-[12px] text-muted mt-0.5 max-w-xl leading-relaxed">
              Envoi automatique des factures d&apos;acompte et de solde,
              rapprochement horaire depuis Pennylane, vérification à la demande.
            </p>
          </div>
        </div>
        {tokensOK ? (
          <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-emerald-soft text-emerald-strong text-[11px] font-semibold">
            <CheckCircle2 className="h-3 w-3" /> Tokens API OK
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-amber-soft text-amber text-[11px] font-semibold">
            <AlertTriangle className="h-3 w-3" /> Tokens absents (env)
          </span>
        )}
      </div>

      {/* Bandeau dev / prod */}
      {!tokensOK && (
        <div className="px-5 py-3 bg-amber-soft/40 border-b border-line text-[12.5px] text-ink-2">
          Pennylane est inactive dans cet environnement — les variables
          d&apos;env <code className="font-mono">PENNYLANE_TOKEN_CUSTOMERS</code>{" "}
          et <code className="font-mono">PENNYLANE_TOKEN_INVOICES</code> sont
          absentes. En dev c&apos;est normal ; en prod, ajoute-les dans les
          variables Railway.
        </div>
      )}

      {/* 3 toggles */}
      <div className="divide-y divide-line">
        <ToggleRow
          icon={ArrowUpToLine}
          title="Push client automatique"
          desc="À la première facture d'un client, upsert vers Pennylane (crée ou met à jour) et stocke l'id de mapping."
          value={s.push_customer_enabled}
          onToggle={(v) => toggle("push_customer_enabled", v)}
          disabled={!tokensOK || pending}
        />
        <ToggleRow
          icon={ArrowUpToLine}
          title="Push facture automatique"
          desc="Dès qu'un acompte ou solde est encaissé (Stripe / manuel), crée la facture correspondante côté Pennylane."
          value={s.push_invoice_enabled}
          onToggle={(v) => toggle("push_invoice_enabled", v)}
          disabled={!tokensOK || pending}
        />
        <ToggleRow
          icon={ArrowDownToLine}
          title="Réconciliation horaire (pull)"
          desc="Cron horaire côté worker Atmolead qui vérifie les factures Pennylane, extrait les payments et met à jour notre base."
          value={s.pull_reconciliation_enabled}
          onToggle={(v) => toggle("pull_reconciliation_enabled", v)}
          disabled={!tokensOK || pending}
        />
      </div>

      {/* État + actions */}
      <div className="px-5 py-4 bg-canvas-2/40 border-t border-line space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
          <InfoLine
            label="Dernier push"
            value={s.last_push_at ? formatDate(s.last_push_at) : "—"}
          />
          <InfoLine
            label="Dernier pull"
            value={
              s.last_pull_at
                ? `${formatDate(s.last_pull_at)}${s.last_pull_stats ? ` · ${formatStats(s.last_pull_stats)}` : ""}`
                : "—"
            }
          />
          <InfoLine
            label="Secret cron worker"
            value={
              status.env.cronSecretReady
                ? "Configuré"
                : "Absent (PENNYLANE_CRON_SECRET)"
            }
            warn={!status.env.cronSecretReady}
          />
          {s.last_error && (
            <InfoLine
              label="Dernière erreur"
              value={s.last_error}
              warn
              wrap
            />
          )}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={runPullNow}
            disabled={
              !tokensOK ||
              !s.pull_reconciliation_enabled ||
              pulling
            }
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12.5px] font-semibold bg-ink text-white hover:bg-ink/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {pulling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Lancer un pull maintenant
          </button>
          {pullMsg && (
            <span
              className={
                "text-[11.5px] " +
                (pullMsg.startsWith("✓") ? "text-emerald" : "text-pink")
              }
            >
              {pullMsg}
            </span>
          )}
        </div>

        <div className="text-[10.5px] text-muted-2 pt-1 flex items-start gap-1">
          <Zap className="h-3 w-3 mt-0.5 shrink-0" />
          <span>
            Endpoint cron :{" "}
            <code className="font-mono">POST /api/cron/pennylane-pull</code> avec
            header <code className="font-mono">x-cron-secret</code>. À
            configurer côté worker Railway pour un run horaire.
          </span>
        </div>
      </div>
    </Card>
  );
}

function ToggleRow({
  icon: Icon,
  title,
  desc,
  value,
  onToggle,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  desc: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="p-4 flex items-start gap-3">
      <div className="h-8 w-8 rounded-md bg-canvas-2 text-ink-2 inline-flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-ink">{title}</p>
        <p className="text-[11.5px] text-muted mt-0.5 leading-relaxed">
          {desc}
        </p>
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onToggle(!value)}
        disabled={disabled}
        className={
          "relative shrink-0 h-6 w-11 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed " +
          (value ? "bg-emerald" : "bg-canvas-2 border border-line")
        }
      >
        <span
          className={
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform " +
            (value ? "translate-x-5" : "translate-x-0.5")
          }
        />
      </button>
    </div>
  );
}

function InfoLine({
  label,
  value,
  warn,
  wrap,
}: {
  label: string;
  value: string;
  warn?: boolean;
  wrap?: boolean;
}) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-widest font-semibold text-muted-2 mb-0.5">
        {label}
      </p>
      <p
        className={
          "text-[12.5px] " +
          (warn ? "text-amber" : "text-ink-2") +
          (wrap ? " whitespace-pre-wrap" : " truncate")
        }
      >
        {value}
      </p>
    </div>
  );
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatStats(stats: Record<string, unknown>): string {
  const s = stats.scanned as number | undefined;
  const m = stats.matched as number | undefined;
  if (s == null && m == null) return "";
  return `${s ?? 0} scannées · ${m ?? 0} rapprochées`;
}
