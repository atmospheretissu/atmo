// One-shot : importe products-catalog.json (47K produits externes) dans
// public.catalog_products (dedupé par ref, ON CONFLICT DO NOTHING).
//
// Usage :
//   SUPABASE_DB_URL='postgresql://…' node scripts/import-catalog-bulk.mjs
//
// Rejouable : si un ref existe déjà, il est ignoré. On peut relancer sans
// crainte de doublon.
import pg from "pg";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = resolve(__dirname, "../src/lib/boutique/products-catalog.json");

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("✗ Missing SUPABASE_DB_URL.");
  process.exit(1);
}

const raw = JSON.parse(readFileSync(JSON_PATH, "utf-8"));
console.log(`→ Loaded ${raw.length} rows from JSON.`);

// Dédup par ref, garde la dernière occurrence.
const byRef = new Map();
for (const r of raw) {
  if (!r.reference) continue;
  byRef.set(String(r.reference).trim(), r);
}
const rows = [...byRef.values()];
console.log(`→ ${rows.length} rows after dedup by reference.`);

const cleanCategory = (t) => {
  if (!t) return "Autre";
  // Le JSON source contient des guillemets bruts type "Sand\"\"".
  const s = String(t).replace(/["']/g, "").trim();
  return s.length > 0 ? s.slice(0, 60) : "Autre";
};

const client = new pg.Client({ connectionString: url });
await client.connect();

// Recompte de l'existant.
const before = await client.query(
  "select count(*)::int as n from public.catalog_products where catalog_source = 'external'",
);
console.log(`→ Existing external rows in DB: ${before.rows[0].n}`);

const BATCH = 500;
let inserted = 0;
let skipped = 0;

for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH);
  const values = [];
  const params = [];
  chunk.forEach((r, k) => {
    const b = k * 9;
    values.push(
      `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8}, $${b + 9})`,
    );
    params.push(
      String(r.reference).trim(),
      String(r.nom ?? r.designation ?? r.reference).trim().slice(0, 200),
      cleanCategory(r.type),
      r.designation ? String(r.designation).trim().slice(0, 400) : null,
      r.prix != null ? Number(r.prix) : null,
      "u",
      r.fournisseur ? String(r.fournisseur).trim().slice(0, 80) : null,
      "external",
      r.prix != null,
    );
  });

  const sql = `
    insert into public.catalog_products
      (ref, name, category, description, unit_price_ht, unit_label, supplier_name, catalog_source, active)
    values ${values.join(", ")}
    on conflict (ref) do nothing
  `;
  const res = await client.query(sql, params);
  inserted += res.rowCount ?? 0;
  skipped += chunk.length - (res.rowCount ?? 0);
  if ((i / BATCH) % 20 === 0) {
    console.log(
      `  batch ${i / BATCH + 1}/${Math.ceil(rows.length / BATCH)} — inserted so far: ${inserted}`,
    );
  }
}

console.log(`\n✓ Import terminé.`);
console.log(`  Inserted: ${inserted}`);
console.log(`  Skipped (ref déjà présent): ${skipped}`);

const after = await client.query(
  "select count(*)::int as n from public.catalog_products where catalog_source = 'external'",
);
console.log(`  External rows in DB now: ${after.rows[0].n}`);

await client.end();
