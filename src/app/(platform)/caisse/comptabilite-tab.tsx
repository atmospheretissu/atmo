"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Banknote,
  CreditCard,
  Receipt,
  Wallet,
  ExternalLink,
  Search,
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
  X,
  Sparkles,
  Calendar,
  Download,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { eur } from "@/lib/formatters";
import type {
  UnifiedPayment,
  UnifiedPaymentMethod,
} from "@/lib/db/payments-feed";
import {
  exportToPennylaneAction,
  unmarkPennylaneExportAction,
} from "./pennylane-actions";

const METHOD_META: Record<
  UnifiedPaymentMethod,
  {
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    bg: string;
  }
> = {
  especes:  { label: "Espèces", icon: Wallet, bg: "bg-emerald-soft text-emerald" },
  cb:       { label: "CB", icon: CreditCard, bg: "bg-violet-soft text-violet" },
  cheque:   { label: "Chèque", icon: Receipt, bg: "bg-amber-soft text-amber" },
  virement: { label: "Virement", icon: Banknote, bg: "bg-blue-soft text-blue" },
  stripe:   { label: "Stripe", icon: CreditCard, bg: "bg-pink-soft text-pink" },
  autre:    { label: "Autre", icon: Receipt, bg: "bg-canvas-2 text-muted" },
};

const KIND_LABEL: Record<string, string> = {
  acompte: "Acompte",
  solde: "Solde",
  vente: "Vente comptoir",
};

type PeriodFilter = "today" | "thisMonth" | "lastMonth" | "all";

const PERIOD_LABEL: Record<PeriodFilter, string> = {
  today: "Aujourd'hui",
  thisMonth: "Ce mois",
  lastMonth: "Mois précédent",
  all: "Tout",
};

function periodBounds(period: PeriodFilter): { start: Date | null; end: Date | null } {
  const now = new Date();
  if (period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }
  if (period === "thisMonth") {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  }
  if (period === "lastMonth") {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: new Date(now.getFullYear(), now.getMonth(), 1),
    };
  }
  return { start: null, end: null };
}

export function ComptabiliteTab({ payments }: { payments: UnifiedPayment[] }) {
  const [period, setPeriod] = useState<PeriodFilter>("thisMonth");
  const [statusFilter, setStatusFilter] = useState<"all" | "exported" | "pending">("pending");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const { start, end } = periodBounds(period);
    const query = q.trim().toLowerCase();
    return payments.filter((p) => {
      if (start && new Date(p.paid_at) < start) return false;
      if (end && new Date(p.paid_at) > end) return false;
      const isExported = Boolean(p.pennylane_exported_at);
      if (statusFilter === "exported" && !isExported) return false;
      if (statusFilter === "pending" && isExported) return false;
      if (query) {
        const hay = `${p.ref} ${p.client_name ?? ""} ${p.kind}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [payments, period, statusFilter, q]);

  const stats = useMemo(() => {
    let total = 0;
    let exportedTotal = 0;
    let pendingTotal = 0;
    let exportedCount = 0;
    let pendingCount = 0;
    for (const p of filtered) {
      total += p.amount_ttc;
      if (p.pennylane_exported_at) {
        exportedTotal += p.amount_ttc;
        exportedCount += 1;
      } else {
        pendingTotal += p.amount_ttc;
        pendingCount += 1;
      }
    }
    return { total, exportedTotal, pendingTotal, exportedCount, pendingCount };
  }, [filtered]);

  const selectedItems = useMemo(
    () => filtered.filter((p) => selected.has(p.id) && !p.pennylane_exported_at),
    [filtered, selected],
  );
  const selectedTotal = selectedItems.reduce((s, p) => s + p.amount_ttc, 0);

  // Sélectionnables (= non encore exportés visibles)
  const selectableIds = filtered
    .filter((p) => !p.pennylane_exported_at)
    .map((p) => p.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableIds));
    }
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleExport = () => {
    if (selectedItems.length === 0) return;
    setResult(null);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    startTransition(async () => {
      const r = await exportToPennylaneAction(
        selectedItems.map((p) => p.id),
        `Export depuis Comptabilité · période ${PERIOD_LABEL[period]} · ${selectedItems.length} éléments`,
      );
      if (r.ok) {
        setResult(
          `${r.exported} élément(s) exporté(s)${r.alreadyExported > 0 ? ` · ${r.alreadyExported} déjà exporté(s)` : ""}${r.errors > 0 ? ` · ⚠ ${r.errors} erreur(s)` : ""}`,
        );
        setSelected(new Set());
        setConfirmOpen(false);
      } else {
        setResult(`Erreur : ${r.message}`);
      }
    });
  };

  const handleUnmark = (id: string) => {
    if (!confirm("Annuler l'export Pennylane de cette ligne ?")) return;
    startTransition(async () => {
      await unmarkPennylaneExportAction([id]);
      // La page sera revalidée par revalidatePath
      window.location.reload();
    });
  };

  return (
    <div className="px-8 pb-12 space-y-6">
      {/* Stats globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryTile
          icon={Calendar}
          label="Total période"
          value={eur(stats.total)}
          subtitle={`${filtered.length} ligne${filtered.length > 1 ? "s" : ""}`}
          tone="ink"
        />
        <SummaryTile
          icon={CheckCircle2}
          label="Exporté Pennylane"
          value={eur(stats.exportedTotal)}
          subtitle={`${stats.exportedCount} ligne${stats.exportedCount > 1 ? "s" : ""}`}
          tone="emerald"
        />
        <SummaryTile
          icon={Clock}
          label="À exporter"
          value={eur(stats.pendingTotal)}
          subtitle={`${stats.pendingCount} ligne${stats.pendingCount > 1 ? "s" : ""}`}
          tone="amber"
        />
        <SummaryTile
          icon={Sparkles}
          label="Sélectionné"
          value={eur(selectedTotal)}
          subtitle={`${selectedItems.length} ligne${selectedItems.length > 1 ? "s" : ""}`}
          tone={selectedItems.length > 0 ? "violet" : "muted"}
        />
      </div>

      {/* Notification après export */}
      {result && (
        <div className="rounded-lg border border-emerald/30 bg-emerald-soft px-4 py-3 flex items-start gap-3">
          <CheckCircle2 className="h-4 w-4 text-emerald shrink-0 mt-0.5" strokeWidth={2.4} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-emerald">Export effectué</p>
            <p className="text-[12px] text-emerald/90 mt-0.5">{result}</p>
          </div>
          <button
            onClick={() => setResult(null)}
            className="text-emerald hover:text-emerald/70 shrink-0"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.4} />
          </button>
        </div>
      )}

      {/* Filtres + action principale */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <FilterGroup
            label="Période"
            value={period}
            onChange={(v) => setPeriod(v as PeriodFilter)}
            options={[
              { value: "today", label: "Aujourd'hui" },
              { value: "thisMonth", label: "Ce mois" },
              { value: "lastMonth", label: "Mois précédent" },
              { value: "all", label: "Tout" },
            ]}
          />
          <FilterGroup
            label="Statut"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as "all" | "exported" | "pending")}
            options={[
              { value: "pending", label: "À exporter" },
              { value: "exported", label: "Déjà exporté" },
              { value: "all", label: "Tous" },
            ]}
          />
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2"
              strokeWidth={2.2}
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher…"
              className="pl-9 h-9 w-[200px]"
            />
          </div>
        </div>

        {selectedItems.length > 0 && (
          <Button variant="accent" size="md" onClick={handleExport} disabled={pending}>
            <Send className="h-4 w-4" strokeWidth={2.4} />
            Envoyer {selectedItems.length} ligne{selectedItems.length > 1 ? "s" : ""} à
            Pennylane · {eur(selectedTotal)}
          </Button>
        )}
      </div>

      {/* Tableau */}
      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Download className="h-8 w-8 text-muted-2 mx-auto mb-2" strokeWidth={1.8} />
            <p className="text-[13px] text-muted">Aucune ligne pour ces filtres.</p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-canvas-2/40 border-b border-line text-left">
                <th className="px-5 py-2.5 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    disabled={selectableIds.length === 0}
                    title={
                      selectableIds.length === 0
                        ? "Aucune ligne sélectionnable (tout est déjà exporté)"
                        : allSelected
                          ? "Tout désélectionner"
                          : "Tout sélectionner"
                    }
                    className="h-4 w-4 rounded border-line"
                  />
                </th>
                <th className="px-3 py-2.5 eyebrow">Date</th>
                <th className="px-3 py-2.5 eyebrow">Type</th>
                <th className="px-3 py-2.5 eyebrow">Mode</th>
                <th className="px-3 py-2.5 eyebrow">Client</th>
                <th className="px-3 py-2.5 eyebrow">Référence</th>
                <th className="px-5 py-2.5 eyebrow text-right">Montant TTC</th>
                <th className="px-3 py-2.5 eyebrow">Pennylane</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const meta = METHOD_META[p.method];
                const Icon = meta.icon;
                const isExported = Boolean(p.pennylane_exported_at);
                const isSelected = selected.has(p.id);
                return (
                  <tr
                    key={p.id}
                    className={
                      "border-b border-line/60 last:border-0 transition-colors " +
                      (isExported
                        ? "bg-emerald-soft/20 text-muted-2"
                        : isSelected
                          ? "bg-violet-soft/40"
                          : "hover:bg-canvas-2/30")
                    }
                  >
                    <td className="px-5 py-3">
                      {!isExported ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggle(p.id)}
                          className="h-4 w-4 rounded border-line"
                        />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald" strokeWidth={2.4} />
                      )}
                    </td>
                    <td className="px-3 py-3 tabular-nums whitespace-nowrap">
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
                    <td className="px-3 py-3">
                      {isExported ? (
                        <button
                          onClick={() => handleUnmark(p.id)}
                          disabled={pending}
                          className="inline-flex items-center gap-1.5 text-[11px] text-emerald hover:text-pink transition-colors group"
                          title={`Exporté le ${new Date(p.pennylane_exported_at!).toLocaleString("fr-FR")} · cliquer pour annuler`}
                        >
                          <CheckCircle2 className="h-3 w-3 group-hover:hidden" strokeWidth={2.4} />
                          <X className="h-3 w-3 hidden group-hover:inline" strokeWidth={2.4} />
                          <span className="tabular-nums">
                            {new Date(p.pennylane_exported_at!).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-muted-2">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* MODAL double-check */}
      {confirmOpen && (
        <div
          className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4"
          onClick={() => !pending && setConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-line bg-violet-soft">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-violet text-white inline-flex items-center justify-center shrink-0">
                  <Send className="h-4 w-4" strokeWidth={2.4} />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-ink">
                    Confirmer l'export vers Pennylane
                  </h3>
                  <p className="text-[12.5px] text-muted mt-0.5">
                    Vérifie le récap avant d'envoyer.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="rounded-xl bg-canvas-2/40 px-4 py-3">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-2">
                    Lignes à exporter
                  </span>
                  <span className="text-[16px] font-semibold tabular-nums text-ink">
                    {selectedItems.length}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-2">
                    Montant total
                  </span>
                  <span className="text-[20px] font-bold tabular-nums text-violet">
                    {eur(selectedTotal)}
                  </span>
                </div>
              </div>

              {/* Détail compact */}
              <div className="max-h-48 overflow-auto rounded-lg border border-line">
                <ul className="divide-y divide-line text-[12px]">
                  {selectedItems.slice(0, 20).map((p) => {
                    const meta = METHOD_META[p.method];
                    return (
                      <li
                        key={p.id}
                        className="px-3 py-1.5 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`h-5 w-5 rounded inline-flex items-center justify-center text-[10px] ${meta.bg}`}
                          >
                            {meta.label[0]}
                          </span>
                          <span className="truncate text-ink-2">
                            {p.client_name ?? p.ref}
                          </span>
                        </div>
                        <span className="tabular-nums font-semibold text-ink shrink-0">
                          {eur(p.amount_ttc)}
                        </span>
                      </li>
                    );
                  })}
                  {selectedItems.length > 20 && (
                    <li className="px-3 py-1.5 text-[11.5px] text-muted-2 italic text-center">
                      … et {selectedItems.length - 20} ligne(s) de plus
                    </li>
                  )}
                </ul>
              </div>

              <div className="rounded-lg bg-amber-soft border border-amber/30 px-3 py-2.5 flex items-start gap-2 text-[12px] text-amber">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" strokeWidth={2.2} />
                <span>
                  Cette action marque les lignes comme <strong>exportées vers Pennylane</strong>.
                  Tu pourras annuler ligne par ligne ensuite si besoin.
                </span>
              </div>

              {result && result.startsWith("Erreur") && (
                <div className="rounded-lg bg-pink-soft border border-pink/30 px-3 py-2 text-[12px] text-pink">
                  {result}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-canvas-2/40 border-t border-line flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmOpen(false)}
                disabled={pending}
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.2} />
                Annuler
              </Button>
              <Button
                variant="accent"
                size="sm"
                onClick={handleConfirm}
                disabled={pending}
              >
                <Send className="h-3.5 w-3.5" strokeWidth={2.4} />
                {pending
                  ? "Export en cours…"
                  : `Confirmer · envoyer ${selectedItems.length} ligne${selectedItems.length > 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        </div>
      )}
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
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: "ink" | "emerald" | "amber" | "violet" | "muted";
}) {
  const color =
    tone === "emerald"
      ? "text-emerald"
      : tone === "amber"
        ? "text-amber"
        : tone === "violet"
          ? "text-violet"
          : tone === "muted"
            ? "text-muted-2"
            : "text-ink";
  return (
    <Card className="px-4 py-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`h-4 w-4 ${color}`} strokeWidth={2.4} />
        <p className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-2">
          {label}
        </p>
      </div>
      <p className={`text-[22px] font-bold tabular-nums ${color} leading-tight`}>
        {value}
      </p>
      <p className="text-[11px] text-muted-2 mt-0.5">{subtitle}</p>
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
