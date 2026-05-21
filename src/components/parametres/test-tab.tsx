"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Phone,
  MessageSquare,
  RefreshCw,
  Inbox,
  Mail,
  Sparkles,
  Eye,
  EyeOff,
  Copy,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ColorChip, StatusPill } from "@/components/ui/status-pill";
import {
  sendCustomSmsAction,
  sendCustomEmailAction,
  loadTestTabDataAction,
  loadEmailLogAction,
} from "@/app/(platform)/parametres/actions";
import type { SmsTemplate } from "@/lib/db/sms-templates-shared";
import { DEFAULT_SENDER } from "@/lib/db/sms-templates-shared";
import type { EmailTemplate } from "@/lib/db/email-templates-shared";
import type { SmsLogWithMeta } from "@/lib/db/sms-log";
import type { EmailLogWithMeta } from "@/lib/db/email-log";
import type { BrevoAccountInfo } from "@/lib/brevo/account";

const INPUT_CLASS =
  "h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-[13.5px] text-ink placeholder:text-muted-2 hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15";

const TEXTAREA_CLASS =
  "w-full rounded-md border border-line-strong bg-surface p-3 text-[13px] text-ink font-mono leading-relaxed placeholder:text-muted-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15 resize-y";

type Props = {
  smsTemplates: SmsTemplate[];
  emailTemplates: EmailTemplate[];
  brevoConfigured: boolean;
};

const DEMO_VARS: Record<string, string> = {
  prenom: "Hélène",
  produit: "Rideau salon",
  date: "lundi 26 mai",
  heure: "10h",
  poseur: "Romain",
  acompte: "490",
  lien_pdf: "https://atmospheretissus.fr/d/abc",
  lien_avis: "https://g.page/atmospheretissus/review",
};

function extractVarNames(body: string): string[] {
  const matches = body.matchAll(/\{\{(\w+)\}\}/g);
  const set = new Set<string>();
  for (const m of matches) set.add(m[1]);
  return Array.from(set);
}

function interpolate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, name) => vars[name] ?? "");
}

type Channel = "sms" | "email";

export function TestTab({ smsTemplates, emailTemplates, brevoConfigured }: Props) {
  const [channel, setChannel] = useState<Channel>("sms");
  const [data, setData] = useState<{
    brevoAccount: BrevoAccountInfo | null;
    recentSmsLog: SmsLogWithMeta[];
    recentEmailLog: EmailLogWithMeta[];
  }>({ brevoAccount: null, recentSmsLog: [], recentEmailLog: [] });
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const load = () =>
    startTransition(async () => {
      setLoading(true);
      try {
        const [base, emailLog] = await Promise.all([
          loadTestTabDataAction(),
          loadEmailLogAction(),
        ]);
        setData({
          brevoAccount: base.brevoAccount,
          recentSmsLog: base.recentSmsLog,
          recentEmailLog: emailLog.rows,
        });
      } finally {
        setLoading(false);
      }
    });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <BrevoStatusCard
        account={data.brevoAccount}
        brevoConfigured={brevoConfigured}
        loading={loading}
        onRefresh={load}
        refreshing={pending}
      />

      {/* Channel switcher */}
      <div className="inline-flex items-center gap-0.5 p-1 bg-canvas-2/60 border border-line rounded-lg">
        <button
          onClick={() => setChannel("sms")}
          className={
            "inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12.5px] font-medium transition-colors " +
            (channel === "sms" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink")
          }
        >
          <MessageSquare className="h-3.5 w-3.5" strokeWidth={2.2} /> SMS
        </button>
        <button
          onClick={() => setChannel("email")}
          className={
            "inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12.5px] font-medium transition-colors " +
            (channel === "email" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink")
          }
        >
          <Mail className="h-3.5 w-3.5" strokeWidth={2.2} /> Email
        </button>
      </div>

      {channel === "sms" ? (
        <>
          <SmsTestCard
            templates={smsTemplates}
            brevoConfigured={brevoConfigured}
            onSent={load}
          />
          <RecentSmsLogCard rows={data.recentSmsLog} loading={loading} />
        </>
      ) : (
        <>
          <EmailTestCard
            templates={emailTemplates}
            brevoConfigured={brevoConfigured}
            onSent={load}
          />
          <RecentEmailLogCard rows={data.recentEmailLog} loading={loading} />
        </>
      )}
    </div>
  );
}

/* ============================ BREVO STATUS ============================ */

function BrevoStatusCard({
  account,
  brevoConfigured,
  loading,
  onRefresh,
  refreshing,
}: {
  account: BrevoAccountInfo | null;
  brevoConfigured: boolean;
  loading: boolean;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <ColorChip tone={brevoConfigured && account?.ok ? "emerald" : "amber"} size="md">
            <Sparkles className="h-4 w-4" strokeWidth={2.2} />
          </ColorChip>
          <div>
            <p className="text-[14px] font-semibold text-ink">Compte Brevo</p>
            <p className="text-[11.5px] text-muted">
              Validation de la clé API et solde des crédits SMS / email.
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Rafraîchir
        </Button>
      </div>

      {loading && (
        <div className="rounded-lg bg-canvas-2/40 border border-line p-4 text-center text-[12.5px] text-muted-2">
          <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
          Connexion à Brevo…
        </div>
      )}

      {!loading && !brevoConfigured && (
        <div className="rounded-lg bg-amber-soft border border-amber/20 p-3 text-[12.5px] text-ink-2">
          <strong>BREVO_API_KEY non détectée.</strong> Ajoute-la dans Railway → Variables, puis
          redéploie pour activer Brevo.
        </div>
      )}

      {!loading && brevoConfigured && account && !account.ok && (
        <div className="rounded-lg bg-amber-soft border border-amber/20 p-3 text-[12.5px] text-ink-2">
          <strong>La clé est présente mais Brevo refuse la connexion.</strong>
          <div className="mt-1 font-mono text-[11px] text-amber">{account.message}</div>
          <p className="mt-2 text-[11.5px] text-muted">
            Si l&apos;erreur mentionne &quot;unrecognised IP&quot;, va sur{" "}
            <a
              href="https://app.brevo.com/security/authorised_ips"
              target="_blank"
              rel="noreferrer"
              className="text-violet hover:underline"
            >
              app.brevo.com/security/authorised_ips
            </a>{" "}
            et désactive la restriction d&apos;IP (les IPs Railway changent à chaque redeploy).
          </p>
        </div>
      )}

      {!loading && account?.ok && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <InfoCell label="Compte" value={account.email} mono />
          <InfoCell
            label="Société"
            value={account.companyName || `${account.firstName ?? ""} ${account.lastName ?? ""}`.trim() || "—"}
          />
          <InfoCell
            label="Crédits SMS"
            value={account.smsCreditsLeft != null ? account.smsCreditsLeft.toLocaleString("fr-FR") : "—"}
            tone={
              account.smsCreditsLeft == null
                ? "muted"
                : account.smsCreditsLeft > 50
                  ? "emerald"
                  : account.smsCreditsLeft > 0
                    ? "amber"
                    : "pink"
            }
          />
          <InfoCell
            label="Crédits Email"
            value={account.emailCreditsLeft != null ? account.emailCreditsLeft.toLocaleString("fr-FR") : "—"}
            tone={
              account.emailCreditsLeft == null
                ? "muted"
                : account.emailCreditsLeft > 500
                  ? "emerald"
                  : "amber"
            }
          />
        </div>
      )}
    </Card>
  );
}

function InfoCell({
  label,
  value,
  tone,
  mono,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "amber" | "pink" | "muted";
  mono?: boolean;
}) {
  const color =
    tone === "emerald"
      ? "text-emerald"
      : tone === "amber"
        ? "text-amber"
        : tone === "pink"
          ? "text-pink"
          : "text-ink";
  return (
    <div className="rounded-lg border border-line p-3 bg-canvas-2/30">
      <p className="text-[10.5px] text-muted-2 font-semibold uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-[14px] font-semibold tabular-nums ${color} ${mono ? "font-mono text-[12px]" : ""}`}>
        {value}
      </p>
    </div>
  );
}

/* ============================== SMS TEST ============================== */

function SmsTestCard({
  templates,
  brevoConfigured,
  onSent,
}: {
  templates: SmsTemplate[];
  brevoConfigured: boolean;
  onSent: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [templateKey, setTemplateKey] = useState<string>(templates[0]?.key ?? "");
  const [body, setBody] = useState<string>(templates[0]?.body ?? "");
  const [sender, setSender] = useState<string>(templates[0]?.sender ?? "");
  const [phone, setPhone] = useState<string>("+33");
  const [vars, setVars] = useState<Record<string, string>>({ ...DEMO_VARS });
  const [showPreview, setShowPreview] = useState(true);
  const [result, setResult] = useState<
    | { ok: true; messageId: string; bodyInterpolated: string }
    | { ok: false; message: string }
    | null
  >(null);

  const detectedVars = useMemo(() => extractVarNames(body), [body]);
  const interpolatedBody = useMemo(() => interpolate(body, vars), [body, vars]);

  // Sync body/sender when template changes
  useEffect(() => {
    const t = templates.find((x) => x.key === templateKey);
    if (t) {
      setBody(t.body);
      setSender(t.sender ?? "");
    }
  }, [templateKey, templates]);

  const submit = () => {
    setResult(null);
    startTransition(async () => {
      const r = await sendCustomSmsAction({
        phone,
        body,
        sender: sender || undefined,
        templateKey: templateKey || null,
        vars,
      });
      setResult(r);
      onSent();
    });
  };

  const copyInterpolated = () => {
    navigator.clipboard.writeText(interpolatedBody);
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <ColorChip tone="violet" size="md">
          <MessageSquare className="h-4 w-4" strokeWidth={2.2} />
        </ColorChip>
        <div>
          <p className="text-[14px] font-semibold text-ink">Test envoi SMS</p>
          <p className="text-[11.5px] text-muted">
            Choisis un template ou compose librement. Toutes les variables sont éditables et le rendu est aperçu en direct.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* LEFT — form */}
        <div className="space-y-3 min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-2">
            <label className="block">
              <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
                Template
              </span>
              <select
                value={templateKey}
                onChange={(e) => setTemplateKey(e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">— Message libre —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.key}>
                    {t.label} ({t.key})
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
                Expéditeur (3-11)
              </span>
              <input
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                placeholder={`Défaut : ${DEFAULT_SENDER}`}
                maxLength={11}
                className={INPUT_CLASS}
              />
            </label>
          </div>

          <label className="block">
            <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
              Corps du SMS
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className={TEXTAREA_CLASS}
              placeholder="Bonjour {{prenom}}, ..."
            />
            <div className="flex items-center justify-between mt-1.5 text-[10.5px] text-muted-2">
              <span>
                {body.length} caractères · {Math.ceil(body.length / 160) || 1} SMS facturé(s)
              </span>
              {detectedVars.length > 0 && (
                <span>
                  Variables détectées :{" "}
                  {detectedVars.map((v) => (
                    <span key={v} className="font-mono mr-1">{`{{${v}}}`}</span>
                  ))}
                </span>
              )}
            </div>
          </label>

          {detectedVars.length > 0 && (
            <div className="rounded-lg border border-line bg-canvas-2/30 p-3">
              <p className="text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-2">
                Valeurs des variables
              </p>
              <div className="grid grid-cols-2 gap-2">
                {detectedVars.map((v) => (
                  <label key={v} className="block">
                    <span className="block text-[10.5px] text-muted font-mono mb-0.5">{`{{${v}}}`}</span>
                    <input
                      value={vars[v] ?? ""}
                      onChange={(e) => setVars({ ...vars, [v]: e.target.value })}
                      className={INPUT_CLASS}
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          <label className="block">
            <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
              Destinataire (E.164)
            </span>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2" />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+33612345678"
                  className={`${INPUT_CLASS} pl-9 font-mono tabular-nums`}
                />
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={submit}
                disabled={pending || !body.trim() || !phone.trim()}
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" strokeWidth={2.4} />
                )}
                Envoyer
              </Button>
            </div>
          </label>

          {!brevoConfigured && (
            <div className="rounded-lg bg-amber-soft border border-amber/20 p-2.5 text-[11.5px] text-ink-2">
              ⚠ Brevo non configuré — l&apos;envoi sera marqué <span className="font-mono">skipped</span> dans le log.
            </div>
          )}

          {result && (
            <div
              className={
                "rounded-lg p-3 border " +
                (result.ok
                  ? "bg-emerald-soft border-emerald/20"
                  : "bg-pink-soft border-pink/20")
              }
            >
              <div className="flex items-start gap-2">
                {result.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald shrink-0 mt-0.5" strokeWidth={2.4} />
                ) : (
                  <AlertCircle className="h-4 w-4 text-pink shrink-0 mt-0.5" strokeWidth={2.4} />
                )}
                <div className="flex-1 min-w-0">
                  <p className={"text-[12.5px] font-semibold " + (result.ok ? "text-emerald" : "text-pink")}>
                    {result.ok ? "SMS envoyé" : "Échec envoi"}
                  </p>
                  {result.ok ? (
                    <p className="text-[11.5px] text-ink-2 mt-1">
                      Message ID Brevo :{" "}
                      <span className="font-mono">{result.messageId || "(vide)"}</span>
                    </p>
                  ) : (
                    <p className="text-[11.5px] text-pink mt-1 font-mono break-all">
                      {result.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-2 font-semibold uppercase tracking-wider">
              Aperçu (rendu final)
            </p>
            <button
              onClick={() => setShowPreview((v) => !v)}
              className="text-[11px] text-muted hover:text-ink inline-flex items-center gap-1"
            >
              {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {showPreview ? "Masquer" : "Afficher"}
            </button>
          </div>
          {showPreview && (
            <div className="rounded-2xl bg-canvas-2/60 border border-line p-3.5">
              <div className="flex items-center justify-between text-[10.5px] text-muted-2 mb-2">
                <span className="font-mono font-semibold text-ink">{sender || DEFAULT_SENDER}</span>
                <span>Maintenant</span>
              </div>
              <div className="rounded-2xl bg-white p-3 text-[12.5px] text-ink leading-relaxed whitespace-pre-wrap shadow-sm">
                {interpolatedBody || (
                  <span className="text-muted-2 italic">Le corps du SMS apparaîtra ici…</span>
                )}
              </div>
              <div className="flex items-center justify-between mt-2 text-[10.5px] text-muted-2">
                <span>
                  {interpolatedBody.length} car. · {Math.ceil(interpolatedBody.length / 160) || 1}{" "}
                  SMS
                </span>
                {interpolatedBody && (
                  <button
                    onClick={copyInterpolated}
                    className="inline-flex items-center gap-1 hover:text-ink"
                  >
                    <Copy className="h-3 w-3" /> Copier
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ============================ RECENT LOG ============================== */

function RecentSmsLogCard({
  rows,
  loading,
}: {
  rows: SmsLogWithMeta[];
  loading: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-line">
        <div className="flex items-center gap-3">
          <ColorChip tone="blue" size="md">
            <Inbox className="h-4 w-4" strokeWidth={2.2} />
          </ColorChip>
          <div>
            <p className="text-[14px] font-semibold text-ink">
              Historique SMS récents
              {rows.length > 0 && (
                <span className="ml-2 text-muted-2 font-semibold text-[12px]">{rows.length}</span>
              )}
            </p>
            <p className="text-[11.5px] text-muted">
              Les 20 derniers envois (table <span className="font-mono">sms_log</span>).
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="px-5 py-10 text-center text-[12.5px] text-muted-2">
          <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
          Chargement…
        </div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-10 text-center text-[12.5px] text-muted-2">
          Aucun SMS envoyé pour le moment.
        </div>
      ) : (
        <div className="divide-y divide-line">
          {rows.map((r) => (
            <LogRow key={r.id} row={r} />
          ))}
        </div>
      )}
    </Card>
  );
}

function statusTone(s: string): "emerald" | "amber" | "pink" | "muted" {
  if (s === "sent" || s === "delivered") return "emerald";
  if (s === "pending") return "amber";
  if (s === "failed" || s === "bounced") return "pink";
  return "muted";
}

function statusLabel(s: string): string {
  switch (s) {
    case "sent":
      return "Envoyé";
    case "delivered":
      return "Délivré";
    case "pending":
      return "En cours";
    case "failed":
      return "Échec";
    case "bounced":
      return "Bounce";
    case "skipped":
      return "Skip (no Brevo)";
    default:
      return s;
  }
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.round(h / 24);
  return `il y a ${d}j`;
}

function LogRow({ row }: { row: SmsLogWithMeta }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="px-5 py-3">
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <StatusPill tone={statusTone(row.status)}>{statusLabel(row.status)}</StatusPill>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-[12.5px]">
            <span className="font-mono font-semibold text-ink tabular-nums">{row.to_phone}</span>
            {row.client_name && <span className="text-muted">· {row.client_name}</span>}
            {row.template_label && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-canvas-2 text-[10.5px] text-muted-2">
                <Mail className="h-2.5 w-2.5" /> {row.template_label}
              </span>
            )}
          </div>
          <p className="text-[12px] text-ink-2 mt-1 line-clamp-2 font-mono">{row.body}</p>
          {row.error && (
            <p className="text-[11.5px] text-pink mt-1 font-mono break-all">
              ⚠ {row.error}
            </p>
          )}
          {expanded && (
            <div className="mt-2 rounded-md bg-canvas-2/40 p-2.5 text-[11.5px] text-muted space-y-0.5">
              <p>
                Brevo ID :{" "}
                <span className="font-mono text-ink-2">{row.brevo_message_id || "—"}</span>
              </p>
              <p>
                Status :{" "}
                <span className="font-mono text-ink-2">{row.status}</span>
              </p>
              <p>
                Envoyé :{" "}
                <span className="font-mono text-ink-2">
                  {row.sent_at ? new Date(row.sent_at).toLocaleString("fr-FR") : "—"}
                </span>
              </p>
              <p>
                Body complet :{" "}
                <span className="font-mono text-ink-2 whitespace-pre-wrap">{row.body}</span>
              </p>
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] text-muted-2 tabular-nums">{relativeTime(row.created_at)}</p>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-[11px] text-muted hover:text-ink"
          >
            {expanded ? "Réduire" : "Détails"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================== EMAIL TEST ============================== */

function EmailTestCard({
  templates,
  brevoConfigured,
  onSent,
}: {
  templates: EmailTemplate[];
  brevoConfigured: boolean;
  onSent: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [templateId, setTemplateId] = useState<string>(templates[0]?.id ?? "");
  const initial = templates[0];
  const [subject, setSubject] = useState<string>(initial?.subject ?? "");
  const [htmlBody, setHtmlBody] = useState<string>(initial?.html_body ?? "");
  const [toEmail, setToEmail] = useState<string>("");
  const [toName, setToName] = useState<string>("");
  const [vars, setVars] = useState<Record<string, string>>({
    prenom: "Hélène",
    nom: "Larochelle",
    numero_devis: "DEV-2026-0042",
    produit: "Rideau salon",
    total_ttc: "980",
    acompte: "490",
    date: "lundi 26 mai",
    heure: "10h",
    poseur: "Romain",
    lien_pdf: "https://atmospheretissus.fr/d/abc",
    lien_avis: "https://g.page/atmospheretissus/review",
  });
  const [result, setResult] = useState<
    | { ok: true; messageId: string; subject: string; bodyHtml: string }
    | { ok: false; message: string }
    | null
  >(null);

  // Sync when template changes
  useEffect(() => {
    const t = templates.find((x) => x.id === templateId);
    if (t) {
      setSubject(t.subject);
      setHtmlBody(t.html_body);
    }
  }, [templateId, templates]);

  const detectedVars = useMemo(() => {
    const m = new Set<string>();
    for (const text of [subject, htmlBody]) {
      const matches = text.matchAll(/\{\{(\w+)\}\}/g);
      for (const x of matches) m.add(x[1]);
    }
    return Array.from(m);
  }, [subject, htmlBody]);

  const interpolatedSubject = useMemo(
    () => subject.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? ""),
    [subject, vars],
  );
  const interpolatedHtml = useMemo(
    () => htmlBody.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? ""),
    [htmlBody, vars],
  );

  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null;

  const submit = () => {
    setResult(null);
    startTransition(async () => {
      const r = await sendCustomEmailAction({
        toEmail,
        toName: toName || undefined,
        subject,
        htmlBody,
        templateKey: selectedTemplate?.key ?? null,
        vars,
      });
      setResult(r);
      onSent();
    });
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <ColorChip tone="violet" size="md">
          <Mail className="h-4 w-4" strokeWidth={2.2} />
        </ColorChip>
        <div>
          <p className="text-[14px] font-semibold text-ink">Test envoi email</p>
          <p className="text-[11.5px] text-muted">
            Choisis un template, édite sujet et corps HTML, prévisualise et envoie un vrai email Brevo.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-3 min-w-0">
          <label className="block">
            <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
              Template
            </span>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">— Message libre —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
              Sujet
            </span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={INPUT_CLASS}
            />
          </label>

          <label className="block">
            <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
              Corps HTML
            </span>
            <textarea
              value={htmlBody}
              onChange={(e) => setHtmlBody(e.target.value)}
              rows={8}
              className={TEXTAREA_CLASS}
            />
          </label>

          {detectedVars.length > 0 && (
            <div className="rounded-lg border border-line bg-canvas-2/30 p-3">
              <p className="text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-2">
                Variables détectées
              </p>
              <div className="grid grid-cols-2 gap-2">
                {detectedVars.map((v) => (
                  <label key={v} className="block">
                    <span className="block text-[10.5px] text-muted font-mono mb-0.5">{`{{${v}}}`}</span>
                    <input
                      value={vars[v] ?? ""}
                      onChange={(e) => setVars({ ...vars, [v]: e.target.value })}
                      className={INPUT_CLASS}
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-2">
            <label className="block">
              <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
                Destinataire · email
              </span>
              <input
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="client@exemple.fr"
                className={INPUT_CLASS}
              />
            </label>
            <label className="block">
              <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
                Nom (option.)
              </span>
              <input
                value={toName}
                onChange={(e) => setToName(e.target.value)}
                className={INPUT_CLASS}
              />
            </label>
          </div>

          <div className="flex items-center justify-end">
            <Button
              variant="primary"
              size="md"
              onClick={submit}
              disabled={pending || !subject.trim() || !htmlBody.trim() || !toEmail.trim()}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" strokeWidth={2.4} />
              )}
              Envoyer l&apos;email
            </Button>
          </div>

          {!brevoConfigured && (
            <div className="rounded-lg bg-amber-soft border border-amber/20 p-2.5 text-[11.5px] text-ink-2">
              ⚠ Brevo non configuré — l&apos;envoi sera marqué <span className="font-mono">skipped</span> dans le log.
            </div>
          )}

          {result && (
            <div
              className={
                "rounded-lg p-3 border " +
                (result.ok ? "bg-emerald-soft border-emerald/20" : "bg-pink-soft border-pink/20")
              }
            >
              <div className="flex items-start gap-2">
                {result.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald shrink-0 mt-0.5" strokeWidth={2.4} />
                ) : (
                  <AlertCircle className="h-4 w-4 text-pink shrink-0 mt-0.5" strokeWidth={2.4} />
                )}
                <div className="flex-1 min-w-0">
                  <p className={"text-[12.5px] font-semibold " + (result.ok ? "text-emerald" : "text-pink")}>
                    {result.ok ? "Email envoyé" : "Échec envoi"}
                  </p>
                  {result.ok ? (
                    <p className="text-[11.5px] text-ink-2 mt-1">
                      Message ID Brevo : <span className="font-mono">{result.messageId || "(vide)"}</span>
                    </p>
                  ) : (
                    <p className="text-[11.5px] text-pink mt-1 font-mono break-all">{result.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview right column */}
        <div className="space-y-2">
          <p className="text-[11px] text-muted-2 font-semibold uppercase tracking-wider">
            Aperçu (rendu HTML final)
          </p>
          <div className="rounded-2xl border border-line bg-canvas-2/40 overflow-hidden">
            <div className="px-3 py-2 bg-white border-b border-line">
              <p className="text-[10.5px] text-muted-2">Sujet</p>
              <p className="text-[12.5px] font-semibold text-ink">
                {interpolatedSubject || (
                  <span className="text-muted-2 italic">(vide)</span>
                )}
              </p>
            </div>
            <div className="bg-white p-3 max-h-[400px] overflow-auto">
              <div
                className="text-[12.5px] text-ink leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html:
                    interpolatedHtml ||
                    "<p style='color: #9ca3af; font-style: italic;'>(corps vide)</p>",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ============================ EMAIL LOG ============================== */

function RecentEmailLogCard({
  rows,
  loading,
}: {
  rows: EmailLogWithMeta[];
  loading: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-line">
        <div className="flex items-center gap-3">
          <ColorChip tone="blue" size="md">
            <Inbox className="h-4 w-4" strokeWidth={2.2} />
          </ColorChip>
          <div>
            <p className="text-[14px] font-semibold text-ink">
              Historique emails récents
              {rows.length > 0 && (
                <span className="ml-2 text-muted-2 font-semibold text-[12px]">{rows.length}</span>
              )}
            </p>
            <p className="text-[11.5px] text-muted">
              Les 20 derniers envois (table <span className="font-mono">email_log</span>).
            </p>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="px-5 py-10 text-center text-[12.5px] text-muted-2">
          <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" /> Chargement…
        </div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-10 text-center text-[12.5px] text-muted-2">
          Aucun email envoyé pour le moment.
        </div>
      ) : (
        <div className="divide-y divide-line">
          {rows.map((r) => (
            <EmailLogRow key={r.id} row={r} />
          ))}
        </div>
      )}
    </Card>
  );
}

function EmailLogRow({ row }: { row: EmailLogWithMeta }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="px-5 py-3">
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <StatusPill tone={statusTone(row.status)}>{statusLabel(row.status)}</StatusPill>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-[12.5px]">
            <span className="font-mono font-semibold text-ink truncate">{row.to_email}</span>
            {row.client_name && <span className="text-muted">· {row.client_name}</span>}
            {row.template_label && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-canvas-2 text-[10.5px] text-muted-2">
                <Mail className="h-2.5 w-2.5" /> {row.template_label}
              </span>
            )}
          </div>
          <p className="text-[12px] text-ink-2 mt-1 truncate font-medium">{row.subject}</p>
          {row.error && (
            <p className="text-[11.5px] text-pink mt-1 font-mono break-all">⚠ {row.error}</p>
          )}
          {expanded && (
            <div className="mt-2 rounded-md bg-canvas-2/40 p-2.5 text-[11.5px] text-muted space-y-1">
              <p>Brevo ID : <span className="font-mono text-ink-2">{row.brevo_message_id || "—"}</span></p>
              <p>Status : <span className="font-mono text-ink-2">{row.status}</span></p>
              <p>Envoyé : <span className="font-mono text-ink-2">{row.sent_at ? new Date(row.sent_at).toLocaleString("fr-FR") : "—"}</span></p>
              <div className="mt-2 rounded bg-white border border-line p-2">
                <p className="text-[10.5px] text-muted-2 mb-1">Corps HTML</p>
                <div
                  className="text-[11.5px] text-ink leading-relaxed max-h-48 overflow-auto"
                  dangerouslySetInnerHTML={{ __html: row.body_html }}
                />
              </div>
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] text-muted-2 tabular-nums">{relativeTime(row.created_at)}</p>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-[11px] text-muted hover:text-ink"
          >
            {expanded ? "Réduire" : "Détails"}
          </button>
        </div>
      </div>
    </div>
  );
}
