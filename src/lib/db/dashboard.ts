import { createClient } from "@/lib/supabase/server";

export type DashboardStats = {
  // KPIs hero
  caTotal: number;
  caDelta: number; // % vs période précédente (placeholder pour l'instant)
  devisCount: number;
  devisSent: number;
  acomptesPending: number;
  acomptesPendingAmount: number;
  dossiersActive: number;
  posesUpcoming: number;

  // Flux des dossiers
  flow: {
    devis: number; // brouillon + envoye
    acompte: number; // valide (en attente de paiement)
    confection: number; // en_confection
    reception: number; // tout_commande + reception_partielle
    pret: number; // pret_pose + planifie
    pose: number; // pose
  };

  // Compteurs pour le sidebar / nav
  counts: {
    clients: number;
    devis: number;
    dossiers: number;
    poses: number;
  };
};

/**
 * Agrège tous les KPIs du dashboard en parallèle.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  const [
    { data: devis },
    { data: dossiers },
    { data: clientsCount },
    { data: poses },
  ] = await Promise.all([
    supabase.from("devis").select("status, total_ttc, acompte_ttc"),
    supabase.from("dossiers").select("status, total_ttc, solde_paid"),
    supabase.from("clients").select("id", { count: "exact" }),
    supabase.from("poses").select("status, scheduled_at"),
  ]);

  // CA — montant des devis acompte_recu (rev counted as committed)
  let caTotal = 0;
  let devisCount = 0;
  let devisSent = 0;
  let acomptesPending = 0;
  let acomptesPendingAmount = 0;

  const flow = {
    devis: 0,
    acompte: 0,
    confection: 0,
    reception: 0,
    pret: 0,
    pose: 0,
  };

  for (const d of devis ?? []) {
    devisCount += 1;
    const ttc = Number(d.total_ttc ?? 0);
    const acompte = Number(d.acompte_ttc ?? ttc * 0.5);

    if (d.status === "brouillon" || d.status === "envoye") flow.devis += 1;
    if (d.status === "envoye") devisSent += 1;
    if (d.status === "valide") {
      flow.acompte += 1;
      acomptesPending += 1;
      acomptesPendingAmount += acompte;
    }
    if (d.status === "acompte_recu") caTotal += ttc;
  }

  // Dossiers — flow + dossiers actifs
  let dossiersActive = 0;
  for (const d of dossiers ?? []) {
    if (d.status === "en_confection") flow.confection += 1;
    if (d.status === "reception_partielle" || d.status === "tout_commande")
      flow.reception += 1;
    if (d.status === "pret_pose") flow.pret += 1;
    if (d.status === "planifie") flow.pret += 1;
    if (d.status === "pose") flow.pose += 1;
    // "Actif" = tout sauf 'pose'
    if (d.status !== "pose") dossiersActive += 1;
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

  // Comptes pour la nav
  const counts = {
    clients: clientsCount?.length ?? 0,
    devis: devisCount,
    dossiers: dossiers?.length ?? 0,
    poses: poses?.length ?? 0,
  };

  return {
    caTotal,
    caDelta: 0, // TODO: comparer avec 30 derniers j vs 30 j précédents
    devisCount,
    devisSent,
    acomptesPending,
    acomptesPendingAmount,
    dossiersActive,
    posesUpcoming,
    flow,
    counts,
  };
}

/**
 * Liste les alertes actives à afficher sur le dashboard.
 */
export async function getDashboardAlerts() {
  const supabase = await createClient();

  // 1. Devis envoyés sans réponse depuis 7j+ (acompte en attente)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: oldQuotes } = await supabase
    .from("devis")
    .select("id, number, total_ttc, updated_at, client_id")
    .eq("status", "envoye")
    .lt("updated_at", sevenDaysAgo)
    .limit(3);

  // 2. Dossiers prêts mais solde non réglé
  const { data: blockedDossiers } = await supabase
    .from("dossiers")
    .select("id, number, total_ttc, client_id")
    .eq("status", "pret_pose")
    .eq("solde_paid", false)
    .limit(3);

  // Récupère les noms clients
  const clientIds = Array.from(
    new Set([
      ...(oldQuotes ?? []).map((q) => q.client_id),
      ...(blockedDossiers ?? []).map((d) => d.client_id),
    ])
  );

  const { data: clients } = clientIds.length
    ? await supabase
        .from("clients")
        .select("id, display_name")
        .in("id", clientIds)
    : { data: [] };

  const clientName = (id: string) =>
    clients?.find((c) => c.id === id)?.display_name ?? "—";

  const alerts: {
    id: string;
    kind: "warning" | "danger" | "info";
    title: string;
    detail: string;
    href: string;
  }[] = [];

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

/**
 * 5 derniers devis créés (avec client embarqué).
 */
export async function getRecentDevis(limit = 5) {
  const supabase = await createClient();
  const { data: devis } = await supabase
    .from("devis")
    .select("id, number, status, product_summary, product_detail, total_ttc, created_at, client_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!devis || devis.length === 0) return [];

  const clientIds = Array.from(new Set(devis.map((d) => d.client_id)));
  const { data: clients } = await supabase
    .from("clients")
    .select("id, display_name, city")
    .in("id", clientIds);

  const byId = new Map((clients ?? []).map((c) => [c.id, c]));

  return devis.map((d) => ({ ...d, client: byId.get(d.client_id) ?? null }));
}
