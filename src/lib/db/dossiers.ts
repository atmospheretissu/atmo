import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Type d'un client Supabase utilisable par les fonctions DB de ce fichier.
 * On accepte aussi bien la version auth-aware que la version service-role —
 * utile pour les webhooks / cron qui n'ont pas de session user.
 */
type AnySupabaseClient = SupabaseClient<Database>;

export type Dossier = Database["public"]["Tables"]["dossiers"]["Row"];
export type DossierInsert = Database["public"]["Tables"]["dossiers"]["Insert"];
export type DossierItem = Database["public"]["Tables"]["dossier_items"]["Row"];
export type DossierItemInsert = Database["public"]["Tables"]["dossier_items"]["Insert"];
export type DossierItemType = Database["public"]["Enums"]["dossier_item_type"];

/**
 * Génère le prochain numéro de dossier DOS-{year}-{NNNN}.
 */
export async function getNextDossierNumber(
  client?: AnySupabaseClient,
): Promise<string> {
  const supabase = client ?? (await createClient());
  const year = new Date().getFullYear();
  const prefix = `DOS-${year}-`;
  const { count, error } = await supabase
    .from("dossiers")
    .select("*", { count: "exact", head: true })
    .like("number", `${prefix}%`);
  if (error) throw error;
  const next = (count ?? 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

/**
 * Génère un code QR court et unique pour un item.
 * Format: QR-{base32 6 chars} — assez court pour être lisible, unique en pratique.
 */
function generateQrCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `QR-${s}`;
}

/**
 * Déduit le type de dossier_item à partir de la meta d'une ligne de devis.
 * Les types possibles : tissu, rail, accessoire, autre, confection.
 */
function inferItemType(meta: Record<string, unknown> | null | undefined): DossierItemType {
  if (!meta) return "autre";
  const ta = String(meta["typeArticle"] ?? meta["type"] ?? "");
  if (ta === "rideau_tissu_confection" || ta === "store_tissu_confection") return "tissu";
  if (ta === "rail") return "rail";
  if (ta === "mecanisme") return "rail";
  if (ta === "pose_rideau" || ta === "pose_store") return "autre";
  if (ta === "rideau_serie") return "autre";
  if (ta === "produit") return "accessoire";
  return "autre";
}

/**
 * Convertit un devis (validé / acompte reçu) en dossier de confection.
 * Idempotent : si un dossier existe déjà pour ce devis, retourne le dossier existant.
 *
 * Stratégie :
 *   - 1 ligne de devis = 1 dossier_item (sauf les lignes de pose qui sont skip)
 *   - QR code unique par item
 *   - Statut initial : en_attente
 *   - Supplier_id : null (à renseigner manuellement plus tard)
 *   - Couturière : null (assignation semi-auto en Part 2)
 */
export async function createDossierFromDevis(
  devisId: string,
  /**
   * Client Supabase optionnel — passe un service-role client depuis un webhook
   * ou un cron sans session user, pour bypasser les RLS qui exigent un rôle
   * 'staff'. Sinon utilise le client auth-aware par défaut.
   */
  client?: AnySupabaseClient,
): Promise<{ ok: true; dossierId: string; created: boolean } | { ok: false; message: string }> {
  const supabase = client ?? (await createClient());

  // 1. Vérifie si un dossier existe déjà pour ce devis
  const { data: existing, error: e0 } = await supabase
    .from("dossiers")
    .select("id")
    .eq("devis_id", devisId)
    .maybeSingle();
  if (e0) return { ok: false, message: e0.message };
  if (existing) {
    return { ok: true, dossierId: existing.id, created: false };
  }

  // 2. Récupère le devis et ses lignes
  const { data: devis, error: e1 } = await supabase
    .from("devis")
    .select("*")
    .eq("id", devisId)
    .maybeSingle();
  if (e1) return { ok: false, message: e1.message };
  if (!devis) return { ok: false, message: "Devis introuvable" };

  const { data: lines, error: e2 } = await supabase
    .from("devis_lines")
    .select("*")
    .eq("devis_id", devisId)
    .order("position", { ascending: true });
  if (e2) return { ok: false, message: e2.message };

  // 3. Crée le dossier
  const number = await getNextDossierNumber(supabase);
  const { data: dossier, error: e3 } = await supabase
    .from("dossiers")
    .insert({
      number,
      devis_id: devisId,
      client_id: devis.client_id,
      status: "en_cours",
      total_ttc: devis.total_ttc,
      acompte_paid: devis.status === "acompte_recu",
      acompte_paid_at: devis.status === "acompte_recu" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (e3 || !dossier) {
    return { ok: false, message: e3?.message ?? "Échec création dossier" };
  }

  // 4. Crée les items à partir des lignes (filtre les poses)
  const items: DossierItemInsert[] = (lines ?? [])
    .filter((l) => {
      const meta = (l.meta ?? {}) as Record<string, unknown>;
      const ta = String(meta["typeArticle"] ?? meta["type"] ?? "");
      return ta !== "pose_rideau" && ta !== "pose_store";
    })
    .map((l, idx) => {
      const meta = (l.meta ?? {}) as Record<string, unknown>;
      const itemType = inferItemType(meta);
      return {
        dossier_id: dossier.id,
        type: itemType,
        label: l.label,
        ref: l.ref ?? null,
        status: "en_attente" as const,
        qr_code: generateQrCode(),
        qty: l.qty,
        unit_label: l.unit_label,
        notes: l.detail ?? null,
        position: idx,
      };
    });

  if (items.length > 0) {
    const { error: e4 } = await supabase.from("dossier_items").insert(items);
    if (e4) {
      // Cleanup
      await supabase.from("dossiers").delete().eq("id", dossier.id);
      return { ok: false, message: `Échec création items: ${e4.message}` };
    }
  }

  // 5. Auto-création des BC fournisseurs (best-effort, ne bloque pas)
  try {
    const { autoCreateBcsForDossier } = await import("@/lib/db/bons-commande");
    await autoCreateBcsForDossier(dossier.id, supabase);
  } catch (err) {
    console.warn("autoCreateBcsForDossier failed:", err);
  }

  return { ok: true, dossierId: dossier.id, created: true };
}

/**
 * Liste les dossiers d'un client.
 */
export async function listDossiersByClient(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dossiers")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Liste tous les dossiers + leur client (2 queries jointes côté app).
 * Inclut le compteur d'items reçus / total.
 */
export type DossierWithClient = Dossier & {
  client: { id: string; display_name: string; city: string | null } | null;
  itemsReceived: number;
  itemsTotal: number;
};

export async function listAllDossiers(): Promise<DossierWithClient[]> {
  const supabase = await createClient();
  const { data: dossiers, error: e1 } = await supabase
    .from("dossiers")
    .select("*")
    .order("created_at", { ascending: false });
  if (e1) throw e1;
  if (!dossiers || dossiers.length === 0) return [];

  const clientIds = Array.from(new Set(dossiers.map((d) => d.client_id)));
  const dossierIds = dossiers.map((d) => d.id);

  const [{ data: clients }, { data: items }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, display_name, city")
      .in("id", clientIds),
    supabase
      .from("dossier_items")
      .select("dossier_id, status")
      .in("dossier_id", dossierIds),
  ]);

  const clientsById = new Map((clients ?? []).map((c) => [c.id, c]));
  const itemsByDossier = new Map<string, { total: number; recus: number }>();
  for (const i of items ?? []) {
    const cur = itemsByDossier.get(i.dossier_id) ?? { total: 0, recus: 0 };
    cur.total += 1;
    if (i.status === "recu") cur.recus += 1;
    itemsByDossier.set(i.dossier_id, cur);
  }

  return dossiers.map((d) => {
    const counts = itemsByDossier.get(d.id) ?? { total: 0, recus: 0 };
    return {
      ...d,
      client: clientsById.get(d.client_id) ?? null,
      itemsReceived: counts.recus,
      itemsTotal: counts.total,
    };
  });
}

/**
 * Détail d'un dossier + items + devis_lines du devis source (avec meta
 * pour la fiche couturier).
 */
export async function getDossierForFiche(id: string) {
  const supabase = await createClient();
  const { data: dossier, error: e1 } = await supabase
    .from("dossiers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (e1) throw e1;
  if (!dossier) return null;

  const [{ data: client }, { data: items }, { data: devisLines }, { data: devis }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", dossier.client_id).maybeSingle(),
    supabase
      .from("dossier_items")
      .select("*")
      .eq("dossier_id", id)
      .order("position", { ascending: true }),
    dossier.devis_id
      ? supabase
          .from("devis_lines")
          .select("*")
          .eq("devis_id", dossier.devis_id)
          .order("position", { ascending: true })
      : Promise.resolve({ data: [] as never[] }),
    dossier.devis_id
      ? supabase
          .from("devis")
          .select("number, version, created_at")
          .eq("id", dossier.devis_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    dossier,
    client: client ?? null,
    items: items ?? [],
    devisLines: devisLines ?? [],
    devis: devis ?? null,
  };
}

/**
 * Détail d'un dossier + tous ses items.
 */
export async function getDossierDetail(id: string) {
  const supabase = await createClient();
  const { data: dossier, error: e1 } = await supabase
    .from("dossiers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (e1) throw e1;
  if (!dossier) return null;

  const [{ data: client }, { data: items }] = await Promise.all([
    supabase
      .from("clients")
      .select("*")
      .eq("id", dossier.client_id)
      .maybeSingle(),
    supabase
      .from("dossier_items")
      .select("*")
      .eq("dossier_id", id)
      .order("position", { ascending: true }),
  ]);

  return { dossier, client: client ?? null, items: items ?? [] };
}
