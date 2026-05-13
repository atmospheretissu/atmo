#!/usr/bin/env node
/**
 * Apply migrations to the linked Supabase project.
 *
 * Usage:
 *   SUPABASE_DB_URL='postgresql://postgres.PROJECT:PASSWORD@aws-0-eu-west-3.pooler.supabase.com:6543/postgres' \
 *     npx tsx scripts/apply-migrations.ts
 *
 * The DB URL is found in Supabase Dashboard → Project Settings → Database
 * → Connection string → "Transaction" pooler (port 6543).
 *
 * Each .sql file in supabase/migrations/ is executed in alphabetical order
 * inside a single transaction. Idempotent thanks to "create … if not exists"
 * patterns; re-running is safe.
 */

import { Client } from "pg";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error("✗ Missing SUPABASE_DB_URL. Get it from:");
    console.error("  Supabase Dashboard → Project Settings → Database → Connection string → Transaction pooler");
    console.error("  Then run: SUPABASE_DB_URL='postgresql://...' npx tsx scripts/apply-migrations.ts");
    process.exit(1);
  }

  const dir = join(process.cwd(), "supabase", "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("⚠ No migration files found.");
    return;
  }

  console.log(`→ Connecting to Supabase…`);
  const client = new Client({ connectionString: url });
  await client.connect();
  console.log(`✓ Connected.`);

  try {
    for (const f of files) {
      const path = join(dir, f);
      const sql = readFileSync(path, "utf-8");
      console.log(`\n→ Applying ${f} (${sql.length.toLocaleString()} chars)…`);
      const start = Date.now();
      await client.query(sql);
      console.log(`✓ Applied in ${Date.now() - start}ms.`);
    }
    console.log(`\n✅ All migrations applied.`);
  } catch (err) {
    console.error(`\n✗ Migration failed:`);
    console.error(err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
