"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  CreditCard,
  Receipt,
  Wallet,
  ExternalLink,
  Search,
  Filter,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Input } from "@/components/ui/input";
import { eur } from "@/lib/formatters";
import type {
  UnifiedPayment,
  UnifiedPaymentMethod,
} from "@/lib/db/payments-feed";

const METHOD_META: Record<
  UnifiedPaymentMethod,
  { label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; tone: "emerald" | "violet" | "amber" | "blue" | "pink" | "muted"; bg: string }
> = {
  especes: {
    label: "Espèces",
    icon: Wallet,
    tone: "emerald",
    bg: "bg-emerald-soft text-emerald",
  },
  cb: {
    label: "Carte bancaire",
    icon: CreditCard,
    tone: "violet",
    bg: "bg-violet-soft text-violet",
  },
  cheque: {
    label: "Chèque",
    icon: Receipt,
    tone: "amber",
    bg: "bg-amber-soft text-amber",
  },
  virement: {
    label: "Virement",
    icon: Banknote,
    tone: "blue",
    bg: "bg-blue-soft text-blue",
  },
  stripe: {
    label: "Stripe",
    icon: CreditCard,
    tone: "pink",
    bg: "bg-pink-soft text-pink",
  },
  autre: {
    label: "Autre",
    icon: Receipt,
    tone: "muted",
    bg: "bg-canvas-2 text-muted",
  },
};

const KIND_LABEL: Record<string, string> = {
  acompte: "Acompte",
  solde: "Solde",
  vente: "Vente comptoir",
};

export function PaymentsTab({
  payments,
}: {
  payments: UnifiedPayment[];
}) {
  const [methodFilter, setMethodFilter] = useState<"all" | UnifiedPaymentMethod>(
    "all",
  );
  const [sourceFilter, setSourceFilter] = useState<"all" | "caisse" | "devis">(
    "all",
  );
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return payments.filter((p) => {
      if (methodFilter !== "all" && p.method !== methodFilter) return false;
      if (sourceFilter !== "all" && p.source !== sourceFilter) return false;
      if (query) {
        const hay = `${p.ref} ${p.client_name ?? ""} ${p.kind}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [payments, methodFilter, sourceFilter, q]);

  // Stats sur la sélection filtrée
  const stats = useMemo(() => {
    const byMethod: Partial<
      Record<UnifiedPaymentMethod, { count: number; total: number }>
    > = {};
    let total = 0;
    for (const p of filtered) {
      total += p.amount_ttc;
      const cur = byMethod[p.method] ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += p.amount_ttc;
      byMethod[p.method] = cur;
    }
    return { total, count: filtered.length, byMethod };
  }, [filtered]);

  const allMethods: Array<"all" | UnifiedPaymentMethod> = [
    "all",
    "especes",
    "cb",
    "cheque",
    "virement",
    "stripe",
  ];

  return (
    <div className="px-8 pb-12 space-y-6">
      {/* Stats globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <SummaryTile
          label="Total"
          value={eur(stats.total)}
          subtitle={`${stats.count} paiement${stats.count > 1 ? "s" : ""}`}
          tone="ink"
        />
        {(["especes", "cb", "cheque", "virement", "stripe"] as const).map((m) => {
          const meta = METHOD_META[m];
          const s = stats.byMethod[m];
          return (
            <SummaryTile
              key={m}
              label={meta.label}
              value={s ? eur(s.total) : eur(0)}
              subtitle={s ? `${s.count} paiement${s.count > 1 ? "s" : ""}` : "—"}
              icon={meta.icon}
              tone={meta.tone}
            />
          );
        })}
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2"
            strokeWidth={2.2}
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher (n° devis, ticket, client)…"
            className="pl-9 h-9"
          />
        </div>
        <FilterGroup
          label="Mode"
          options={allMethods.map((m) =>
            m === "all" ? { value: "all", label: "Tous" } : { value: m, label: METHOD_META[m].label },
          )}
          value={methodFilter}
          onChange={(v) => setMethodFilter(v as "all" | UnifiedPaymentMethod)}
        />
        <FilterGroup
          label="Source"
          options={[
            { value: "all", label: "Toutes" },
            { value: "caisse", label: "Caisse" },
            { value: "devis", label: "Devis" },
          ]}
          value={sourceFilter}
          onChange={(v) => setSourceFilter(v as "all" | "caisse" | "devis")}
        />
      </div>

      {/* Liste */}
      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Filter className="h-8 w-8 text-muted-2 mx-auto mb-2" strokeWidth={1.8} />
            <p className="text-[13px] text-muted">Aucun paiement avec ces filtres.</p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-canvas-2/40 border-b border-line text-left">
                <th className="px-5 py-2.5 eyebrow">Date</th>
                <th className="px-3 py-2.5 eyebrow">Type</th>
                <th className="px-3 py-2.5 eyebrow">Mode</th>
                <th className="px-3 py-2.5 eyebrow">Client</th>
                <th className="px-3 py-2.5 eyebrow">Référence</th>
                <th className="px-5 py-2.5 eyebrow text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const meta = METHOD_META[p.method];
                const Icon = meta.icon;
                return (
                  <tr
                    key={p.id}
                    className="border-b border-line/60 last:border-0 hover:bg-canvas-2/30"
                  >
                    <td className="px-5 py-3 tabular-nums whitespace-nowrap">
                      <div className="text-[12.5px] text-ink-2">
                        {new Date(p.paid_at).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                        })}
                      </div>
                      <div className="text-[11px] text-muted-2 font-mono">
                        {new Date(p.paid_at).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill
                        tone={p.source === "caisse" ? "yellow" : "blue"}
                        dot={false}
                      >
                        {KIND_LABEL[p.kind] ?? p.kind}
                      </StatusPill>
                    </td>
                    <td className="px-3 py-3">
                      <div className="inline-flex items-center gap-2">
                        <div
                          className={`h-7 w-7 rounded-md inline-flex items-center justify-center ${meta.bg}`}
                        >
                          <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
                        </div>
                        <span className="text-[12.5px] text-ink-2 font-medium">
                          {meta.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-ink-2 truncate max-w-[200px]">
                      {p.client_name ?? <span className="text-muted-2">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      {p.link ? (
                        <Link
                          href={p.link}
                          className="inline-flex items-center gap-1 font-mono text-[12px] text-violet hover:underline"
                        >
                          {p.ref} <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="font-mono text-[12px] text-ink-2">{p.ref}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-ink">
                      {eur(p.amount_ttc)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <p className="text-[11.5px] text-muted-2">
        {payments.length} paiement{payments.length > 1 ? "s" : ""} chargé(s) — affichage des plus récents en tête.
      </p>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: "ink" | "emerald" | "violet" | "amber" | "blue" | "pink" | "muted";
}) {
  const valueColor =
    tone === "emerald"
      ? "text-emerald"
      : tone === "violet"
        ? "text-violet"
        : tone === "amber"
          ? "text-amber"
          : tone === "blue"
            ? "text-blue"
            : tone === "pink"
              ? "text-pink"
              : tone === "muted"
                ? "text-muted-2"
                : "text-ink";
  return (
    <Card className="px-3.5 py-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className={`h-3.5 w-3.5 ${valueColor}`} strokeWidth={2.4} />}
        <p className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-2">
          {label}
        </p>
      </div>
      <p className={`text-[18px] font-semibold tabular-nums ${valueColor} leading-tight`}>
        {value}
      </p>
      <p className="text-[10.5px] text-muted-2 mt-0.5 tabular-nums">{subtitle}</p>
    </Card>
  );
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 text-[12px]">
      <span className="text-muted-2 font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 px-2 rounded-md border border-line bg-white text-[12px] text-ink-2"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
