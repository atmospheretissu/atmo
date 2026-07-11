"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { listCatalogProductsPage } from "@/lib/db/catalog";
import type { CatalogProduct } from "@/components/parametres/catalog-tab";

export async function searchCatalogPageAction(opts: {
  q?: string;
  category?: string | null;
  page?: number;
  pageSize?: number;
}): Promise<{ products: CatalogProduct[]; total: number }> {
  const r = await listCatalogProductsPage(opts);
  return { products: r.products, total: r.total };
}

export type CatalogProductInput = {
  ref: string;
  name: string;
  category: string;
  description?: string | null;
  unit_price_ht: number;
  unit_label?: string;
  width_cm?: number | null;
  raccord_cm?: number | null;
  is_collection?: boolean;
  stock_poland?: number;
  stock_ukraine?: number;
  active?: boolean;
};

function sanitize(input: CatalogProductInput): CatalogProductInput {
  return {
    ref: input.ref.trim(),
    name: input.name.trim(),
    category: input.category.trim() || "Autre",
    description: input.description?.trim() || null,
    unit_price_ht:
      Number.isFinite(input.unit_price_ht) && input.unit_price_ht >= 0
        ? Math.round(input.unit_price_ht * 100) / 100
        : 0,
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
  };
}

function validate(input: CatalogProductInput): string | null {
  if (!input.ref) return "Référence requise.";
  if (input.ref.length > 60) return "Référence trop longue.";
  if (!input.name) return "Nom requis.";
  if (input.unit_price_ht < 0) return "Prix HT invalide.";
  return null;
}

export async function createCatalogProductAction(
  input: CatalogProductInput,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const clean = sanitize(input);
  const err = validate(clean);
  if (err) return { ok: false, message: err };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catalog_products")
    .insert(clean)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return {
      ok: false,
      message:
        error?.message?.includes("duplicate")
          ? `Référence "${clean.ref}" déjà utilisée.`
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
  const { error } = await supabase.from("catalog_products").update(clean).eq("id", id);
  if (error) {
    return {
      ok: false,
      message:
        error.message?.includes("duplicate")
          ? `Référence "${clean.ref}" déjà utilisée.`
          : error.message,
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
};

export type ImportPreview = {
  toCreate: CsvRow[];
  toUpdate: { row: CsvRow; existingRef: string }[];
  errors: { line: number; ref: string; message: string }[];
};

/** Parse un fichier CSV (déjà chargé côté client comme texte) et prévisualise. */
export async function previewCsvImportAction(
  csvText: string,
): Promise<ImportPreview> {
  const supabase = await createClient();
  const parsed = parseCsvClient(csvText);

  // Récupère toutes les refs existantes pour distinguer create/update
  const refs = parsed.rows.map((r) => r.ref).filter((r) => r.length > 0);
  const existingRefs = new Set<string>();
  if (refs.length > 0) {
    const chunkSize = 500;
    for (let i = 0; i < refs.length; i += chunkSize) {
      const chunk = refs.slice(i, i + chunkSize);
      const { data } = await supabase
        .from("catalog_products")
        .select("ref")
        .in("ref", chunk);
      for (const r of data ?? []) existingRefs.add(r.ref);
    }
  }

  const toCreate: CsvRow[] = [];
  const toUpdate: { row: CsvRow; existingRef: string }[] = [];
  for (const r of parsed.rows) {
    if (existingRefs.has(r.ref)) toUpdate.push({ row: r, existingRef: r.ref });
    else toCreate.push(r);
  }

  return { toCreate, toUpdate, errors: parsed.errors };
}

export async function commitCsvImportAction(
  csvText: string,
): Promise<{ ok: boolean; message?: string; created: number; updated: number; errors: number }> {
  const supabase = await createClient();
  const parsed = parseCsvClient(csvText);
  let created = 0;
  let updated = 0;
  let errors = parsed.errors.length;

  for (const row of parsed.rows) {
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
    });
    const err = validate(clean);
    if (err) {
      errors++;
      continue;
    }
    const { data: existing } = await supabase
      .from("catalog_products")
      .select("id")
      .eq("ref", clean.ref)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase
        .from("catalog_products")
        .update(clean)
        .eq("id", existing.id);
      if (error) errors++;
      else updated++;
    } else {
      const { error } = await supabase.from("catalog_products").insert(clean);
      if (error) errors++;
      else created++;
    }
  }

  revalidatePath("/parametres");
  return { ok: true, created, updated, errors };
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
    const priceStr = (record.unit_price_ht ?? "0").replace(",", ".");
    const width = record.width_cm ? Number(record.width_cm) : null;
    const raccord = record.raccord_cm ? Number(record.raccord_cm) : null;
    const isCol =
      ["1", "true", "vrai", "oui"].includes(String(record.is_collection).toLowerCase());
    const active =
      record.active === "" ||
      ["1", "true", "vrai", "oui"].includes(String(record.active).toLowerCase());
    rows.push({
      ref,
      name: record.name,
      category: record.category || undefined,
      description: record.description || undefined,
      unit_price_ht: Number.isFinite(Number(priceStr)) ? Number(priceStr) : 0,
      unit_label: record.unit_label || undefined,
      width_cm: width != null && Number.isFinite(width) ? width : null,
      raccord_cm: raccord != null && Number.isFinite(raccord) ? raccord : null,
      is_collection: isCol,
      stock_poland: record.stock_poland ? Number(record.stock_poland) : 0,
      stock_ukraine: record.stock_ukraine ? Number(record.stock_ukraine) : 0,
      active,
    });
  }
  return { rows, errors };
}
