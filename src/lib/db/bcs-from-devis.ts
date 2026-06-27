import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getNextBcNumber } from "@/lib/db/bons-commande";

export type DevisLineForBc = {
  id: string;
  position: number;
  ref: string | null;
  label: string;
  detail: string | null;
  qty: number;
  unit_label: string;
  unit_price_ht: number;
  catalog_product_id: string | null;
  meta: Record<string, unknown> | null;
  /** Le fournisseur déduit (via catalog_products.supplier_id), null si non rattaché. */
  supplier_id: string | null;
  supplier_name: string | null;
};

export type SupplierStub = {
  id: string;
  name: string;
  type: string;
  language: string;
};

export type ExistingBc = {
  id: string;
  number: string;
  supplier_id: string | null;
  supplier_name: string | null;
  status: string;
  amount_ht: number;
  line_count: number;
  sent_at: string | null;
};

export type DevisBcPreview = {
  devis: {
    id: string;
    number: string;
    client_id: string | null;
    client_name: string | null;
    store_id: string | null;
  };
  dossierId: string | null;
  /** Toutes les lignes du devis, enrichies du fournisseur déduit. */
  lines: DevisLineForBc[];
  /** Tous les fournisseurs actifs (pour les dropdowns d'assignation). */
  suppliers: SupplierStub[];
  /** BCs déjà créés pour ce devis (via dossier_id). */
  existingBcs: ExistingBc[];
};

export async function getDevisBcPreview(devisId: string): Promise<DevisBcPreview | null> {
  const supabase = await createClient();

  const { data: devis } = await supabase
    .from("devis")
    .select("id, number, client_id, store_id, clients(display_name)")
    .eq("id", devisId)
    .maybeSingle();
  if (!devis) return null;

  const [{ data: lines }, { data: suppliers }] = await Promise.all([
    supabase
      .from("devis_lines")
      .select("id, position, ref, label, detail, qty, unit_label, unit_price_ht, catalog_product_id, meta")
      .eq("devis_id", devisId)
      .order("position", { ascending: true }),
    supabase
      .from("suppliers")
      .select("id, name, type, language")
      .order("name", { ascending: true }),
  ]);

  const productIds = Array.from(
    new Set(((lines ?? []).map((l) => l.catalog_product_id).filter(Boolean) as string[])),
  );
  const productSuppliers = new Map<string, string | null>();
  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from("catalog_products")
      .select("id, supplier_id" as "id")
      .in("id", productIds);
    for (const p of (products ?? []) as Array<{ id: string; supplier_id?: string | null }>) {
      productSuppliers.set(p.id, p.supplier_id ?? null);
    }
  }

  const supplierById = new Map((suppliers ?? []).map((s) => [s.id, s]));

  const enrichedLines: DevisLineForBc[] = (lines ?? []).map((l) => {
    const sid = l.catalog_product_id ? productSuppliers.get(l.catalog_product_id) ?? null : null;
    const sup = sid ? supplierById.get(sid) ?? null : null;
    return {
      id: l.id,
      position: l.position,
      ref: l.ref,
      label: l.label,
      detail: l.detail,
      qty: Number(l.qty ?? 0),
      unit_label: l.unit_label,
      unit_price_ht: Number(l.unit_price_ht ?? 0),
      catalog_product_id: l.catalog_product_id,
      meta: (l.meta as Record<string, unknown> | null) ?? null,
      supplier_id: sid,
      supplier_name: sup?.name ?? null,
    };
  });

  // Cherche un dossier rattaché au devis (la liaison BC ↔ devis passe par lui)
  const { data: dossier } = await supabase
    .from("dossiers")
    .select("id")
    .eq("devis_id", devisId)
    .maybeSingle();
  const dossierId = dossier?.id ?? null;

  let existingBcs: ExistingBc[] = [];
  if (dossierId) {
    const { data: bcs } = await supabase
      .from("bons_commande")
      .select("id, number, supplier_id, status, amount_ht, sent_at")
      .eq("dossier_id", dossierId)
      .order("created_at", { ascending: true });
    if (bcs && bcs.length > 0) {
      const bcIds = bcs.map((b) => b.id);
      const { data: lineCounts } = await supabase
        .from("bc_lines")
        .select("bc_id")
        .in("bc_id", bcIds);
      const countByBc = new Map<string, number>();
      for (const l of lineCounts ?? []) {
        countByBc.set(l.bc_id, (countByBc.get(l.bc_id) ?? 0) + 1);
      }
      existingBcs = bcs.map((b) => ({
        id: b.id,
        number: b.number,
        supplier_id: b.supplier_id,
        supplier_name: b.supplier_id ? supplierById.get(b.supplier_id)?.name ?? null : null,
        status: b.status,
        amount_ht: Number(b.amount_ht ?? 0),
        line_count: countByBc.get(b.id) ?? 0,
        sent_at: b.sent_at,
      }));
    }
  }

  return {
    devis: {
      id: devis.id,
      number: devis.number,
      client_id: devis.client_id,
      client_name: ((devis as { clients?: { display_name?: string } | null }).clients?.display_name) ?? null,
      store_id: (devis as { store_id?: string | null }).store_id ?? null,
    },
    dossierId,
    lines: enrichedLines,
    suppliers: (suppliers ?? []).map((s) => ({ id: s.id, name: s.name, type: s.type, language: s.language })),
    existingBcs,
  };
}

export type CreateBcsResult = {
  ok: boolean;
  message?: string;
  /** BCs créés : 1 par fournisseur assigné. */
  bcs: { supplierId: string; supplierName: string; bcId: string; bcNumber: string; lineCount: number }[];
  /** Lignes laissées sans fournisseur (non incluses dans aucun BC). */
  skippedLineCount: number;
};

/**
 * Crée 1 bon de commande par fournisseur assigné.
 *
 *   assignments : { lineId → supplierId | null }
 *   Les lignes sans fournisseur (null) sont ignorées (skippedLineCount).
 *   Idempotence : un même devis peut générer plusieurs BCs si on relance —
 *   on n'empêche pas. Au resp_confection d'archiver les doublons.
 */
export async function createBcsFromDevisAssignments(
  devisId: string,
  assignments: Record<string, string | null>,
): Promise<CreateBcsResult> {
  const admin = createServiceRoleClient();
  const preview = await getDevisBcPreview(devisId);
  if (!preview) return { ok: false, message: "Devis introuvable", bcs: [], skippedLineCount: 0 };
  const dossierId = preview.dossierId;

  const linesById = new Map(preview.lines.map((l) => [l.id, l]));
  const supplierById = new Map(preview.suppliers.map((s) => [s.id, s]));

  // Group: supplierId → lignes
  const bySupplier = new Map<string, DevisLineForBc[]>();
  let skippedCount = 0;
  for (const line of preview.lines) {
    const supplierId = assignments[line.id] ?? line.supplier_id;
    if (!supplierId) {
      skippedCount += 1;
      continue;
    }
    if (!bySupplier.has(supplierId)) bySupplier.set(supplierId, []);
    bySupplier.get(supplierId)!.push(line);
  }

  if (bySupplier.size === 0) {
    return {
      ok: false,
      message: "Aucune ligne attribuée à un fournisseur",
      bcs: [],
      skippedLineCount: skippedCount,
    };
  }

  const created: CreateBcsResult["bcs"] = [];
  const failures: string[] = [];

  for (const [supplierId, lines] of bySupplier) {
    const supplier = supplierById.get(supplierId);
    if (!supplier) {
      failures.push(`Fournisseur ${supplierId} introuvable`);
      continue;
    }

    const amount = lines.reduce((s, l) => s + l.qty * l.unit_price_ht, 0);
    const lang = (["FR", "EN", "PL", "UA", "DE"] as const).includes(supplier.language as "FR")
      ? (supplier.language as "FR" | "EN" | "PL" | "UA" | "DE")
      : "FR";

    // Retry sur collision de numéro (course condition possible si plusieurs
    // BCs sont créés très rapprochés).
    let bc: { id: string; number: string } | null = null;
    let bcErr: { message: string; code?: string } | null = null;
    for (let attempt = 0; attempt < 5 && !bc; attempt++) {
      const number = await getNextBcNumber(admin);
      const r = await admin
        .from("bons_commande")
        .insert({
          number,
          supplier_id: supplierId,
          dossier_id: dossierId,
          status: "brouillon",
          amount_ht: amount,
          language: lang,
          notes: `Généré depuis le devis ${preview.devis.number}`,
        })
        .select("id, number")
        .single();
      if (r.error) {
        bcErr = r.error;
        // 23505 = unique_violation → on retry avec un nouveau numéro
        if (r.error.code === "23505") {
          console.warn(`[createBcsFromDevis] collision numéro ${number}, retry ${attempt + 1}/5`);
          continue;
        }
        break;
      }
      bc = r.data;
      bcErr = null;
    }
    if (!bc || bcErr) {
      console.error("[createBcsFromDevis] BC insert failed for", supplier.name, bcErr);
      failures.push(`${supplier.name} : ${bcErr?.message ?? "insert returned no row"}`);
      continue;
    }

    const bcLines = lines.map((l, idx) => ({
      bc_id: bc.id,
      position: idx,
      ref: l.ref,
      label: l.label,
      qty: l.qty,
      unit_label: l.unit_label,
      unit_price_ht: l.unit_price_ht,
    }));
    const { error: linesErr } = await admin.from("bc_lines").insert(bcLines);
    if (linesErr) {
      console.error("[createBcsFromDevis] bc_lines insert failed for BC", bc.number, linesErr);
      failures.push(`${supplier.name} (lignes) : ${linesErr.message}`);
      // Rollback : supprime le BC qui ne contient pas ses lignes
      await admin.from("bons_commande").delete().eq("id", bc.id);
      continue;
    }

    created.push({
      supplierId,
      supplierName: supplier.name,
      bcId: bc.id,
      bcNumber: bc.number,
      lineCount: lines.length,
    });
  }

  // Si rien n'a été créé alors que des fournisseurs étaient pourtant assignés,
  // c'est un échec — remonte le message au lieu de retourner ok:true silencieux.
  if (created.length === 0) {
    return {
      ok: false,
      message: failures.length > 0
        ? `Aucun BC créé. ${failures.join(" · ")}`
        : "Aucun BC créé (raison inconnue — vérifie les logs serveur).",
      bcs: [],
      skippedLineCount: skippedCount,
    };
  }

  return {
    ok: true,
    message: failures.length > 0 ? `Erreurs : ${failures.join(" · ")}` : undefined,
    bcs: created,
    skippedLineCount: skippedCount,
  };
}
