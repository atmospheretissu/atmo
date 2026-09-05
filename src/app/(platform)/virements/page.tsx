import Link from "next/link";
import { Landmark, RefreshCw } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ColorChip, type ChipTone } from "@/components/ui/status-pill";
import { ScanWirementsButton } from "@/app/(platform)/virements/scan-button";

export const dynamic = "force-dynamic";

type Row = {
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

type ActionMeta = {
  label: string;
  tone: ChipTone;
  attached: "yes" | "no" | "partial";
};

const ACTION_META: Record<string, ActionMeta> = {
  acompte_marked: { label: "Acompte marqué", tone: "emerald", attached: "yes" },
  solde_marked: { label: "Solde marqué", tone: "emerald", attached: "yes" },
  skipped_amount_mismatch: {
    label: "Montant hors tolérance",
    tone: "amber",
    attached: "partial",
  },
  skipped_no_devis: {
    label: "Devis introuvable",
    tone: "orange",
    attached: "no",
  },
  skipped_no_pattern: {
    label: "Aucun motif DEV-YYYY-NNNN",
    tone: "ink",
    attached: "no",
  },
};

function fmtEur(n: string | number | null): string {
  if (n == null) return "—";
  const v = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(v);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function VirementsPage() {
  const sb = createServiceRoleClient() as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        order: (
          c: string,
          o: { ascending: boolean; nullsFirst?: boolean },
        ) => {
          order: (
            c: string,
            o: { ascending: boolean },
          ) => {
            limit: (n: number) => Promise<{ data: Row[] | null; error: unknown }>;
          };
        };
      };
    };
  };

  const { data: rows } = await sb
    .from("pennylane_wire_matches")
    .select(
      "id, pennylane_transaction_id, transaction_date, matched_at, amount, label, action, devis_id, devis_number, notes, identified_by, cron_run_id",
    )
    .order("transaction_date", { ascending: false, nullsFirst: false })
    .order("matched_at", { ascending: false })
    .limit(500);

  const list = rows ?? [];

  // Stats
  const stats = {
    total: list.length,
    attached: list.filter(
      (r) => ACTION_META[r.action]?.attached === "yes",
    ).length,
    partial: list.filter(
      (r) => ACTION_META[r.action]?.attached === "partial",
    ).length,
    unmatched: list.filter(
      (r) => ACTION_META[r.action]?.attached === "no",
    ).length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <ColorChip tone="emerald" size="lg">
            <Landmark className="h-5 w-5" strokeWidth={2.2} />
          </ColorChip>
          <div>
            <h1 className="text-[20px] font-semibold text-ink leading-tight">
              Virements bancaires
            </h1>
            <p className="text-[13px] text-muted mt-0.5">
              Tous les virements reçus (Pennylane) et leur affectation à un
              devis via le motif <code>DEV-YYYY-NNNN</code>.
            </p>
          </div>
        </div>
        <ScanWirementsButton />
      </div>

      <div className="grid grid-cols-4 gap-3">
        <StatBox label="Total virements" value={stats.total} tone="ink" />
        <StatBox
          label="Rattachés"
          value={stats.attached}
          tone="emerald"
        />
        <StatBox
          label="Montant hors tolérance"
          value={stats.partial}
          tone="amber"
        />
        <StatBox
          label="Non rattachés"
          value={stats.unmatched}
          tone="orange"
        />
      </div>

      <Card className="p-0 overflow-hidden">
        {list.length === 0 ? (
          <div className="p-10 text-center">
            <RefreshCw className="h-6 w-6 text-muted-2 mx-auto mb-2" />
            <p className="text-[13px] text-muted">
              Aucun virement scanné pour l'instant.
            </p>
            <p className="text-[12px] text-muted-2 mt-1">
              Le cron s'exécute automatiquement toutes les heures. Vous pouvez
              aussi déclencher un scan manuel via le bouton ci-dessus.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-canvas-2 border-b border-line">
                <tr className="text-left text-[11.5px] font-semibold uppercase tracking-wider text-muted-2">
                  <th className="px-3 py-2.5">Date virement</th>
                  <th className="px-3 py-2.5 text-right">Montant</th>
                  <th className="px-3 py-2.5">Motif</th>
                  <th className="px-3 py-2.5">Statut</th>
                  <th className="px-3 py-2.5">Devis rattaché</th>
                  <th className="px-3 py-2.5">Identifié par</th>
                  <th className="px-3 py-2.5">Scanné le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map((r) => {
                  const meta =
                    ACTION_META[r.action] ?? {
                      label: r.action,
                      tone: "ink" as ChipTone,
                      attached: "no" as const,
                    };
                  return (
                    <tr key={r.id} className="hover:bg-canvas-2/50">
                      <td className="px-3 py-2.5 whitespace-nowrap text-ink-2 tabular-nums">
                        {fmtDate(r.transaction_date)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-ink tabular-nums whitespace-nowrap">
                        {fmtEur(r.amount)}
                      </td>
                      <td className="px-3 py-2.5 text-ink-2 max-w-[280px] truncate">
                        <span title={r.label ?? ""}>{r.label ?? "—"}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-medium ${toneClass(meta.tone)}`}
                        >
                          {meta.label}
                        </span>
                        {r.notes && (
                          <p className="text-[11px] text-muted-2 mt-0.5">
                            {r.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {r.devis_id ? (
                          <Link
                            href={`/devis/${r.devis_id}`}
                            className="text-blue underline"
                          >
                            {r.devis_number}
                          </Link>
                        ) : r.devis_number ? (
                          <span className="text-orange">
                            {r.devis_number} (introuvable)
                          </span>
                        ) : (
                          <span className="text-muted-2">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[11.5px] text-muted">
                        {r.identified_by === "manual_scan"
                          ? "Scan manuel"
                          : r.identified_by === "cron"
                            ? "Cron auto"
                            : "—"}
                        {r.cron_run_id && (
                          <p
                            className="font-mono text-[10.5px] text-muted-2"
                            title={r.cron_run_id}
                          >
                            #{r.cron_run_id.slice(0, 8)}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[11.5px] text-muted-2 whitespace-nowrap">
                        {fmtDateTime(r.matched_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {list.length >= 500 && (
        <p className="text-[11.5px] text-muted-2 text-center">
          Affichage limité aux 500 dernières lignes.
        </p>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: ChipTone;
}) {
  return (
    <Card className="p-3">
      <p className="text-[11px] text-muted uppercase tracking-wider font-semibold">
        {label}
      </p>
      <p
        className={`text-[22px] font-bold mt-1 tabular-nums ${toneTextClass(tone)}`}
      >
        {value}
      </p>
    </Card>
  );
}

function toneClass(tone: ChipTone): string {
  const map: Record<ChipTone, string> = {
    emerald: "bg-emerald/10 text-emerald",
    amber: "bg-amber/10 text-amber",
    orange: "bg-orange/10 text-orange",
    ink: "bg-canvas-2 text-ink-2",
    violet: "bg-violet/10 text-violet",
    pink: "bg-pink/10 text-pink",
    blue: "bg-blue/10 text-blue",
    yellow: "bg-yellow/10 text-yellow",
    lime: "bg-lime/10 text-lime",
  };
  return map[tone] ?? map.ink;
}

function toneTextClass(tone: ChipTone): string {
  const map: Record<ChipTone, string> = {
    emerald: "text-emerald",
    amber: "text-amber",
    orange: "text-orange",
    ink: "text-ink",
    violet: "text-violet",
    pink: "text-pink",
    blue: "text-blue",
    yellow: "text-yellow",
    lime: "text-lime",
  };
  return map[tone] ?? map.ink;
}
