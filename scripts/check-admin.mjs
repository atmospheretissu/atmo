import pgmod from 'pg';
const { Client } = pgmod;
const c = new Client({ connectionString: process.env.SUPABASE_DB_URL });
await c.connect();
const r = await c.query("select id, email, full_name, role, active, created_at from public.profiles where email='atmospheretissu@gmail.com'");
console.log(JSON.stringify(r.rows[0], null, 2));
await c.end();
