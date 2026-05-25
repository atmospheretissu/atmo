import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

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
  const { count } = await supabase
    .from("bons_commande")
    .select("*", { count: "exact", head: true })
    .like("number", `${prefix}%`);
  return `${prefix}${String((count ?? 0) + 1).padStart(4, "0")}`;
}

export type BCWithRelations = BonCommande & {
  supplier: { id: string; name: string; type: string; franco_ht: number; language: string } | null;
  dossier: { id: string; number: string; client_id: string } | null;
  client: { display_name: string } | null;
};

export async function listBons(): Promise<BCWithRelations[]> {
  const supabase = await createClient();
  const { data: bcs } = await supabase
    .from("bons_commande")
    .select("*")
    .order("created_at", { ascending: false });
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
    .select("status, amount_ht, supplier_id");
  const stats = {
    total: bcs?.length ?? 0,
    brouillon: 0,
    envoye: 0,
    recu: 0,
    totalMonth: 0,
    francoIssues: 0,
  };
  for (const b of bcs ?? []) {
    if (b.status === "brouillon") stats.brouillon += 1;
    if (b.status === "envoye") stats.envoye += 1;
    if (b.status === "recu") stats.recu += 1;
    stats.totalMonth += Number(b.amount_ht ?? 0);
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
    .select("type, label, ref")
    .eq("dossier_id", dossierId);

  if (!items || items.length === 0) return { created: 0, existing: 0 };

  // Récupère suppliers actifs pour mapping basique (tissu/rail/accessoire)
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, name, type")
    .eq("active", true);

  if (!suppliers || suppliers.length === 0) {
    // Pas de fournisseurs créés en DB encore — on skip silencieusement
    return { created: 0, existing: 0 };
  }

  const suppByType = new Map<string, typeof suppliers>();
  for (const s of suppliers) {
    const arr = suppByType.get(s.type) ?? [];
    arr.push(s);
    suppByType.set(s.type, arr);
  }

  // Groupe items par type → fournisseur "défaut" pour le type
  const grouped = new Map<string, { supplierId: string; items: typeof items }>();
  for (const item of items) {
    if (item.type === "confection") continue; // Pas de BC fournisseur pour la confection
    let suppType: string | null = null;
    if (item.type === "tissu") suppType = "tissu";
    else if (item.type === "rail") suppType = "rail";
    else if (item.type === "accessoire") suppType = "accessoire";
    else suppType = "autre";

    const candidates = suppByType.get(suppType ?? "") ?? [];
    if (candidates.length === 0) continue;
    const supplier = candidates[0]; // premier fournisseur du type (admin pourra changer)

    const key = supplier.id;
    const cur = grouped.get(key) ?? { supplierId: supplier.id, items: [] };
    cur.items.push(item);
    grouped.set(key, cur);
  }

  if (grouped.size === 0) return { created: 0, existing: 0 };

  // Crée un BC par fournisseur
  let created = 0;
  for (const { supplierId } of grouped.values()) {
    const number = await getNextBcNumber(supabase);
    const { error } = await supabase.from("bons_commande").insert({
      number,
      supplier_id: supplierId,
      dossier_id: dossierId,
      status: "brouillon",
      amount_ht: 0, // à renseigner manuellement quand on saisira les lignes BC
      language: "FR",
      notes: "BC auto-généré depuis dossier — à compléter (lignes + franco)",
    });
    if (!error) created += 1;
  }

  return { created, existing: 0 };
}
