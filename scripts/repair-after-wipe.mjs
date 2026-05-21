/**
 * One-shot repair script :
 *   1. Crée la table _schema_migrations si absente
 *   2. Marque les 3 migrations comme déjà appliquées (pour éviter re-run)
 *   3. Recrée le profil admin depuis auth.users (atmospheretissu@gmail.com)
 */

import pg from "pg";

const c = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
await c.connect();

console.log("→ Création table _schema_migrations si absente…");
await c.query(`
  create table if not exists public._schema_migrations (
    filename text primary key,
    applied_at timestamptz not null default now(),
    sha256 text
  )
`);

const migrations = [
  "20260513120000_initial_schema.sql",
  "20260513120100_rls_policies.sql",
  "20260521120000_sms_templates_sender.sql",
];

console.log("→ Marquage des migrations existantes comme appliquées…");
for (const m of migrations) {
  await c.query(
    `insert into public._schema_migrations (filename) values ($1) on conflict do nothing`,
    [m],
  );
  console.log(`  ✓ ${m}`);
}

console.log("\n→ Recherche du compte admin dans auth.users…");
const adminEmail = "atmospheretissu@gmail.com";
const { rows: users } = await c.query(
  `select id, email from auth.users where email = $1`,
  [adminEmail],
);
if (users.length === 0) {
  console.log(`  ✗ Aucun utilisateur ${adminEmail} dans auth.users — créer via Supabase Dashboard d'abord`);
} else {
  const user = users[0];
  console.log(`  ✓ Trouvé : ${user.email} (id: ${user.id})`);

  console.log("\n→ Insertion du profil admin…");
  await c.query(
    `
    insert into public.profiles (id, email, full_name, role, active)
    values ($1, $2, $3, 'admin', true)
    on conflict (id) do update set role = 'admin', active = true, updated_at = now()
  `,
    [user.id, user.email, "David Manscour"],
  );
  console.log("  ✓ Profil admin créé/mis à jour");
}

console.log("\n→ Vérification finale :");
const { rows: profilesCount } = await c.query(`select count(*)::int as n from public.profiles`);
const { rows: smsTemplates } = await c.query(`select key, sender from public.sms_templates order by key`);
const { rows: migrationsApplied } = await c.query(
  `select filename, applied_at from public._schema_migrations order by filename`,
);
console.log(`  profiles : ${profilesCount[0].n}`);
console.log(`  sms_templates :`);
for (const t of smsTemplates) console.log(`    ${t.key.padEnd(25)} sender=${t.sender ?? "(none)"}`);
console.log(`  _schema_migrations :`);
for (const m of migrationsApplied)
  console.log(`    ${m.filename} (${new Date(m.applied_at).toISOString()})`);

await c.end();
console.log("\n✅ Repair done.");
