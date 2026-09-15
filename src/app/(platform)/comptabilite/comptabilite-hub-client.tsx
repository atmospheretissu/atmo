"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Wallet,
  Calculator,
  Landmark,
  FileText,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ColorChip, StatusPill, type ChipTone } from "@/components/ui/status-pill";
import { PaymentsTab } from "@/app/(platform)/caisse/payments-tab";
import { ComptabiliteTab } from "@/app/(platform)/caisse/comptabilite-tab";
import type { UnifiedPayment } from "@/lib/db/payments-feed";

export type WireMatchRow = {
  id: string;
  pennylane_transaction_id: string;
  transaction_date: string | null;
  matched_at: string;
  amount: string | number | null;
  label: string | null;
  action: string;
  devis_id: string | null;
  devis_number: string | null;
  notes: string | null;
  identified_by: string | null;
  cron_run_id: string | null;
};

export type PennylaneInvoiceRow = {
  id: string;
  pennylane_invoice_id: string;
  exported_at: string | null;
  source: string;
  kind: string;
  method: string;
  amount_ttc: number;
  client_name: string | null;
  ref: string;
  paid_at: string;
  link: string | null;
};

const ACTION_META: Record<string, { label: string; tone: ChipTone }> = {
  acompte_marked: { label: "Acompte marqué", tone: "emerald" },
  solde_marked: { label: "Solde marqué", tone: "emerald" },
  skipped_amount_mismatch: { label: "Montant hors tolérance", tone: "amber" },
  skipped_no_devis: { label: "Devis introuvable", tone: "orange" },
  skipped_no_pattern: { label: "Sans motif DEV-YYYY-NNNN", tone: "ink" },
};

const eur = (n: number | string | null | undefined) => {
  if (n == null) return "—";
  const v = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(v);
};

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

type TabKey = "recettes" | "export" | "virements" | "factures";

export default function ComptabiliteHubClient({
  payments,
  wireMatches,
  factures,
}: {
  payments: UnifiedPayment[];
  wireMatches: WireMatchRow[];
  factures: PennylaneInvoiceRow[];
}) {
  const [tab, setTab] = useState<TabKey>("recettes");

  const toExport = payments.filter((p) => !p.pennylane_exported_at).length;

  return (
    <div className="flex-1 flex flex-col">
      <Topbar
        breadcrumb={[{ label: "Atmosphère" }, { label: "Comptabilité" }]}
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <div
          className={cn(
            "sticky top-14 z-20 bg-canvas border-b border-line px-8 pt-3",
          )}
        >
          <TabsList className="border-b-0">
            <TabsTrigger value="recettes">
              <Wallet className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" strokeWidth={2.2} />
              Recettes
              <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-canvas-2 text-[10.5px] font-semibold tabular-nums text-muted">
                {payments.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="export">
              <Calculator className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" strokeWidth={2.2} />
              Export Pennylane
              {toExport > 0 && (
                <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-soft text-[10.5px] font-semibold tabular-nums text-amber">
                  {toExport}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="virements">
              <Landmark className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" strokeWidth={2.2} />
              Virements bancaires
              <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-canvas-2 text-[10.5px] font-semibold tabular-nums text-muted">
                {wireMatches.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="factures">
              <FileText className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" strokeWidth={2.2} />
              Factures Pennylane
              <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-canvas-2 text-[10.5px] font-semibold tabular-nums text-muted">
                {factures.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="recettes">
          <div className="px-8 pt-8 pb-4">
            <p className="eyebrow mb-2">Historique consolidé</p>
            <h1 className="text-[28px] font-semibold tracking-tight text-ink leading-[1.1]">
              Toutes les recettes
            </h1>
            <p className="text-[13.5px] text-muted mt-2 max-w-2xl">
              Acomptes &amp; soldes des devis (Stripe, virement, chèque,
              espèces), ventes comptoir — tous moyens confondus pour suivre la
              trésorerie.
            </p>
          </div>
          <PaymentsTab payments={payments} />
        </TabsContent>

        <TabsContent value="export">
          <div className="px-8 pt-8 pb-4">
            <p className="eyebrow mb-2">Export comptable</p>
            <h1 className="text-[28px] font-semibold tracking-tight text-ink leading-[1.1]">
              Statut d&apos;export vers Pennylane
            </h1>
            <p className="text-[13.5px] text-muted mt-2 max-w-2xl">
              Toutes les recettes avec leur statut d&apos;export. Sélectionne
              les lignes à envoyer, valide en deux étapes, ou re-synchronise.
            </p>
          </div>
          <ComptabiliteTab payments={payments} />
        </TabsContent>

        <TabsContent value="virements">
          <WireMatchesTab rows={wireMatches} />
        </TabsContent>

        <TabsContent value="factures">
          <PennylaneInvoicesTab rows={factures} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Sous-onglet 3 · Virements bancaires (rapprochements Pennylane)
// ─────────────────────────────────────────────────────────────────────────
function WireMatchesTab({ rows }: { rows: WireMatchRow[] }) {
  const attached = rows.filter(
    (r) => r.action === "acompte_marked" || r.action === "solde_marked",
  ).length;
  const skipped = rows.length - attached;

  return (
    <section className="px-8 pt-8 pb-12 space-y-4">
      <div>
        <p className="eyebrow mb-2">Rapprochements bancaires</p>
        <h1 className="text-[28px] font-semibold tracking-tight text-ink leading-[1.1]">
          Virements Pennylane
        </h1>
        <p className="text-[13.5px] text-muted mt-2 max-w-2xl">
          Transactions bancaires importées et rapprochées automatiquement à un
          devis via le motif <code className="font-mono text-[12px]">DEV-YYYY-NNNN</code>.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Total transactions" value={rows.length} />
        <MiniStat label="Rattachées à un devis" value={attached} tone="emerald" />
        <MiniStat label="Non rapprochées" value={skipped} tone="amber" />
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-[12.5px]">
          <thead className="bg-canvas-2/60 text-muted">
            <tr>
              <th className="text-left px-3 py-2.5 eyebrow">Date</th>
              <th className="text-left px-3 py-2.5 eyebrow">Libellé</th>
              <th className="text-right px-3 py-2.5 eyebrow">Montant</th>
              <th className="text-left px-3 py-2.5 eyebrow">Action</th>
              <th className="text-left px-3 py-2.5 eyebrow">Devis</th>
              <th className="text-left px-3 py-2.5 eyebrow">Traité le</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-2 italic">
                  Aucun virement rapproché pour le moment.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const meta = ACTION_META[r.action] ?? {
                label: r.action,
                tone: "ink" as ChipTone,
              };
              return (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-ink">{fmtDate(r.transaction_date)}</td>
                  <td className="px-3 py-2 text-ink-2 max-w-[300px] truncate" title={r.label ?? ""}>
                    {r.label ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-ink">
                    {eur(r.amount)}
                  </td>
                  <td className="px-3 py-2">
                    <ColorChip tone={meta.tone}>{meta.label}</ColorChip>
                  </td>
                  <td className="px-3 py-2">
                    {r.devis_number && r.devis_id ? (
                      <Link
                        href={`/devis/${r.devis_id}`}
                        className="text-violet-strong hover:underline font-mono text-[12px]"
                      >
                        {r.devis_number}
                      </Link>
                    ) : (
                      <span className="text-muted-2">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-2 text-[11.5px]">{fmtDateTime(r.matched_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Sous-onglet 4 · Factures Pennylane (invoices poussées)
// ─────────────────────────────────────────────────────────────────────────
function PennylaneInvoicesTab({ rows }: { rows: PennylaneInvoiceRow[] }) {
  const totalTtc = rows.reduce((acc, r) => acc + r.amount_ttc, 0);

  return (
    <section className="px-8 pt-8 pb-12 space-y-4">
      <div>
        <p className="eyebrow mb-2">Factures poussées</p>
        <h1 className="text-[28px] font-semibold tracking-tight text-ink leading-[1.1]">
          Factures Pennylane
        </h1>
        <p className="text-[13.5px] text-muted mt-2 max-w-2xl">
          Toutes les factures créées dans Pennylane via l&apos;app (acompte,
          solde, ticket comptoir). Chaque ligne renvoie vers la facture
          Pennylane correspondante.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MiniStat label="Factures créées" value={rows.length} />
        <MiniStat label="Montant total TTC" value={eur(totalTtc)} tone="emerald" />
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-[12.5px]">
          <thead className="bg-canvas-2/60 text-muted">
            <tr>
              <th className="text-left px-3 py-2.5 eyebrow">Facture PL</th>
              <th className="text-left px-3 py-2.5 eyebrow">Payé le</th>
              <th className="text-left px-3 py-2.5 eyebrow">Client</th>
              <th className="text-left px-3 py-2.5 eyebrow">Réf</th>
              <th className="text-left px-3 py-2.5 eyebrow">Type</th>
              <th className="text-left px-3 py-2.5 eyebrow">Méthode</th>
              <th className="text-right px-3 py-2.5 eyebrow">Montant</th>
              <th className="text-right px-3 py-2.5 eyebrow">Ouvrir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-muted-2 italic">
                  Aucune facture Pennylane pour le moment.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 font-mono text-[12px] text-ink">
                  {r.pennylane_invoice_id}
                </td>
                <td className="px-3 py-2 text-ink-2">{fmtDate(r.paid_at)}</td>
                <td className="px-3 py-2 text-ink">{r.client_name ?? "—"}</td>
                <td className="px-3 py-2 text-ink-2 font-mono text-[12px]">{r.ref}</td>
                <td className="px-3 py-2">
                  <StatusPill tone={r.kind === "solde" ? "emerald" : r.kind === "acompte" ? "violet" : "muted"}>
                    {r.kind}
                  </StatusPill>
                </td>
                <td className="px-3 py-2 text-ink-2 capitalize">{r.method}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-ink">
                  {eur(r.amount_ttc)}
                </td>
                <td className="px-3 py-2 text-right">
                  <a
                    href={`https://app.pennylane.com/companies/self/invoicing/customer_invoices/${r.pennylane_invoice_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-violet-strong hover:underline text-[11.5px] font-semibold"
                  >
                    Pennylane <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}

function MiniStat({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: number | string;
  tone?: "muted" | "emerald" | "amber";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-strong"
      : tone === "amber"
        ? "text-amber"
        : "text-ink";
  return (
    <div className="rounded-lg border border-line bg-white px-4 py-3">
      <p className="text-[10.5px] font-semibold uppercase tracking-widest text-muted-2 mb-1">
        {label}
      </p>
      <p className={cn("text-[22px] font-bold tabular-nums", toneClass)}>{value}</p>
    </div>
  );
}
