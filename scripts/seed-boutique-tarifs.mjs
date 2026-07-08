#!/usr/bin/env node
/**
 * Seed les tables boutique_tarif_tissus + boutique_tarif_grids depuis
 * le JSON parsé src/lib/boutique/new-collection-tarifs.json.
 *
 * Usage : node scripts/seed-boutique-tarifs.mjs [dev|prod]
 * Sans arg → dev
 */
import { readFileSync } from "node:fs";

/**
 * Usage :
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/seed-boutique-tarifs.mjs
 *
 * OU depuis app/ avec .env.local :
 *   node --env-file=.env.local scripts/seed-boutique-tarifs.mjs
 */
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Manque SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) et SUPABASE_SERVICE_ROLE_KEY dans l'env.",
  );
  process.exit(1);
}

const data = JSON.parse(
  readFileSync("src/lib/boutique/new-collection-tarifs.json", "utf8"),
);

async function rest(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`${init.method || "GET"} ${path} → ${res.status}: ${text}`);
    throw new Error(text);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

let totalTissus = 0;
let totalGrids = 0;
let position = 0;

console.log(`Seed target: ${SUPABASE_URL}\n`);

for (const [category, catData] of Object.entries(data)) {
  for (const t of catData.tissus) {
    // 1. Upsert le tissu
    const upsert = await rest(
      "/rest/v1/boutique_tarif_tissus?on_conflict=name,category,family",
      {
        method: "POST",
        headers: {
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          name: t.name,
          category,
          family: t.family,
          laize_cm: t.laize,
          coefficient: t.coefficient,
          active: true,
          position: position++,
        }),
      },
    );
    const tissuId = upsert[0]?.id;
    if (!tissuId) {
      console.warn(`  ✗ upsert tissu ${t.name} raté`);
      continue;
    }
    totalTissus++;

    // 2. Upsert chaque grille de confection
    for (const [confection, grid] of Object.entries(t.confections)) {
      await rest(
        "/rest/v1/boutique_tarif_grids?on_conflict=tissu_id,confection",
        {
          method: "POST",
          headers: {
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify({
            tissu_id: tissuId,
            confection,
            largeurs: grid.largeurs,
            hauteurs: grid.hauteurs,
            grid: grid.grid,
          }),
        },
      );
      totalGrids++;
    }
    console.log(
      `  ✓ ${category.padEnd(15)} ${t.family.padEnd(18)} ${t.name.padEnd(35)} → ${Object.keys(t.confections).length} confections`,
    );
  }
}

console.log(`\n✓ ${totalTissus} tissus, ${totalGrids} grilles chargées en ${target}`);
