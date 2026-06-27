import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ageInStatus, STATUS_META, type WorkflowStatus } from "@/lib/workflow/statuses";

type AnySupabaseClient = SupabaseClient<Database>;

export type BonCommande = Database["public"]["Tables"]["bons_commande"]["Row"];
export type BCInsert = Database["public"]["Tables"]["bons_commande"]["Insert"];
export type BCStatus = Database["public"]["Enums"]["bc_status"];
export type BCLine = Database["public"]["Tables"]["bc_lines"]["Row"];
export type BCLineInsert = Database["public"]["Tables"]["bc_lines"]["Insert"];

export type Supplier = Database["public"]["Tables"]["suppliers"]["Row"];

export type BCDetail = {
  bc: BonCommande;
  supplier: Supplier | null;
  dossier: { id: string; number: string; client_id: string; status: string } | null;
  client: { id: string; display_name: string; city: string | null } | null;
  lines: BCLine[];
};

export async function getBcDetail(id: string): Promise<BCDetail | null> {
  const supabase = await createClient();
  const { data: bc, error: e1 } = await supabase
    .from("bons_commande")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (e1) throw e1;
  if (!bc) return null;

  const [{ data: supplier }, { data: lines }] = await Promise.all([
    supabase.from("suppliers").select("*").eq("id", bc.supplier_id).maybeSingle(),
    supabase
      .from("bc_lines")
      .select("*")
      .eq("bc_id", id)
      .order("position", { ascending: true }),
  ]);

  let dossier: BCDetail["dossier"] = null;
  let client: BCDetail["client"] = null;
  if (bc.dossier_id) {
    const { data: d } = await supabase
      .from("dossiers")
      .select("id, number, client_id, status")
      .eq("id", bc.dossier_id)
      .maybeSingle();
    if (d) {
      dossier = d;
      const { data: c } = await supabase
        .from("clients")
        .select("id, display_name, city")
        .eq("id", d.client_id)
        .maybeSingle();
      client = c ?? null;
    }
  }

  return { bc, supplier: supplier ?? null, dossier, client, lines: lines ?? [] };
}

/**
 * Recalcule amount_ht à partir des lignes.
 */
export async function recomputeBcAmount(bcId: string): Promise<number> {
  const supabase = await createClient();
  const { data: lines } = await supabase
    .from("bc_lines")
    .select("total_ht, qty, unit_price_ht")
    .eq("bc_id", bcId);
  const total = (lines ?? []).reduce((sum, l) => {
    const t = Number(l.total_ht ?? Number(l.qty) * Number(l.unit_price_ht ?? 0));
    return sum + (Number.isFinite(t) ? t : 0);
  }, 0);
  await supabase.from("bons_commande").update({ amount_ht: total }).eq("id", bcId);
  return total;
}

export async function getNextBcNumber(
  client?: AnySupabaseClient,
): Promise<string> {
  const supabase = client ?? (await createClient());
  const year = new Date().getFullYear();
  const prefix = `BC-${year}-`;
  // Cherche le plus grand numéro existant (incluant les BCs supprimés
  // dont le numéro peut encore exister dans des index si soft-delete).
  // Plus robuste que count() qui réutilise les numéros libérés.
  const { data } = await supabase
    .from("bons_commande")
    .select("number")
    .like("number", `${prefix}%`)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();
  let next = 1;
  if (data?.number) {
    const suffix = data.number.slice(prefix.length);
    const n = parseInt(suffix, 10);
    if (!Number.isNaN(n)) next = n + 1;
  }
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export type BCWithRelations = BonCommande & {
  supplier: { id: string; name: string; type: string; franco_ht: number; language: string } | null;
  dossier: { id: string; number: string; client_id: string } | null;
  client: { display_name: string } | null;
};

export async function listBons(
  opts: { supplierId?: string | null; lateOnly?: boolean } = {},
): Promise<BCWithRelations[]> {
  const supabase = await createClient();
  let q = supabase
    .from("bons_commande")
    .select("*")
    .order("created_at", { ascending: false });
  if (opts.supplierId) q = q.eq("supplier_id", opts.supplierId);
  if (opts.lateOnly) {
    const today = new Date().toISOString().slice(0, 10);
    q = q.in("status", ["envoye", "confirme", "expedie"]).lt("expected_at", today);
  }
  const { data: bcs } = await q;
  if (!bcs || bcs.length === 0) return [];

  const supplierIds = Array.from(new Set(bcs.map((b) => b.supplier_id)));
  const dossierIds = Array.from(new Set(bcs.map((b) => b.dossier_id).filter(Boolean) as string[]));

  const [{ data: suppliers }, { data: dossiers }] = await Promise.all([
    supabase
      .from("suppliers")
      .select("id, name, type, franco_ht, language")
      .in("id", supplierIds),
    dossierIds.length
      ? supabase
          .from("dossiers")
          .select("id, number, client_id")
          .in("id", dossierIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const clientIds = Array.from(new Set((dossiers ?? []).map((d) => d.client_id)));
  const { data: clients } = clientIds.length
    ? await supabase.from("clients").select("id, display_name").in("id", clientIds)
    : { data: [] };

  const suppliersById = new Map((suppliers ?? []).map((s) => [s.id, s]));
  const dossiersById = new Map((dossiers ?? []).map((d) => [d.id, d]));
  const clientsById = new Map((clients ?? []).map((c) => [c.id, c]));

  return bcs.map((b) => {
    const dossier = b.dossier_id ? dossiersById.get(b.dossier_id) ?? null : null;
    return {
      ...b,
      supplier: suppliersById.get(b.supplier_id) ?? null,
      dossier: dossier ? { id: dossier.id, number: dossier.number, client_id: dossier.client_id } : null,
      client: dossier ? clientsById.get(dossier.client_id) ?? null : null,
    };
  });
}

export async function getBcStats() {
  const supabase = await createClient();
  const { data: bcs } = await supabase
    .from("bons_commande")
    .select("status, amount_ht, supplier_id, expected_at, sent_at");
  const stats = {
    total: bcs?.length ?? 0,
    brouillon: 0,
    envoye: 0,
    recu: 0,
    totalMonth: 0,
    francoIssues: 0,
    bcLate: 0,
  };
  const today = new Date().toISOString().slice(0, 10);
  for (const b of bcs ?? []) {
    if (b.status === "brouillon") stats.brouillon += 1;
    if (b.status === "envoye") stats.envoye += 1;
    if (b.status === "recu") stats.recu += 1;
    stats.totalMonth += Number(b.amount_ht ?? 0);
    // BC en retard : envoyé/confirmé/expédié, jamais reçu, date attendue passée
    if (
      b.status !== "recu" &&
      b.status !== "brouillon" &&
      b.expected_at &&
      String(b.expected_at) < today
    ) {
      stats.bcLate += 1;
    }
  }
  // Compte francos non atteints (besoin de joindre suppliers)
  const { data: bcsWithSupp } = await supabase
    .from("bons_commande")
    .select("amount_ht, supplier_id, status");
  const supplierIds = Array.from(
    new Set((bcsWithSupp ?? []).map((b) => b.supplier_id))
  );
  const { data: suppliers } = supplierIds.length
    ? await supabase.from("suppliers").select("id, franco_ht").in("id", supplierIds)
    : { data: [] };
  const francoBySupp = new Map(
    (suppliers ?? []).map((s) => [s.id, Number(s.franco_ht ?? 0)])
  );
  for (const b of bcsWithSupp ?? []) {
    if (b.status !== "recu" && b.status !== "brouillon") {
      const f = francoBySupp.get(b.supplier_id) ?? 0;
      if (Number(b.amount_ht ?? 0) < f) stats.francoIssues += 1;
    }
  }
  return stats;
}

/** Liste les dossiers actuellement en retard (attente_matiere >10j, confection >12j). */
export type LateDossier = {
  id: string;
  number: string;
  status: WorkflowStatus;
  client_name: string | null;
  age_days: number;
  threshold: number;
};

export async function listLateDossiers(): Promise<LateDossier[]> {
  const supabase = await createClient();
  const overdueStatuses = Object.entries(STATUS_META)
    .filter(([, m]) => m.alertDays !== null)
    .map(([s]) => s as WorkflowStatus);

  const { data: dossiers } = await supabase
    .from("dossiers")
    .select(
      "id, number, status, client_id, created_at, updated_at, attente_matiere_at, confection_started_at, pret_pose_at, cloture_at",
    )
    .in("status", overdueStatuses);
  if (!dossiers || dossiers.length === 0) return [];

  const out: LateDossier[] = [];
  for (const d of dossiers) {
    const age = ageInStatus(String(d.status), d as never);
    if (!age?.isOverdue || age.threshold === null) continue;
    out.push({
      id: d.id,
      number: d.number,
      status: d.status as WorkflowStatus,
      client_name: null,
      age_days: age.days,
      threshold: age.threshold,
    });
  }

  if (out.length === 0) return [];

  // Récupère les noms clients en un seul batch
  const clientIds = Array.from(
    new Set(
      dossiers
        .filter((d) => out.some((o) => o.id === d.id))
        .map((d) => d.client_id),
    ),
  );
  const { data: clients } = await supabase
    .from("clients")
    .select("id, display_name")
    .in("id", clientIds);
  const byId = new Map((clients ?? []).map((c) => [c.id, c.display_name]));

  for (const o of out) {
    const dos = dossiers.find((d) => d.id === o.id);
    if (dos) o.client_name = byId.get(dos.client_id) ?? null;
  }

  // Tri du plus en retard au moins en retard
  out.sort((a, b) => b.age_days - a.age_days);
  return out;
}

/**
 * Auto-création des BC fournisseurs à partir d'un dossier.
 * Stratégie : on récupère les items "tissu" du dossier, on les groupe par
 * nom de fournisseur deviné depuis le label/notes, on crée 1 BC par fournisseur.
 *
 * NOTE V1 : les items dossier n'ont pas encore de supplier_id renseigné.
 * On crée donc un BC "générique" en brouillon par défaut pour chaque dossier
 * — l'admin renseignera manuellement le fournisseur exact via /commandes.
 *
 * Idempotent : si des BC existent déjà pour ce dossier, on ne crée rien.
 */
export async function autoCreateBcsForDossier(
  dossierId: string,
  client?: AnySupabaseClient,
): Promise<{ created: number; existing: number }> {
  const supabase = client ?? (await createClient());

  // Existants ?
  const { data: existing } = await supabase
    .from("bons_commande")
    .select("id")
    .eq("dossier_id", dossierId);

  if (existing && existing.length > 0) {
    return { created: 0, existing: existing.length };
  }

  // Récupère items + dossier
  const { data: items } = await supabase
    .from("dossier_items")
    .select("id, type, label, ref, collection, matiere")
    .eq("dossier_id", dossierId);

  if (!items || items.length === 0) return { created: 0, existing: 0 };

  // Récupère le devis lié pour avoir les prix tissu / accessoires depuis meta
  const { data: dossier } = await supabase
    .from("dossiers")
    .select("devis_id")
    .eq("id", dossierId)
    .maybeSingle();
  const { data: devisLines } = (dossier?.devis_id
    ? await supabase
        .from("devis_lines")
        .select("ref, label, qty, unit_label, unit_price_ht, meta")
        .eq("devis_id", dossier.devis_id)
    : { data: [] }) as {
    data: Array<{
      ref: string | null;
      label: string;
      qty: number;
      unit_label: string;
      unit_price_ht: number;
      meta: Record<string, unknown> | null;
    }>;
  };

  // Index par label pour retrouver le devis_line correspondant à un dossier_item
  const linesByLabel = new Map(
    (devisLines ?? []).map((l) => [l.label, l]),
  );

  // Récupère suppliers actifs pour mapping basique (tissu/rail/accessoire)
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, name, type, country")
    .eq("active", true);

  if (!suppliers || suppliers.length === 0) {
    return { created: 0, existing: 0 };
  }

  const suppByType = new Map<string, typeof suppliers>();
  for (const s of suppliers) {
    const arr = suppByType.get(s.type) ?? [];
    arr.push(s);
    suppByType.set(s.type, arr);
  }

  // Cherche un fournisseur dont le pays correspond pour les BC collection
  // (PL = Pologne, UA = Ukraine). Fallback : premier fournisseur tissu.
  const tissuSuppliers = suppByType.get("tissu") ?? [];
  const findCountrySupplier = (iso: string) =>
    tissuSuppliers.find((s) => s.country === iso) ?? tissuSuppliers[0];

  // Routing pour items collection
  const collectionItems = items.filter((i) => i.collection);
  const nonCollectionItems = items.filter((i) => !i.collection);

  type GroupKey = string;
  type Group = {
    supplierId: string;
    matiere: string | null;
    routing: "standard" | "pologne" | "ukraine";
    items: typeof items;
  };
  const grouped = new Map<GroupKey, Group>();

  // --- Collection : route par matière ---
  for (const item of collectionItems) {
    const m = (item.matiere ?? "").toLowerCase();
    // LIN → Pologne ; Polyester → Ukraine
    const routing: "pologne" | "ukraine" = m === "polyester" ? "ukraine" : "pologne";
    const country = routing === "pologne" ? "PL" : "UA";
    const supplier = findCountrySupplier(country);
    if (!supplier) continue;
    const key = `${supplier.id}::${routing}::${m || "mixte"}`;
    const cur = grouped.get(key) ?? {
      supplierId: supplier.id,
      matiere: m || null,
      routing,
      items: [],
    };
    cur.items.push(item);
    grouped.set(key, cur);
  }

  // --- Items classiques : groupage par type fournisseur ---
  for (const item of nonCollectionItems) {
    if (item.type === "confection") continue;
    let suppType: string | null = null;
    if (item.type === "tissu") suppType = "tissu";
    else if (item.type === "rail") suppType = "rail";
    else if (item.type === "accessoire") suppType = "accessoire";
    else suppType = "autre";

    const candidates = suppByType.get(suppType ?? "") ?? [];
    if (candidates.length === 0) continue;
    const supplier = candidates[0];
    const key = `${supplier.id}::standard::-`;
    const cur = grouped.get(key) ?? {
      supplierId: supplier.id,
      matiere: null,
      routing: "standard" as const,
      items: [],
    };
    cur.items.push(item);
    grouped.set(key, cur);
  }

  if (grouped.size === 0) return { created: 0, existing: 0 };

  // Crée un BC par groupe (fournisseur × routing) AVEC ses bc_lines
  let created = 0;
  for (const g of grouped.values()) {
    const number = await getNextBcNumber(supabase);
    const routingLabel =
      g.routing === "pologne"
        ? "Pologne (Polo)"
        : g.routing === "ukraine"
          ? "Ukraine (XML)"
          : "Standard";
    const matiereLabel = g.matiere ? ` · matière ${g.matiere.toUpperCase()}` : "";

    // Construit les lignes BC à partir des items du groupe + meta du devis_line
    type BcLineRow = {
      bc_id: string;
      dossier_item_id: string | null;
      position: number;
      ref: string | null;
      label: string;
      qty: number;
      unit_label: string;
      unit_price_ht: number;
      total_ht: number;
    };
    const bcLines: Omit<BcLineRow, "bc_id">[] = [];
    let runningTotal = 0;
    g.items.forEach((item, idx) => {
      const dl = linesByLabel.get(item.label) ?? null;
      const meta = (dl?.meta ?? {}) as Record<string, unknown>;

      // Pour les items tissu : qté = métrage total, prix = prix tissu €/m
      // Pour les autres (rail/accessoire) : qté = item.qty du devis, prix = pu_ht du devis
      let qty: number;
      let unitLabel: string;
      let unitPrice: number;
      if (item.type === "tissu") {
        const metrage = Number(meta["metrageTotal"] ?? 0);
        const prixM = Number(meta["prixTissuMetre"] ?? meta["prixTissu"] ?? 0);
        qty = metrage > 0 ? metrage : 1;
        unitLabel = metrage > 0 ? "m" : "u";
        unitPrice = prixM;
      } else {
        qty = Number(dl?.qty ?? 1);
        unitLabel = dl?.unit_label ?? "u";
        unitPrice = Number(dl?.unit_price_ht ?? 0);
      }
      const total = Math.round(qty * unitPrice * 100) / 100;
      runningTotal += total;
      bcLines.push({
        dossier_item_id: item.id,
        position: idx,
        ref: item.ref ?? dl?.ref ?? null,
        label: dl?.label ?? item.label,
        qty,
        unit_label: unitLabel,
        unit_price_ht: unitPrice,
        total_ht: total,
      });
    });

    const amountHt = Math.round(runningTotal * 100) / 100;

    const { data: insertedBc, error } = await supabase
      .from("bons_commande")
      .insert({
        number,
        supplier_id: g.supplierId,
        dossier_id: dossierId,
        status: "brouillon",
        amount_ht: amountHt,
        language: g.routing === "ukraine" ? "UA" : g.routing === "pologne" ? "PL" : "FR",
        matiere: g.matiere,
        routing: g.routing,
        notes: `BC auto-généré · ${routingLabel}${matiereLabel}`,
      })
      .select("id")
      .maybeSingle();

    if (error || !insertedBc) continue;

    if (bcLines.length > 0) {
      await supabase
        .from("bc_lines")
        .insert(bcLines.map((l) => ({ ...l, bc_id: insertedBc.id })));
    }
    created += 1;
  }

  return { created, existing: 0 };
}
