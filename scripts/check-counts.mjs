import pg from "pg";
const c = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
await c.connect();
for (const t of ["clients", "devis", "dossiers", "suppliers", "bons_commande", "caisse_tickets", "profiles", "sms_templates", "sms_log"]) {
  try {
    const { rows } = await c.query(`select count(*) as n from public.${t}`);
    console.log(`${t.padEnd(20)} ${rows[0].n}`);
  } catch (e) {
    console.log(`${t.padEnd(20)} ERROR: ${e.message}`);
  }
}
await c.end();
