// Backfille catalog_source='external' + supplier_name pour toutes les lignes
// catalog_products qui viennent du JSON fournisseurs (déjà en DB depuis
// juin 2026, mais sans les colonnes créées par la migration du 23/07).
//
// Idempotent — peut être rejoué sans effet secondaire.

import pg from "pg";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = resolve(__dirname, "../src/lib/boutique/products-catalog.json");

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("✗ Missing SUPABASE_DB_URL.");
  process.exit(1);
}

const raw = JSON.parse(readFileSync(JSON_PATH, "utf-8"));
console.log(`→ Loaded ${raw.length} rows from JSON.`);

// Map ref → fournisseur (dédup — la dernière occurrence gagne).
const supplierByRef = new Map();
for (const r of raw) {
  if (r.reference && r.fournisseur) {
    supplierByRef.set(String(r.reference).trim(), String(r.fournisseur).trim());
  }
}
console.log(`→ ${supplierByRef.size} refs mapped to a supplier.`);

const client = new pg.Client({ connectionString: url });
await client.connect();

// 1. Tag tout le catalogue existant comme 'external' (aucune Collection Atmo
//    n'a encore été insérée en prod — les tissus Atmo vivent dans
//    boutique_tarif_tissus).
const upd = await client.query(
  "update public.catalog_products set catalog_source='external' where catalog_source='atmo' and is_collection=false",
);
console.log(`✓ catalog_source='external' appliqué sur ${upd.rowCount} lignes.`);

// 2. Backfill supplier_name par batch de 500 UPDATEs paramétrés.
const refs = [...supplierByRef.keys()];
const BATCH = 500;
let touched = 0;
for (let i = 0; i < refs.length; i += BATCH) {
  const chunk = refs.slice(i, i + BATCH);
  // Construit un CASE WHEN ref='X' THEN 'Y' ... permet un seul UPDATE.
  const params = [];
  const cases = chunk.map((r, k) => {
    params.push(r, supplierByRef.get(r));
    return `when $${k * 2 + 1} then $${k * 2 + 2}`;
  });
  const refsList = chunk.map((_, k) => `$${k * 2 + 1}`).join(",");
  const sql = `
    update public.catalog_products
       set supplier_name = case ref ${cases.join(" ")} end
     where ref in (${refsList})
       and supplier_name is null
  `;
  const res = await client.query(sql, params);
  touched += res.rowCount ?? 0;
  if ((i / BATCH) % 20 === 0) {
    console.log(
      `  batch ${i / BATCH + 1}/${Math.ceil(refs.length / BATCH)} — touched so far: ${touched}`,
    );
  }
}

console.log(`\n✓ supplier_name backfillé sur ${touched} lignes.`);

const finalStats = await client.query(`
  select catalog_source, count(*)::int as n, count(supplier_name)::int as with_supp
    from public.catalog_products
   group by catalog_source
`);
console.log("État final :", finalStats.rows);

await client.end();
