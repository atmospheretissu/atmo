import pgmod from 'pg';
import { writeFileSync } from 'node:fs';
const { Client } = pgmod;

const c = new Client({ connectionString: process.env.SUPABASE_DB_URL });
await c.connect();

// Fetch tables, columns, enums
const tables = (await c.query(`
  select c.table_name, c.column_name, c.data_type, c.udt_name, c.is_nullable, c.column_default
  from information_schema.columns c
  where c.table_schema = 'public'
  order by c.table_name, c.ordinal_position
`)).rows;

const enums = (await c.query(`
  select t.typname, e.enumlabel
  from pg_type t join pg_enum e on t.oid = e.enumtypid
  join pg_catalog.pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
  order by t.typname, e.enumsortorder
`)).rows;

await c.end();

// Group
const enumsByName = {};
for (const e of enums) {
  (enumsByName[e.typname] ??= []).push(e.enumlabel);
}

const tablesByName = {};
for (const r of tables) {
  (tablesByName[r.table_name] ??= []).push(r);
}

const mapType = (col) => {
  if (col.data_type === 'USER-DEFINED' && enumsByName[col.udt_name]) {
    return `Database["public"]["Enums"]["${col.udt_name}"]`;
  }
  const m = {
    'uuid': 'string',
    'text': 'string',
    'character varying': 'string',
    'citext': 'string',
    'integer': 'number',
    'bigint': 'number',
    'smallint': 'number',
    'numeric': 'number',
    'real': 'number',
    'double precision': 'number',
    'boolean': 'boolean',
    'timestamp with time zone': 'string',
    'timestamp without time zone': 'string',
    'date': 'string',
    'time': 'string',
    'json': 'Json',
    'jsonb': 'Json',
    'ARRAY': 'string[]',
    'inet': 'string',
  };
  return m[col.data_type] ?? 'unknown';
};

let out = `// Auto-generated from Supabase schema. Do not edit by hand.\n`;
out += `// Regenerate with: SUPABASE_DB_URL=... node scripts/gen-types.mjs\n\n`;
out += `export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];\n\n`;
out += `export interface Database {\n  public: {\n    Tables: {\n`;

for (const [name, cols] of Object.entries(tablesByName).sort()) {
  out += `      ${name}: {\n        Row: {\n`;
  for (const c of cols) {
    const t = mapType(c);
    const nullable = c.is_nullable === 'YES';
    out += `          ${c.column_name}: ${t}${nullable ? ' | null' : ''};\n`;
  }
  out += `        };\n        Insert: {\n`;
  for (const c of cols) {
    const t = mapType(c);
    const nullable = c.is_nullable === 'YES';
    const hasDefault = c.column_default !== null;
    const optional = nullable || hasDefault;
    out += `          ${c.column_name}${optional ? '?' : ''}: ${t}${nullable ? ' | null' : ''};\n`;
  }
  out += `        };\n        Update: {\n`;
  for (const c of cols) {
    const t = mapType(c);
    const nullable = c.is_nullable === 'YES';
    out += `          ${c.column_name}?: ${t}${nullable ? ' | null' : ''};\n`;
  }
  out += `        };\n      };\n`;
}

out += `    };\n    Views: Record<string, { Row: Record<string, unknown> }>;\n    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>;\n    Enums: {\n`;
for (const [name, vals] of Object.entries(enumsByName).sort()) {
  out += `      ${name}: ${vals.map(v => `"${v}"`).join(' | ')};\n`;
}
out += `    };\n    CompositeTypes: Record<string, Record<string, unknown>>;\n  };\n}\n`;

writeFileSync(process.cwd() + '/src/lib/supabase/types.ts', out);
console.log(`✓ Generated ${Object.keys(tablesByName).length} tables + ${Object.keys(enumsByName).length} enums`);
console.log(`  → src/lib/supabase/types.ts (${out.length.toLocaleString()} chars)`);
