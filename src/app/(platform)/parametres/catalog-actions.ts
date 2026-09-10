"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { listCatalogProductsPage } from "@/lib/db/catalog";
import type { CatalogProduct } from "@/components/parametres/catalog-tab";

export async function searchCatalogPageAction(opts: {
  q?: string;
  category?: string | null;
  supplier?: string | null;
  source?: "atmo" | "external" | null;
  page?: number;
  pageSize?: number;
}): Promise<{
  products: CatalogProduct[];
  total: number;
  suppliers: string[];
}> {
  const r = await listCatalogProductsPage(opts);
  return { products: r.products, total: r.total, suppliers: r.suppliers };
}

export type CatalogProductInput = {
  ref: string;
  name: string;
  category: string;
  description?: string | null;
  unit_price_ht: number | null;
  unit_label?: string;
  width_cm?: number | null;
  raccord_cm?: number | null;
  is_collection?: boolean;
  stock_poland?: number;
  stock_ukraine?: number;
  active?: boolean;
  supplier_name?: string | null;
};

function sanitize(input: CatalogProductInput): CatalogProductInput {
  return {
    ref: input.ref.trim(),
    name: input.name.trim(),
    category: input.category.trim() || "Autre",
    description: input.description?.trim() || null,
    unit_price_ht:
      input.unit_price_ht == null || !Number.isFinite(input.unit_price_ht)
        ? null
        : input.unit_price_ht < 0
          ? 0
          : Math.round(Number(input.unit_price_ht) * 100) / 100,
    unit_label: input.unit_label?.trim() || "u",
    width_cm: input.width_cm != null && Number.isFinite(input.width_cm) ? input.width_cm : null,
    raccord_cm:
      input.raccord_cm != null && Number.isFinite(input.raccord_cm) ? input.raccord_cm : null,
    is_collection: Boolean(input.is_collection),
    stock_poland:
      Number.isFinite(input.stock_poland ?? 0) ? Math.max(0, Math.floor(input.stock_poland ?? 0)) : 0,
    stock_ukraine:
      Number.isFinite(input.stock_ukraine ?? 0) ? Math.max(0, Math.floor(input.stock_ukraine ?? 0)) : 0,
    active: input.active ?? true,
    supplier_name: input.supplier_name?.trim() || null,
  };
}

function validate(input: CatalogProductInput): string | null {
  if (!input.ref) return "Référence requise.";
  if (input.ref.length > 60) return "Référence trop longue.";
  if (!input.name) return "Nom requis.";
  if (input.unit_price_ht != null && input.unit_price_ht < 0)
    return "Prix HT invalide.";
  return null;
}

export async function createCatalogProductAction(
  input: CatalogProductInput,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const clean = sanitize(input);
  const err = validate(clean);
  if (err) return { ok: false, message: err };

  const supabase = await createClient();
  // Cast : supplier_name / unit_price_ht nullable pas encore dans Database.
  const { data, error } = await (
    supabase as unknown as {
      from: (t: string) => {
        insert: (v: unknown) => {
          select: (s: string) => {
            maybeSingle: () => Promise<{
              data: { id: string } | null;
              error: { message?: string } | null;
            }>;
          };
        };
      };
    }
  )
    .from("catalog_products")
    .insert(clean)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return {
      ok: false,
      message:
        error?.message?.includes("duplicate")
          ? `Référence "${clean.ref}"${clean.supplier_name ? ` chez "${clean.supplier_name}"` : ""} déjà utilisée.`
          : error?.message ?? "Échec création",
    };
  }
  revalidatePath("/parametres");
  return { ok: true, id: data.id };
}

export async function updateCatalogProductAction(
  id: string,
  input: CatalogProductInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const clean = sanitize(input);
  const err = validate(clean);
  if (err) return { ok: false, message: err };

  const supabase = await createClient();
  const { error } = await (
    supabase as unknown as {
      from: (t: string) => {
        update: (v: unknown) => {
          eq: (
            c: string,
            v: string,
          ) => Promise<{ error: { message?: string } | null }>;
        };
      };
    }
  )
    .from("catalog_products")
    .update(clean)
    .eq("id", id);
  if (error) {
    return {
      ok: false,
      message:
        (error.message ?? "").includes("duplicate")
          ? `Référence "${clean.ref}"${clean.supplier_name ? ` chez "${clean.supplier_name}"` : ""} déjà utilisée.`
          : error.message ?? "Échec mise à jour",
    };
  }
  revalidatePath("/parametres");
  return { ok: true };
}

export async function deleteCatalogProductAction(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("catalog_products").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  return { ok: true };
}

export async function toggleCatalogProductActiveAction(
  id: string,
  active: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("catalog_products")
    .update({ active })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  return { ok: true };
}

// ────────────────────────────────────────────────────────────────────
// Bulk edit
// ────────────────────────────────────────────────────────────────────

export async function bulkUpdateCatalogAction(
  ids: string[],
  patch: Partial<Pick<CatalogProductInput, "category" | "unit_label" | "active" | "is_collection">> & {
    price_multiplier?: number; // multiplier > 0 : appliqué au prix (arrondi centime)
  },
): Promise<{ ok: boolean; message?: string; updated: number }> {
  if (ids.length === 0) return { ok: false, message: "Aucune sélection.", updated: 0 };
  const supabase = await createClient();
  const updateBase: Record<string, unknown> = {};
  if (patch.category) updateBase.category = patch.category;
  if (patch.unit_label) updateBase.unit_label = patch.unit_label;
  if (patch.active !== undefined) updateBase.active = patch.active;
  if (patch.is_collection !== undefined) updateBase.is_collection = patch.is_collection;

  // 1. Multiplicateur de prix : nécessite lecture + update en 2 temps
  if (patch.price_multiplier && patch.price_multiplier > 0 && patch.price_multiplier !== 1) {
    const { data: rows } = await supabase
      .from("catalog_products")
      .select("id, unit_price_ht")
      .in("id", ids);
    for (const r of rows ?? []) {
      const newPrice = Math.round(Number(r.unit_price_ht) * patch.price_multiplier * 100) / 100;
      await supabase.from("catalog_products").update({ unit_price_ht: newPrice }).eq("id", r.id);
    }
  }

  // 2. Champs simples appliqués en un update
  if (Object.keys(updateBase).length > 0) {
    const { error } = await supabase
      .from("catalog_products")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(updateBase as any)
      .in("id", ids);
    if (error) return { ok: false, message: error.message, updated: 0 };
  }

  revalidatePath("/parametres");
  return { ok: true, updated: ids.length };
}

export async function bulkDeleteCatalogAction(
  ids: string[],
): Promise<{ ok: boolean; message?: string; deleted: number }> {
  if (ids.length === 0) return { ok: false, message: "Aucune sélection.", deleted: 0 };
  const supabase = await createClient();
  const { error } = await supabase.from("catalog_products").delete().in("id", ids);
  if (error) return { ok: false, message: error.message, deleted: 0 };
  revalidatePath("/parametres");
  return { ok: true, deleted: ids.length };
}

// ────────────────────────────────────────────────────────────────────
// Import CSV
// ────────────────────────────────────────────────────────────────────

export type CsvRow = {
  ref: string;
  name: string;
  category?: string;
  description?: string;
  unit_price_ht?: number;
  unit_label?: string;
  width_cm?: number | null;
  raccord_cm?: number | null;
  is_collection?: boolean;
  stock_poland?: number;
  stock_ukraine?: number;
  active?: boolean;
  supplier_name?: string | null;
};

export type ImportPreview = {
  toCreate: CsvRow[];
  toUpdate: { row: CsvRow; existingRef: string }[];
  errors: { line: number; ref: string; message: string }[];
};

/** Clé naturelle composite : ref + fournisseur (vide si non renseigné). */
function catalogKey(ref: string, supplier: string | null | undefined): string {
  return `${ref}||${(supplier ?? "").trim()}`;
}

/** Parse un fichier CSV (déjà chargé côté client comme texte) et prévisualise. */
export async function previewCsvImportAction(
  csvText: string,
): Promise<ImportPreview> {
  const supabase = await createClient();
  const parsed = parseCsvClient(csvText);

  // Récupère toutes les paires (ref, supplier_name) existantes pour distinguer
  // create/update. Match par couple : un même ref chez 2 fournisseurs différents
  // = 2 lignes distinctes.
  const refs = parsed.rows.map((r) => r.ref).filter((r) => r.length > 0);
  const existingKeys = new Set<string>();
  if (refs.length > 0) {
    const chunkSize = 500;
    for (let i = 0; i < refs.length; i += chunkSize) {
      const chunk = refs.slice(i, i + chunkSize);
      const { data } = (await (
        supabase as unknown as {
          from: (t: string) => {
            select: (s: string) => {
              in: (
                c: string,
                v: string[],
              ) => Promise<{
                data: { ref: string; supplier_name: string | null }[] | null;
              }>;
            };
          };
        }
      )
        .from("catalog_products")
        .select("ref, supplier_name")
        .in("ref", chunk)) as {
        data: { ref: string; supplier_name: string | null }[] | null;
      };
      for (const r of data ?? []) {
        existingKeys.add(catalogKey(r.ref, r.supplier_name));
      }
    }
  }

  const toCreate: CsvRow[] = [];
  const toUpdate: { row: CsvRow; existingRef: string }[] = [];
  for (const r of parsed.rows) {
    if (existingKeys.has(catalogKey(r.ref, r.supplier_name))) {
      toUpdate.push({ row: r, existingRef: r.ref });
    } else {
      toCreate.push(r);
    }
  }

  return { toCreate, toUpdate, errors: parsed.errors };
}

export type CommitImportResult = {
  ok: boolean;
  message?: string;
  created: number;
  updated: number;
  errors: number;
  /** Détails des erreurs (max 100) — permet à l'utilisateur de savoir
   * précisément pourquoi certaines lignes ont échoué. */
  errorDetails: { line: number; ref: string; message: string }[];
  /** Temps total d'exécution en ms — logué et retourné pour diagnostic. */
  durationMs: number;
};

/**
 * Import CSV — version optimisée bulk.
 *
 * Ancienne version (Louis 08/09) : pour 600 lignes, 1200-1800 round-trips
 * DB séquentiels (1 SELECT + 1 INSERT/UPDATE par ligne) → ~4 min via pooler
 * eu-north-1. Nouvelle version : batchée en 3 étapes.
 *
 * 1. Fetch bulk des existants (ref, supplier_name, id) par chunks de 500 refs.
 * 2. Split local en toInsert / toUpdate via Map.
 * 3. Insert bulk (chunks de 200) + updates en parallèle (chunks de 20 en //).
 *
 * Gain typique : ~30x. Pour 600 lignes on tombe à ~5-10 s.
 */
export async function commitCsvImportAction(
  csvText: string,
): Promise<CommitImportResult> {
  const t0 = Date.now();
  const supabase = await createClient();
  const parsed = parseCsvClient(csvText);
  const errorDetails: { line: number; ref: string; message: string }[] = [
    ...parsed.errors,
  ];
  let created = 0;
  let updated = 0;

  // 1. Sanitize + validate en local (aucun round-trip DB).
  type Prepared = {
    line: number;
    clean: CatalogProductInput;
  };
  const prepared: Prepared[] = [];
  parsed.rows.forEach((row, idx) => {
    const clean = sanitize({
      ref: row.ref,
      name: row.name,
      category: row.category ?? "Autre",
      description: row.description ?? null,
      unit_price_ht: Number(row.unit_price_ht ?? 0),
      unit_label: row.unit_label ?? "u",
      width_cm: row.width_cm ?? null,
      raccord_cm: row.raccord_cm ?? null,
      is_collection: row.is_collection ?? false,
      stock_poland: row.stock_poland ?? 0,
      stock_ukraine: row.stock_ukraine ?? 0,
      active: row.active ?? true,
      supplier_name: row.supplier_name ?? null,
    });
    const err = validate(clean);
    if (err) {
      errorDetails.push({ line: idx + 2, ref: clean.ref, message: err });
      return;
    }
    prepared.push({ line: idx + 2, clean });
  });

  // 2. Détecte les doublons intra-CSV (même clé composite dans le fichier).
  //    Sans ça, les inserts bulk violent l'unique index en cascade et TOUT
  //    le batch est rejeté (cause des erreurs mystérieuses côté Louis).
  const seenKeys = new Map<string, number>();
  const deduped: Prepared[] = [];
  for (const p of prepared) {
    const key = catalogKey(p.clean.ref, p.clean.supplier_name);
    const dup = seenKeys.get(key);
    if (dup !== undefined) {
      errorDetails.push({
        line: p.line,
        ref: p.clean.ref,
        message: `Doublon dans le CSV : même (ref + fournisseur) que ligne ${dup}. Seule la première est prise en compte.`,
      });
      continue;
    }
    seenKeys.set(key, p.line);
    deduped.push(p);
  }

  if (deduped.length === 0) {
    return {
      ok: true,
      created: 0,
      updated: 0,
      errors: errorDetails.length,
      errorDetails: errorDetails.slice(0, 100),
      durationMs: Date.now() - t0,
    };
  }

  // 3. Fetch bulk des lignes existantes — un seul SELECT par chunk de 500 refs.
  //    On récupère (id, ref, supplier_name) pour construire le lookup local.
  const allRefs = Array.from(new Set(deduped.map((p) => p.clean.ref)));
  type ExistingRow = {
    id: string;
    ref: string;
    supplier_name: string | null;
  };
  const existingByKey = new Map<string, string>(); // key → id
  const CHUNK_LOOKUP = 500;
  for (let i = 0; i < allRefs.length; i += CHUNK_LOOKUP) {
    const chunk = allRefs.slice(i, i + CHUNK_LOOKUP);
    const { data } = (await (
      supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            in: (
              c: string,
              v: string[],
            ) => Promise<{ data: ExistingRow[] | null }>;
          };
        };
      }
    )
      .from("catalog_products")
      .select("id, ref, supplier_name")
      .in("ref", chunk)) as { data: ExistingRow[] | null };
    for (const r of data ?? []) {
      existingByKey.set(catalogKey(r.ref, r.supplier_name), r.id);
    }
  }

  // 4. Split en toInsert / toUpdate.
  const toInsert: Prepared[] = [];
  const toUpdate: (Prepared & { id: string })[] = [];
  for (const p of deduped) {
    const key = catalogKey(p.clean.ref, p.clean.supplier_name);
    const existingId = existingByKey.get(key);
    if (existingId) toUpdate.push({ ...p, id: existingId });
    else toInsert.push(p);
  }

  // 5. Insert bulk par chunks de 200.
  const CHUNK_INSERT = 200;
  for (let i = 0; i < toInsert.length; i += CHUNK_INSERT) {
    const chunk = toInsert.slice(i, i + CHUNK_INSERT);
    const rows = chunk.map((p) => p.clean);
    const { error } = await (
      supabase as unknown as {
        from: (t: string) => {
          insert: (v: unknown) => Promise<{
            error: { message?: string } | null;
          }>;
        };
      }
    )
      .from("catalog_products")
      .insert(rows);
    if (error) {
      // Si le bulk plante, on retombe en unitaire pour identifier les
      // lignes fautives précises (au lieu de perdre tout le chunk).
      for (const p of chunk) {
        const { error: eOne } = await (
          supabase as unknown as {
            from: (t: string) => {
              insert: (v: unknown) => Promise<{
                error: { message?: string } | null;
              }>;
            };
          }
        )
          .from("catalog_products")
          .insert(p.clean);
        if (eOne) {
          errorDetails.push({
            line: p.line,
            ref: p.clean.ref,
            message: eOne.message ?? "Insertion échouée",
          });
        } else {
          created++;
        }
      }
    } else {
      created += chunk.length;
    }
  }

  // 6. Update en parallèle par chunks de 20 promises. Chaque update est
  //    unitaire (Supabase n'expose pas de bulk update natif).
  const CHUNK_UPDATE = 20;
  for (let i = 0; i < toUpdate.length; i += CHUNK_UPDATE) {
    const chunk = toUpdate.slice(i, i + CHUNK_UPDATE);
    const results = await Promise.all(
      chunk.map((p) =>
        (
          supabase as unknown as {
            from: (t: string) => {
              update: (v: unknown) => {
                eq: (c: string, v: string) => Promise<{
                  error: { message?: string } | null;
                }>;
              };
            };
          }
        )
          .from("catalog_products")
          .update(p.clean)
          .eq("id", p.id),
      ),
    );
    results.forEach((r, idx) => {
      if (r.error) {
        errorDetails.push({
          line: chunk[idx].line,
          ref: chunk[idx].clean.ref,
          message: r.error.message ?? "Mise à jour échouée",
        });
      } else {
        updated++;
      }
    });
  }

  revalidatePath("/parametres");
  return {
    ok: true,
    created,
    updated,
    errors: errorDetails.length,
    errorDetails: errorDetails.slice(0, 100),
    durationMs: Date.now() - t0,
  };
}

/** Parseur CSV maison — supporte RFC 4180 (guillemets, virgules dans champs). */
function parseCsvClient(text: string): {
  rows: CsvRow[];
  errors: { line: number; ref: string; message: string }[];
} {
  const cleaned = text.replace(/^﻿/, ""); // strip BOM
  const errors: { line: number; ref: string; message: string }[] = [];
  const rowsRaw: string[][] = [];

  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (inQuotes) {
      if (c === '"' && cleaned[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        record.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (field !== "" || record.length > 0) {
          record.push(field);
          rowsRaw.push(record);
          field = "";
          record = [];
        }
        if (c === "\r" && cleaned[i + 1] === "\n") i++;
      } else {
        field += c;
      }
    }
  }
  if (field !== "" || record.length > 0) {
    record.push(field);
    rowsRaw.push(record);
  }

  if (rowsRaw.length === 0) return { rows: [], errors };

  const header = rowsRaw[0].map((c) => c.trim().toLowerCase());
  const rows: CsvRow[] = [];
  for (let i = 1; i < rowsRaw.length; i++) {
    const line = rowsRaw[i];
    const record: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) {
      record[header[j]] = (line[j] ?? "").trim();
    }
    const ref = record.ref;
    if (!ref) {
      errors.push({ line: i + 1, ref: "", message: "Référence vide" });
      continue;
    }
    if (!record.name) {
      errors.push({ line: i + 1, ref, message: "Nom vide" });
      continue;
    }
    const priceHtStr = (record.unit_price_ht ?? "").replace(",", ".");
    const priceTtcStr = (record.unit_price_ttc ?? record.prix_ttc ?? "").replace(",", ".");
    let unitPriceHt = 0;
    if (priceHtStr && Number.isFinite(Number(priceHtStr))) {
      unitPriceHt = Number(priceHtStr);
    } else if (priceTtcStr && Number.isFinite(Number(priceTtcStr))) {
      unitPriceHt = Math.round((Number(priceTtcStr) / 1.2) * 100) / 100;
    }
    const width = record.width_cm ? Number(record.width_cm) : null;
    const raccord = record.raccord_cm ? Number(record.raccord_cm) : null;
    const isCol =
      ["1", "true", "vrai", "oui"].includes(String(record.is_collection).toLowerCase());
    const active =
      record.active === "" ||
      ["1", "true", "vrai", "oui"].includes(String(record.active).toLowerCase());
    const supplier =
      record.supplier_name || record.fournisseur || record.supplier || "";
    rows.push({
      ref,
      name: record.name,
      category: record.category || undefined,
      description: record.description || undefined,
      unit_price_ht: unitPriceHt,
      unit_label: record.unit_label || record.unite || record.unit || undefined,
      width_cm: width != null && Number.isFinite(width) ? width : null,
      raccord_cm: raccord != null && Number.isFinite(raccord) ? raccord : null,
      is_collection: isCol,
      stock_poland: record.stock_poland ? Number(record.stock_poland) : 0,
      stock_ukraine: record.stock_ukraine ? Number(record.stock_ukraine) : 0,
      active,
      supplier_name: supplier || null,
    });
  }
  return { rows, errors };
}
