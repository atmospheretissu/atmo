import { createClient } from "@/lib/supabase/server";
import { getEffectiveStoreFilter } from "@/lib/db/stores";
import {
  STATUS_META,
  WORKFLOW_STATUSES,
  ageInStatus,
  type WorkflowStatus,
} from "@/lib/workflow/statuses";

export type PeriodKey = "day" | "week" | "month" | "year" | "all" | "custom";

export type Period = {
  key: PeriodKey;
  from: Date;
  to: Date;
  label: string;
};

const parseDateStrict = (iso: string | undefined | null): Date | null => {
  if (!iso) return null;
  // attend YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const fmtFr = (d: Date) =>
  d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

export function resolvePeriod(
  key: string | undefined,
  customFrom?: string | null,
  customTo?: string | null,
): Period {
  const now = new Date();

  // Custom : si les 2 dates parsent, on les utilise
  if (key === "custom") {
    const from = parseDateStrict(customFrom ?? undefined);
    const to = parseDateStrict(customTo ?? undefined);
    if (from && to && from.getTime() <= to.getTime()) {
      const toEnd = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
      return {
        key: "custom",
        from,
        to: toEnd,
        label: `Du ${fmtFr(from)} au ${fmtFr(to)}`,
      };
    }
    // Fallback silencieux vers mois en cours si dates invalides
  }

  const k: PeriodKey =
    key === "day" || key === "week" || key === "year" || key === "all"
      ? (key as PeriodKey)
      : "month";
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let from: Date;
  let label: string;
  switch (k) {
    case "day":
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      label = "Aujourd'hui";
      break;
    case "week": {
      const day = now.getDay() || 7;
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day - 1), 0, 0, 0);
      label = "Cette semaine";
      break;
    }
    case "year":
      from = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      label = "Cette année";
      break;
    case "all":
      from = new Date(2000, 0, 1);
      label = "Depuis le début";
      break;
    case "month":
    default:
      from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      label = "Mois en cours";
      break;
  }
  return { key: k, from, to, label };
}

export type DashboardStats = {
  period: Period;

  // KPIs principaux
  devisSentCount: number;
  devisSentAmount: number;
  devisPendingCount: number;
  devisPendingAmount: number;
  commandesActiveCount: number;
  commandesActiveAmount: number;
  taux: { converted: number; total: number; pct: number };

  caTotal: number;
  acomptesPending: number;
  acomptesPendingAmount: number;
  posesUpcoming: number;

  // Flux par statut
  flowByStatus: Record<WorkflowStatus, number>;
  flowAmountByStatus: Record<WorkflowStatus, number>;

  // Compteurs nav
  counts: {
    clients: number;
    devis: number;
    dossiers: number;
    poses: number;
  };
};

export async function getDashboardStats(
  periodKey?: string,
  customFrom?: string | null,
  customTo?: string | null,
): Promise<DashboardStats> {
  const supabase = await createClient();
  const storeFilter = await getEffectiveStoreFilter();
  const period = resolvePeriod(periodKey, customFrom, customTo);

  const devisQuery = supabase.from("devis").select("status, total_ttc, acompte_ttc, created_at");
  const dossiersQuery = supabase
    .from("dossiers")
    .select(
      "status, total_ttc, solde_paid, created_at, updated_at, attente_matiere_at, confection_started_at, pret_pose_at, cloture_at"
    );
  const clientsQuery = supabase.from("clients").select("id", { count: "exact", head: true });
  const posesQuery = supabase.from("poses").select("status, scheduled_at");

  if (storeFilter) {
    devisQuery.eq("store_id", storeFilter);
    dossiersQuery.eq("store_id", storeFilter);
    clientsQuery.eq("store_id", storeFilter);
  }

  const [
    { data: devis },
    { data: dossiers },
    { count: clientsCount },
    { data: poses },
  ] = await Promise.all([devisQuery, dossiersQuery, clientsQuery, posesQuery]);

  const inPeriod = (iso: string | null | undefined) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= period.from.getTime() && t <= period.to.getTime();
  };

  let devisSentCount = 0;
  let devisSentAmount = 0;
  let devisPendingCount = 0;
  let devisPendingAmount = 0;
  let acomptesPending = 0;
  let acomptesPendingAmount = 0;
  let caTotal = 0;

  let devisInPeriod = 0;
  let convertedInPeriod = 0;

  for (const d of devis ?? []) {
    const ttc = Number(d.total_ttc ?? 0);
    const acompte = Number(d.acompte_ttc ?? ttc * 0.5);
    const status = String(d.status);

    if (inPeriod(d.created_at)) {
      devisInPeriod += 1;
      if (status === "acompte_recu" || status === "valide") convertedInPeriod += 1;
    }

    if (status === "envoye") {
      devisPendingCount += 1;
      devisPendingAmount += ttc;
    }
    if (status === "envoye" && inPeriod(d.created_at)) {
      devisSentCount += 1;
      devisSentAmount += ttc;
    }
    if (status === "valide") {
      acomptesPending += 1;
      acomptesPendingAmount += acompte;
    }
    if (status === "acompte_recu" && inPeriod(d.created_at)) {
      caTotal += ttc;
    }
  }

  const flowByStatus = Object.fromEntries(
    WORKFLOW_STATUSES.map((s) => [s, 0])
  ) as Record<WorkflowStatus, number>;
  const flowAmountByStatus = Object.fromEntries(
    WORKFLOW_STATUSES.map((s) => [s, 0])
  ) as Record<WorkflowStatus, number>;

  let commandesActiveCount = 0;
  let commandesActiveAmount = 0;

  for (const d of dossiers ?? []) {
    const status = String(d.status) as WorkflowStatus;
    const ttc = Number(d.total_ttc ?? 0);
    if (status in flowByStatus) {
      flowByStatus[status] += 1;
      flowAmountByStatus[status] += ttc;
    }
    if (status !== "cloture") {
      commandesActiveCount += 1;
      commandesActiveAmount += ttc;
    }
  }

  // Poses à venir (7 prochains jours)
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 86400000);
  let posesUpcoming = 0;
  for (const p of poses ?? []) {
    if (p.scheduled_at) {
      const d = new Date(p.scheduled_at);
      if (d >= now && d <= in7Days && p.status !== "pose") {
        posesUpcoming += 1;
      }
    }
  }

  const taux = {
    converted: convertedInPeriod,
    total: devisInPeriod,
    pct: devisInPeriod > 0 ? Math.round((convertedInPeriod / devisInPeriod) * 100) : 0,
  };

  const counts = {
    clients: clientsCount ?? 0,
    devis: devis?.length ?? 0,
    dossiers: dossiers?.length ?? 0,
    poses: poses?.length ?? 0,
  };

  return {
    period,
    devisSentCount,
    devisSentAmount,
    devisPendingCount,
    devisPendingAmount,
    commandesActiveCount,
    commandesActiveAmount,
    taux,
    caTotal,
    acomptesPending,
    acomptesPendingAmount,
    posesUpcoming,
    flowByStatus,
    flowAmountByStatus,
    counts,
  };
}

export type DashboardAlert = {
  id: string;
  kind: "warning" | "danger" | "info";
  title: string;
  detail: string;
  href: string;
};

export async function getDashboardAlerts(): Promise<DashboardAlert[]> {
  const supabase = await createClient();
  const storeFilter = await getEffectiveStoreFilter();

  const overdueStatuses = Object.entries(STATUS_META)
    .filter(([, m]) => m.alertDays !== null)
    .map(([s]) => s as WorkflowStatus);

  const overdueQuery = supabase
    .from("dossiers")
    .select(
      "id, number, status, client_id, created_at, updated_at, attente_matiere_at, confection_started_at, pret_pose_at, cloture_at"
    )
    .in("status", overdueStatuses);
  if (storeFilter) overdueQuery.eq("store_id", storeFilter);
  const { data: maybeOverdue } = await overdueQuery;

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const oldQuotesQuery = supabase
    .from("devis")
    .select("id, number, total_ttc, updated_at, client_id")
    .eq("status", "envoye")
    .lt("updated_at", sevenDaysAgo)
    .order("updated_at", { ascending: true })
    .limit(3);
  if (storeFilter) oldQuotesQuery.eq("store_id", storeFilter);
  const { data: oldQuotes } = await oldQuotesQuery;

  const blockedQuery = supabase
    .from("dossiers")
    .select("id, number, client_id")
    .eq("status", "pret_pose")
    .eq("solde_paid", false)
    .limit(3);
  if (storeFilter) blockedQuery.eq("store_id", storeFilter);
  const { data: blockedDossiers } = await blockedQuery;

  const overdueDossiers = (maybeOverdue ?? [])
    .map((d) => {
      const age = ageInStatus(String(d.status), d as never);
      return { d, age };
    })
    .filter(({ age }) => age?.isOverdue)
    .slice(0, 5);

  const clientIds = Array.from(
    new Set([
      ...overdueDossiers.map(({ d }) => d.client_id),
      ...(oldQuotes ?? []).map((q) => q.client_id),
      ...(blockedDossiers ?? []).map((d) => d.client_id),
    ])
  );

  const { data: clients } = clientIds.length
    ? await supabase.from("clients").select("id, display_name").in("id", clientIds)
    : { data: [] };

  const clientName = (id: string) =>
    clients?.find((c) => c.id === id)?.display_name ?? "—";

  const alerts: DashboardAlert[] = [];

  for (const { d, age } of overdueDossiers) {
    const meta = STATUS_META[d.status as WorkflowStatus];
    alerts.push({
      id: `od-${d.id}`,
      kind: "danger",
      title: `${meta.label} en retard · ${clientName(d.client_id)}`,
      detail: `Dossier ${d.number} — ${age?.days}j en ${meta.shortLabel.toLowerCase()} (seuil ${age?.threshold}j).`,
      href: `/confections/${d.id}`,
    });
  }

  for (const q of oldQuotes ?? []) {
    alerts.push({
      id: `oq-${q.id}`,
      kind: "warning",
      title: `Acompte en attente · ${clientName(q.client_id)}`,
      detail: `Devis ${q.number} envoyé il y a plus de 7 jours.`,
      href: `/devis/${q.id}`,
    });
  }

  for (const d of blockedDossiers ?? []) {
    alerts.push({
      id: `bd-${d.id}`,
      kind: "danger",
      title: `Pose bloquée · solde dû`,
      detail: `Dossier ${d.number} — ${clientName(d.client_id)}. Tous éléments reçus, solde non réglé.`,
      href: `/confections/${d.id}`,
    });
  }

  return alerts;
}

export async function getRecentDevis(limit = 5) {
  const supabase = await createClient();
  const storeFilter = await getEffectiveStoreFilter();

  const q = supabase
    .from("devis")
    .select(
      "id, number, status, product_summary, product_detail, total_ttc, created_at, client_id"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (storeFilter) q.eq("store_id", storeFilter);
  const { data: devis } = await q;

  if (!devis || devis.length === 0) return [];

  const clientIds = Array.from(new Set(devis.map((d) => d.client_id)));
  const { data: clients } = await supabase
    .from("clients")
    .select("id, display_name, city")
    .in("id", clientIds);

  const byId = new Map((clients ?? []).map((c) => [c.id, c]));

  return devis.map((d) => ({ ...d, client: byId.get(d.client_id) ?? null }));
}
