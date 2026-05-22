"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  ExternalLink,
  Inbox,
  FileText,
  CreditCard,
  Scissors,
  Wrench,
  PackageSearch,
  Receipt,
  MessageSquare,
  Mail,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Search,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import type { FeedEvent, FeedCategory, FeedSeverity } from "@/lib/db/activity-feed";

const CATEGORY_LABELS: Record<FeedCategory, string> = {
  lead: "Leads",
  devis: "Devis",
  payment: "Paiements",
  reception: "Réception",
  pose: "Poses",
  bc: "Commandes",
  caisse: "Caisse",
  sms: "SMS",
  email: "Email",
};

const CATEGORY_ICONS: Record<FeedCategory, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  lead: Inbox,
  devis: FileText,
  payment: CreditCard,
  reception: PackageSearch,
  pose: Wrench,
  bc: Scissors,
  caisse: Receipt,
  sms: MessageSquare,
  email: Mail,
};

const CATEGORY_TONES: Record<
  FeedCategory,
  "orange" | "pink" | "emerald" | "blue" | "violet" | "amber" | "yellow" | "muted"
> = {
  lead: "orange",
  devis: "pink",
  payment: "emerald",
  reception: "blue",
  pose: "violet",
  bc: "amber",
  caisse: "yellow",
  sms: "muted",
  email: "blue",
};

const CATEGORY_BG: Record<FeedCategory, string> = {
  lead: "bg-orange-soft text-orange",
  devis: "bg-pink-soft text-pink",
  payment: "bg-emerald-soft text-emerald",
  reception: "bg-blue-soft text-blue",
  pose: "bg-violet-soft text-violet",
  bc: "bg-amber-soft text-amber",
  caisse: "bg-yellow-soft text-yellow",
  sms: "bg-canvas-2 text-ink-2",
  email: "bg-blue-soft text-blue",
};

const SEVERITY_ICONS: Record<FeedSeverity, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  ok: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
};

const SEVERITY_COLORS: Record<FeedSeverity, string> = {
  ok: "text-emerald",
  info: "text-blue",
  warning: "text-amber",
  error: "text-pink",
};

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "à venir";
  const s = Math.round(ms / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `il y a ${d}j`;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(iso));
}

function fullDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as FeedCategory[];

export default function FeedClient({ events }: { events: FeedEvent[] }) {
  const [filterCats, setFilterCats] = useState<Set<FeedCategory>>(new Set(ALL_CATEGORIES));
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return events.filter((e) => {
      if (!filterCats.has(e.category)) return false;
      if (q && !`${e.label} ${e.description ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [events, filterCats, query]);

  const toggleCat = (c: FeedCategory) => {
    const n = new Set(filterCats);
    if (n.has(c)) n.delete(c);
    else n.add(c);
    if (n.size === 0) {
      setFilterCats(new Set(ALL_CATEGORIES));
      return;
    }
    setFilterCats(n);
  };

  const onlyOne = (c: FeedCategory) => setFilterCats(new Set([c]));
  const showAll = () => setFilterCats(new Set(ALL_CATEGORIES));

  // Group by day
  const byDay = useMemo(() => {
    const map = new Map<string, FeedEvent[]>();
    for (const e of filtered) {
      const day = new Date(e.occurredAt).toISOString().slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const counts = useMemo(() => {
    const m: Record<FeedCategory, number> = {} as Record<FeedCategory, number>;
    for (const c of ALL_CATEGORIES) m[c] = 0;
    for (const e of events) m[e.category] += 1;
    return m;
  }, [events]);

  return (
    <>
      <Topbar breadcrumb={[{ label: "Atmosphère" }, { label: "Activité" }]} />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Observabilité</p>
          <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1] mb-2">
            Activité
            <span className="ml-3 text-[24px] text-muted-2 font-semibold tabular-nums">
              {events.length}
            </span>
          </h1>
          <p className="text-[13.5px] text-muted max-w-2xl">
            Historique unifié de tous les événements : leads, devis, paiements, réceptions, poses,
            BC, ventes caisse, SMS et emails. Clique sur un événement pour voir les détails.
          </p>
        </section>

        {/* Filters */}
        <section className="px-8 pb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <nav className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={showAll}
                className={
                  "h-8 px-3 rounded-full text-[12.5px] font-medium transition-all flex items-center gap-1.5 " +
                  (filterCats.size === ALL_CATEGORIES.length
                    ? "bg-ink text-white"
                    : "bg-white text-muted hover:text-ink border border-line")
                }
              >
                Tout
                <span
                  className={
                    "text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums " +
                    (filterCats.size === ALL_CATEGORIES.length
                      ? "bg-white/15 text-white/90"
                      : "bg-canvas-2 text-muted")
                  }
                >
                  {events.length}
                </span>
              </button>
              {ALL_CATEGORIES.map((c) => {
                const Icon = CATEGORY_ICONS[c];
                const active = filterCats.has(c) && filterCats.size < ALL_CATEGORIES.length;
                return (
                  <button
                    key={c}
                    onClick={() => toggleCat(c)}
                    onDoubleClick={() => onlyOne(c)}
                    title="Cliquer pour ajouter/retirer · double-clic pour isoler"
                    className={
                      "h-8 px-3 rounded-full text-[12.5px] font-medium transition-all flex items-center gap-1.5 " +
                      (active
                        ? "bg-ink text-white"
                        : filterCats.has(c)
                          ? "bg-white text-ink border border-line-strong"
                          : "bg-white text-muted hover:text-ink border border-line opacity-50")
                    }
                  >
                    <Icon className="h-3 w-3" strokeWidth={2.2} />
                    {CATEGORY_LABELS[c]}
                    <span
                      className={
                        "text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums " +
                        (active ? "bg-white/15 text-white/90" : "bg-canvas-2 text-muted")
                      }
                    >
                      {counts[c]}
                    </span>
                  </button>
                );
              })}
            </nav>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2" strokeWidth={2.2} />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher…"
                className="pl-9 w-64 text-[12.5px] rounded-full bg-white"
              />
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="px-8 pb-10">
          {byDay.length === 0 ? (
            <Card className="py-16 px-6 text-center">
              <Activity className="h-8 w-8 text-muted-2 mx-auto mb-3" />
              <p className="text-[13px] text-muted">Aucun événement à afficher.</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {byDay.map(([day, dayEvents]) => (
                <div key={day}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <p className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-2">
                      {formatDay(day)}
                    </p>
                    <span className="text-[10.5px] text-muted-2 tabular-nums">
                      {dayEvents.length} évén.
                    </span>
                  </div>
                  <Card className="overflow-hidden">
                    <div className="divide-y divide-line">
                      {dayEvents.map((event) => (
                        <EventRow
                          key={event.id}
                          event={event}
                          expanded={expandedId === event.id}
                          onToggle={() =>
                            setExpandedId(expandedId === event.id ? null : event.id)
                          }
                        />
                      ))}
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function formatDay(day: string): string {
  const d = new Date(day);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (day === today) return "Aujourd'hui";
  if (day === yesterday) return "Hier";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  }).format(d);
}

function EventRow({
  event,
  expanded,
  onToggle,
}: {
  event: FeedEvent;
  expanded: boolean;
  onToggle: () => void;
}) {
  const CatIcon = CATEGORY_ICONS[event.category];
  const SeverityIcon = SEVERITY_ICONS[event.severity];
  return (
    <div className="hover:bg-canvas-2/30 transition-colors">
      <button onClick={onToggle} className="w-full text-left px-4 py-3 flex items-start gap-3">
        <div className={`shrink-0 h-7 w-7 rounded-lg inline-flex items-center justify-center ${CATEGORY_BG[event.category]}`}>
          <CatIcon className="h-3.5 w-3.5" strokeWidth={2.4} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[13px] font-semibold text-ink leading-tight">{event.label}</p>
            <SeverityIcon className={`h-3 w-3 ${SEVERITY_COLORS[event.severity]} shrink-0`} strokeWidth={2.4} />
            <StatusPill tone={CATEGORY_TONES[event.category]} dot={false}>
              {CATEGORY_LABELS[event.category]}
            </StatusPill>
          </div>
          {event.description && (
            <p className="text-[12px] text-muted mt-0.5 truncate">{event.description}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] text-muted-2 tabular-nums" title={fullDate(event.occurredAt)}>
            {relativeTime(event.occurredAt)}
          </p>
          <p className="text-[10.5px] text-muted-2 mt-0.5">
            {expanded ? "Réduire" : "Détails"}
          </p>
        </div>
      </button>

      {expanded && <EventDetails event={event} />}
    </div>
  );
}

function EventDetails({ event }: { event: FeedEvent }) {
  const isSms = event.category === "sms";
  const isEmail = event.category === "email";
  return (
    <div className="px-4 pb-4 pt-1 ml-10 space-y-3">
      <div className="rounded-lg border border-line bg-white p-3 text-[12px] text-ink-2 space-y-1">
        <Row label="Date complète" value={fullDate(event.occurredAt)} />
        <Row label="Catégorie" value={CATEGORY_LABELS[event.category]} />
        <Row label="Type" value={event.kind} mono />
        {event.link && (
          <Row
            label="Lien"
            value={
              <Link href={event.link} className="text-violet hover:underline inline-flex items-center gap-1">
                Ouvrir la page liée <ExternalLink className="h-3 w-3" />
              </Link>
            }
          />
        )}
      </div>

      {(isSms || isEmail) && <CommunicationDetails event={event} />}

      {!isSms && !isEmail && Object.keys(event.details).length > 0 && (
        <div className="rounded-lg border border-line bg-canvas-2/40 p-3">
          <p className="text-[10.5px] text-muted-2 uppercase tracking-wider mb-1.5 font-semibold">
            Détails techniques
          </p>
          <pre className="text-[11px] font-mono text-ink-2 whitespace-pre-wrap break-all">
            {JSON.stringify(event.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function CommunicationDetails({ event }: { event: FeedEvent }) {
  const d = event.details;
  const isSms = event.category === "sms";
  const status = String(d.status ?? "?");
  const statusTone =
    status === "sent" || status === "delivered" ? "emerald"
    : status === "pending" ? "amber"
    : status === "failed" || status === "bounced" ? "pink"
    : "muted";

  return (
    <div className="rounded-lg border border-line bg-white overflow-hidden">
      <div className="px-3 py-2 bg-canvas-2/40 border-b border-line flex items-center gap-2 flex-wrap">
        <StatusPill tone={statusTone}>{status}</StatusPill>
        {d.event_key != null ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-soft text-violet text-[10.5px] font-semibold">
            Événement : <span className="font-mono">{String(d.event_key)}</span>
          </span>
        ) : null}
        {d.trigger_source_human != null ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-soft text-blue text-[10.5px] font-semibold">
            Source : {String(d.trigger_source_human)}
          </span>
        ) : null}
        {d.template_key != null ? (
          <span className="text-[11px] text-muted">
            Template : <span className="font-mono text-ink-2">{String(d.template_key)}</span>
          </span>
        ) : null}
        {d.brevo_message_id != null ? (
          <span className="text-[11px] text-muted">
            Brevo ID : <span className="font-mono text-ink-2">{String(d.brevo_message_id)}</span>
          </span>
        ) : null}
      </div>
      <div className="px-3 py-2.5 space-y-1 text-[12px] text-ink-2">
        {isSms ? (
          <>
            <Row label="Numéro" value={<span className="font-mono tabular-nums">{(event.label.match(/\+\d+/) ?? [""])[0]}</span>} />
            {d.client_id ? <Row label="Client lié" value={<span className="font-mono">{String(d.client_id).slice(0, 8)}…</span>} /> : null}
            {d.sent_at ? <Row label="Envoyé le" value={<span className="tabular-nums">{fullDate(String(d.sent_at))}</span>} /> : null}
            <div className="pt-1.5">
              <p className="text-[10.5px] text-muted-2 uppercase tracking-wider mb-1 font-semibold">
                Corps du SMS
              </p>
              <p className="font-mono text-[11.5px] text-ink whitespace-pre-wrap bg-canvas-2/40 p-2 rounded">
                {String(d.body ?? "")}
              </p>
            </div>
          </>
        ) : (
          <>
            {d.subject ? <Row label="Sujet" value={String(d.subject)} /> : null}
            {d.client_id ? <Row label="Client lié" value={<span className="font-mono">{String(d.client_id).slice(0, 8)}…</span>} /> : null}
            {d.sent_at ? <Row label="Envoyé le" value={<span className="tabular-nums">{fullDate(String(d.sent_at))}</span>} /> : null}
            {d.body_html && (
              <div className="pt-1.5">
                <p className="text-[10.5px] text-muted-2 uppercase tracking-wider mb-1 font-semibold">
                  Aperçu HTML rendu
                </p>
                <div
                  className="text-[12px] text-ink bg-canvas-2/40 p-3 rounded leading-relaxed max-h-64 overflow-auto"
                  dangerouslySetInnerHTML={{ __html: String(d.body_html) }}
                />
              </div>
            )}
          </>
        )}
        {d.error ? (
          <div className="pt-1.5">
            <p className="text-[10.5px] text-pink uppercase tracking-wider mb-1 font-semibold">
              Erreur Brevo
            </p>
            <p className="font-mono text-[11.5px] text-pink whitespace-pre-wrap bg-pink-soft/40 p-2 rounded border border-pink/20">
              {String(d.error)}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11.5px]">
      <span className="text-muted-2">{label}</span>
      <span className={mono ? "font-mono text-ink-2" : "text-ink-2 text-right"}>{value}</span>
    </div>
  );
}
