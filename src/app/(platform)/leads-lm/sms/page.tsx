import Link from "next/link";
import {
  MessageSquare,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Users,
  Clock,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { ColorChip, StatusPill } from "@/components/ui/status-pill";
import { Pagination } from "@/components/ui/pagination";
import { AtmoleadTabs } from "@/components/lm-leads/atmolead-tabs";
import { listLmSmsLog, getLmSmsStats, type LmSmsRow } from "@/lib/db/lm-sms-log";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const FILTERS = [
  { key: "all", label: "Tous" },
  { key: "sent", label: "Envoyés" },
  { key: "skipped_duplicate", label: "Doublons évités" },
  { key: "failed", label: "Échecs" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function LmSmsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const status: FilterKey = (FILTERS.find((f) => f.key === params.status)?.key ??
    "all") as FilterKey;

  const [{ rows, total }, stats] = await Promise.all([
    listLmSmsLog({ page, pageSize: PAGE_SIZE, status }),
    getLmSmsStats(),
  ]);

  const sentTotal = stats.sent + stats.delivered;

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Atmoleads" },
          { label: "SMS envoyés" },
        ]}
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Communication leads LM</p>
          <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1] mb-2">
            SMS envoyés aux leads
            <span className="ml-3 text-[24px] text-muted-2 font-semibold tabular-nums">
              {stats.total}
            </span>
          </h1>
          <p className="text-[13.5px] text-muted max-w-2xl">
            Trace exhaustive des SMS déclenchés par l&apos;événement{" "}
            <code className="font-mono text-[12px] bg-canvas-2 px-1.5 py-0.5 rounded">lead_lm_received</code>.
            Chaque doublon évité (même numéro déjà contacté) est visible avec sa source d&apos;origine.
          </p>
        </section>

        <AtmoleadTabs />

        <section className="px-8 pt-6 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Kpi
              tone="emerald"
              icon={CheckCircle2}
              label="Envoyés"
              value={String(sentTotal)}
              sub={stats.delivered > 0 ? `dont ${stats.delivered} livrés` : "Brevo OK"}
            />
            <Kpi
              tone="amber"
              icon={ShieldCheck}
              label="Doublons évités"
              value={String(stats.skippedDuplicate)}
              sub="dédoublonnés"
            />
            <Kpi
              tone="pink"
              icon={XCircle}
              label="Échecs"
              value={String(stats.failed)}
              sub="Brevo refusé"
            />
            <Kpi
              tone="violet"
              icon={Users}
              label="Numéros uniques"
              value={String(stats.uniquePhones)}
              sub="clients distincts"
            />
            <Kpi
              tone="blue"
              icon={Clock}
              label="24h"
              value={String(stats.last24h)}
              sub="événements récents"
            />
          </div>
        </section>

        <section className="px-8 pt-2 pb-4 flex items-center gap-1.5 flex-wrap">
          {FILTERS.map((f) => {
            const active = status === f.key;
            const href =
              f.key === "all" ? "/leads-lm/sms" : `/leads-lm/sms?status=${f.key}`;
            return (
              <Link
                key={f.key}
                href={href}
                className={
                  "h-8 px-3 rounded-full text-[12.5px] font-medium transition-all " +
                  (active
                    ? "bg-ink text-white"
                    : "bg-white text-muted hover:text-ink border border-line")
                }
              >
                {f.label}
              </Link>
            );
          })}
        </section>

        <section className="px-8 pb-10">
          <Card className="overflow-hidden">
            {rows.length === 0 ? (
              <div className="px-10 py-16 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-canvas-2">
                  <MessageSquare className="h-5 w-5 text-muted" />
                </div>
                <p className="text-[14px] font-semibold text-ink mb-1">Aucun envoi à afficher</p>
                <p className="text-[13px] text-muted">Aucun SMS ne correspond à ce filtre pour le moment.</p>
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-canvas-2/40 border-b border-line">
                    <Th>Quand</Th>
                    <Th>Statut</Th>
                    <Th>Client</Th>
                    <Th>Numéro</Th>
                    <Th>Template</Th>
                    <Th>Source</Th>
                    <Th>Détail</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <SmsRow key={r.id} row={r} />
                  ))}
                </tbody>
              </table>
            )}
            <Pagination
              basePath="/leads-lm/sms"
              currentPage={page}
              totalCount={total}
              pageSize={PAGE_SIZE}
              itemNoun="envois"
              searchParams={status !== "all" ? { status } : undefined}
            />
          </Card>
        </section>
      </div>
    </>
  );
}

function SmsRow({ row: r }: { row: LmSmsRow }) {
  const isSent = r.status === "sent" || r.status === "delivered";
  const isDup = r.status === "skipped_duplicate";
  const isFailed = r.status === "failed" || r.status === "bounced";

  const tone = isSent ? "emerald" : isDup ? "amber" : isFailed ? "pink" : "muted";
  const label = isSent
    ? r.status === "delivered"
      ? "Livré"
      : "Envoyé"
    : isDup
      ? "Doublon évité"
      : isFailed
        ? "Échec"
        : r.status;

  const detail = isDup
    ? r.duplicate_of_sent_at
      ? `Déjà envoyé le ${fmtDateTime(r.duplicate_of_sent_at)}`
      : r.error ?? "Doublon"
    : isFailed
      ? r.error ?? "—"
      : r.brevo_message_id
        ? `msg ${r.brevo_message_id}`
        : "—";

  return (
    <tr className="border-b border-line last:border-0 hover:bg-canvas-2/30 transition-colors">
      <td className="px-4 py-3 text-[12.5px] text-ink-2 tabular-nums whitespace-nowrap">
        {fmtDateTime(r.sent_at ?? r.created_at)}
      </td>
      <td className="px-4 py-3">
        <StatusPill tone={tone} dot>
          {label}
        </StatusPill>
      </td>
      <td className="px-4 py-3 text-[13px] text-ink">
        {r.client_id ? (
          <Link href={`/clients/${r.client_id}`} className="hover:underline decoration-line-strong">
            {r.client_name ?? <span className="text-muted-2">Client supprimé</span>}
          </Link>
        ) : (
          <span className="text-muted-2">—</span>
        )}
        {r.client_city && (
          <span className="ml-2 text-[11.5px] text-muted-2">{r.client_city}</span>
        )}
      </td>
      <td className="px-4 py-3 font-mono text-[12px] text-ink-2 tabular-nums whitespace-nowrap">
        {r.to_phone}
      </td>
      <td className="px-4 py-3 text-[11.5px] text-muted">
        {r.template_key ? (
          <code className="font-mono text-[11.5px] bg-canvas-2 px-1.5 py-0.5 rounded">
            {r.template_key}
          </code>
        ) : (
          <span className="text-muted-2">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-[11.5px] text-muted">
        {r.trigger_source ?? <span className="text-muted-2">—</span>}
      </td>
      <td className="px-4 py-3 text-[11.5px] text-muted max-w-[260px] truncate" title={detail}>
        {detail}
      </td>
    </tr>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 text-left">
      {children}
    </th>
  );
}

function Kpi({
  tone,
  icon: Icon,
  label,
  value,
  sub,
}: {
  tone: "emerald" | "amber" | "pink" | "violet" | "blue";
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="px-5 py-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="eyebrow">{label}</div>
          <div className="mt-1.5 text-[24px] font-semibold tabular-nums tracking-tight text-ink">
            {value}
          </div>
          {sub && <div className="mt-1 text-[11.5px] text-muted">{sub}</div>}
        </div>
        <ColorChip tone={tone} size="md">
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </ColorChip>
      </div>
    </Card>
  );
}
