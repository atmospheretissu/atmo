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
 * Migrations are tracked in `public._schema_migrations`. Each .sql file in
 * supabase/migrations/ is only applied once. Re-running this script will
 * skip migrations already recorded — SAFE on production data.
 *
 * To re-apply a migration after a failed/partial run, delete its row from
 * `_schema_migrations` then re-run. To force a clean rebuild (DEV ONLY),
 * pass the env `FORCE=1` (will drop _schema_migrations + execute all files).
 */

import { Client } from "pg";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error("✗ Missing SUPABASE_DB_URL.");
    process.exit(1);
  }

  const force = process.env.FORCE === "1";

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
    if (force) {
      console.log("⚠ FORCE=1 — dropping _schema_migrations to re-run everything");
      await client.query(`drop table if exists public._schema_migrations`);
    }

    await client.query(`
      create table if not exists public._schema_migrations (
        filename text primary key,
        applied_at timestamptz not null default now(),
        sha256 text
      )
    `);

    const { rows: applied } = await client.query(
      `select filename from public._schema_migrations`,
    );
    const appliedSet = new Set(applied.map((r: { filename: string }) => r.filename));

    let appliedCount = 0;
    let skippedCount = 0;
    for (const f of files) {
      if (appliedSet.has(f)) {
        console.log(`⊘ Skip ${f} (already applied)`);
        skippedCount += 1;
        continue;
      }
      const path = join(dir, f);
      const sql = readFileSync(path, "utf-8");
      console.log(`\n→ Applying ${f} (${sql.length.toLocaleString()} chars)…`);
      const start = Date.now();
      try {
        await client.query("begin");
        await client.query(sql);
        await client.query(
          `insert into public._schema_migrations (filename) values ($1)`,
          [f],
        );
        await client.query("commit");
        console.log(`✓ Applied in ${Date.now() - start}ms.`);
        appliedCount += 1;
      } catch (err) {
        await client.query("rollback");
        throw new Error(`Migration ${f} failed: ${(err as Error).message}`);
      }
    }

    console.log(`\n✅ Done. Applied ${appliedCount}, skipped ${skippedCount}.`);
  } catch (err) {
    console.error(`\n✗ Migration failed:`);
    console.error(err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
