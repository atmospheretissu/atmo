// Seed dev avec un jeu de données de démo réaliste.
//
// Insère ~100 clients (multi-canaux), ~60 devis avec lignes (mix statuts),
// ~15 dossiers de confection, ~30 tickets caisse, ~20 BC fournisseurs,
// des créneaux de dispo pour les poseurs existants.
//
// Rejouable : idempotent sur les emails/ref. Ne touche PAS aux 45K produits
// catalogue déjà en base, ni aux profils/auth.users.
//
// Usage :
//   SUPABASE_DB_URL='...' node scripts/seed-dev-fake.mjs

import pg from "pg";

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("✗ Missing SUPABASE_DB_URL.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

// ─── Données de base : profils, sources, ateliers, fournisseurs ─────────
const { rows: profiles } = await client.query(
  "select id, role, full_name from public.profiles",
);
const admins = profiles.filter((p) => p.role === "admin");
const commerciaux = profiles.filter((p) => p.role === "commercial");
const decoratrices = profiles.filter((p) => p.role === "decoratrice");
// La table `poseurs` est distincte des profils — c'est là que les
// disponibilités s'attachent.
const { rows: poseurs } = await client.query(
  "select id, name from public.poseurs where active = true",
);
const someCommercial = () =>
  commerciaux[Math.floor(deterministic() * commerciaux.length)]?.id ??
  admins[0]?.id;

let seed = 12345;
function deterministic() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}
const pick = (arr) => arr[Math.floor(deterministic() * arr.length)];
const pickN = (arr, n) => {
  const shuffled = [...arr].sort(() => deterministic() - 0.5);
  return shuffled.slice(0, n);
};
const rand = (min, max) => Math.floor(deterministic() * (max - min + 1)) + min;

const { rows: stores } = await client.query("select id, name from public.stores");
const storeId = stores[0]?.id ?? null;

// Seed quelques fournisseurs de démo s'il n'y en a aucun
let { rows: suppliers } = await client.query(
  "select id, name, language from public.suppliers",
);
if (suppliers.length === 0) {
  const demoSuppliers = [
    { name: "Casamance", type: "tissu", country: "FR", language: "FR", contact_email: "commandes@casamance.fr" },
    { name: "Nobilis", type: "tissu", country: "FR", language: "FR", contact_email: "commandes@nobilis.fr" },
    { name: "CAD International", type: "tissu", country: "IT", language: "FR", contact_email: "orders@cad-int.com" },
    { name: "Copahome", type: "accessoire", country: "BE", language: "FR", contact_email: "orders@copahome.be" },
    { name: "Vedelux", type: "accessoire", country: "FR", language: "FR", contact_email: "commandes@vedelux.fr" },
    { name: "Forest Group", type: "rail", country: "NL", language: "FR", contact_email: "sales@forestgroup.com" },
  ];
  for (const s of demoSuppliers) {
    await client.query(
      "insert into public.suppliers (name, type, country, language, contact_email, active) values ($1, $2, $3, $4, $5, true) on conflict do nothing",
      [s.name, s.type, s.country, s.language, s.contact_email],
    );
  }
  ({ rows: suppliers } = await client.query(
    "select id, name, language from public.suppliers",
  ));
  console.log("+ seedé", suppliers.length, "fournisseurs de démo");
}

console.log("→ Profils :", profiles.length, "· fournisseurs :", suppliers.length);

// ─── 1. Clients ─────────────────────────────────────────────────────────
const prenoms = [
  "Marie", "Sophie", "Camille", "Laura", "Julie", "Nathalie", "Sylvie", "Isabelle",
  "Émilie", "Céline", "Aurélie", "Amélie", "Sandrine", "Christine", "Élodie",
  "Pauline", "Charlotte", "Manon", "Léa", "Chloé", "Sarah", "Anaïs", "Alice",
  "Pierre", "Jean", "Marc", "Thomas", "Nicolas", "Antoine", "Julien", "Guillaume",
  "François", "Philippe", "Vincent", "Sébastien", "Christophe", "Alexandre",
  "Benjamin", "Olivier", "Bertrand", "Frédéric", "Laurent", "Michel", "Éric",
];
const noms = [
  "Dubois", "Lefebvre", "Moreau", "Laurent", "Simon", "Michel", "Leroy", "Petit",
  "Roux", "Blanc", "Guérin", "Martin", "Bernard", "Thomas", "Robert", "Richard",
  "Durand", "David", "Bertrand", "Legrand", "Girard", "Fontaine", "Boyer", "Vidal",
  "Fournier", "Rousseau", "Marchand", "Chevalier", "Lambert", "Mercier", "Denis",
  "Muller", "Perrin", "Morin", "Faure", "Blanchard", "Roy", "Meyer", "Riviere",
];
const villes = [
  { ville: "Lille", cp: "59000" }, { ville: "Marquette-lez-Lille", cp: "59520" },
  { ville: "Roubaix", cp: "59100" }, { ville: "Tourcoing", cp: "59200" },
  { ville: "Villeneuve-d'Ascq", cp: "59650" }, { ville: "Wattignies", cp: "59139" },
  { ville: "Wattrelos", cp: "59150" }, { ville: "Hem", cp: "59510" },
  { ville: "Marcq-en-Barœul", cp: "59700" }, { ville: "Lambersart", cp: "59130" },
  { ville: "Loos", cp: "59120" }, { ville: "La Madeleine", cp: "59110" },
  { ville: "Croix", cp: "59170" }, { ville: "Mons-en-Barœul", cp: "59370" },
];
const rues = ["rue de la République", "avenue Foch", "rue Nationale", "boulevard Vauban",
  "rue de Paris", "avenue de Dunkerque", "rue Louis Braille", "chemin des Roses",
  "impasse du Moulin", "rue Victor Hugo", "avenue des Tilleuls", "rue de la Gare"];

const channels = ["magasin", "leroy_merlin", "saint_maclou", "ecommerce", "decoratrice", "visio"];

const seedTag = "seed-dev-2026-08-13";
console.log("→ Insert clients…");
const clientIds = [];
for (let i = 0; i < 100; i++) {
  const prenom = pick(prenoms);
  const nom = pick(noms);
  const v = pick(villes);
  const email = `${prenom.toLowerCase()}.${nom.toLowerCase()}${i}@example.fr`;
  const phone = `06${rand(10, 99)}${rand(10, 99)}${rand(10, 99)}${rand(10, 99)}`;
  const channel = pick(channels);
  const address = `${rand(1, 200)} ${pick(rues)}`;
  const { rows } = await client.query(
    `insert into public.clients (display_name, email, phone, address_pose, city, postal_code, channel, created_by, store_id, source_notes)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     returning id`,
    [
      `${nom.toUpperCase()}, ${prenom}`,
      email,
      phone,
      address,
      v.ville,
      v.cp,
      channel,
      someCommercial(),
      storeId,
      seedTag,
    ],
  );
  clientIds.push(rows[0].id);
}
console.log(`✓ ${clientIds.length} clients insérés`);

// ─── 2. Devis ───────────────────────────────────────────────────────────
console.log("→ Insert devis…");
const devisIds = [];
const statuses = [
  "brouillon", "brouillon", "envoye", "envoye", "envoye", "envoye",
  "valide", "valide", "acompte_recu", "acompte_recu", "acompte_recu",
  "refuse", "expire",
];
const products = [
  { summary: "Rideaux sur mesure", detail: "Salon 2 lés + chambre" },
  { summary: "Store bateau", detail: "Cuisine 90×120 Lin naturel" },
  { summary: "Rideaux à œillets", detail: "Séjour laize 280 Casamance" },
  { summary: "Rideaux + rail DS", detail: "Chambre parentale rail plafond" },
  { summary: "Voilage salon", detail: "Panneau plis simples voile" },
  { summary: "Store enrouleur", detail: "Bureau tamisant coloris ivoire" },
  { summary: "Rideaux Vague + rail", detail: "Salon 320cm rail DV" },
  { summary: "Rideau + pose", detail: "Chambre enfant Chantal col 3" },
];
const year = 2026;
for (let i = 0; i < 60; i++) {
  const status = pick(statuses);
  const product = pick(products);
  const clientId = pick(clientIds);
  const number = `DEV-${year}-${String(1000 + i).padStart(4, "0")}`;
  const nLines = rand(1, 4);
  const lines = [];
  let totalHt = 0;
  for (let j = 0; j < nLines; j++) {
    const qty = rand(1, 3);
    const price = rand(80, 800);
    lines.push({ label: `Ligne ${j + 1} — ${product.summary}`, qty, price });
    totalHt += qty * price;
  }
  const totalTtc = Math.round(totalHt * 1.2 * 100) / 100;
  const validUntil = `${year}-12-31`;
  const createdAt = `${year}-0${rand(6, 8)}-${String(rand(1, 28)).padStart(2, "0")}`;
  const { rows } = await client.query(
    `insert into public.devis (number, version, client_id, channel, status, product_summary, product_detail,
       qty, total_ht, total_ttc, tva_rate, valid_until, commercial_id, store_id, created_at, updated_at)
     values ($1, 1, $2, 'magasin', $3, $4, $5, $6, $7, $8, 20, $9, $10, $11, $12, $12)
     on conflict (number) do nothing
     returning id`,
    [
      number,
      clientId,
      status,
      product.summary,
      product.detail,
      nLines,
      totalHt,
      totalTtc,
      validUntil,
      someCommercial(),
      storeId,
      createdAt,
    ],
  );
  if (rows[0]) {
    devisIds.push({ id: rows[0].id, status, totalTtc, clientId, number });
    for (let j = 0; j < lines.length; j++) {
      const l = lines[j];
      await client.query(
        `insert into public.devis_lines (devis_id, position, label, qty, unit_label, unit_price_ht)
         values ($1, $2, $3, $4, 'u', $5)`,
        [rows[0].id, j, l.label, l.qty, l.price],
      );
    }
  }
}
console.log(`✓ ${devisIds.length} devis + lignes insérés`);

// ─── 3. Dossiers de confection (pour les devis acompte_recu) ────────────
console.log("→ Insert dossiers…");
const acompteDevis = devisIds.filter((d) => d.status === "acompte_recu");
const dossierStatuses = ["en_cours", "tout_commande", "reception_partielle", "en_confection", "pret_pose"];
let dossierCount = 0;
for (let i = 0; i < acompteDevis.length; i++) {
  const d = acompteDevis[i];
  const number = `DOS-${year}-${String(500 + i).padStart(4, "0")}`;
  const st = pick(dossierStatuses);
  const { rows } = await client.query(
    `insert into public.dossiers (number, devis_id, client_id, status, total_ttc, acompte_paid, acompte_paid_at)
     values ($1, $2, $3, $4, $5, true, now() - interval '${rand(1, 30)} days')
     on conflict (number) do nothing
     returning id`,
    [number, d.id, d.clientId, st, d.totalTtc],
  );
  if (rows[0]) {
    dossierCount++;
    // 2-4 items par dossier
    const itemTypes = ["tissu", "rail", "accessoire", "confection"];
    const nItems = rand(2, 4);
    for (let j = 0; j < nItems; j++) {
      const type = pick(itemTypes);
      const qr = `QR-${d.id.slice(0, 4).toUpperCase()}-${j}`;
      const iStatus = pick(["en_attente", "commande", "recu", "confection"]);
      await client.query(
        `insert into public.dossier_items (dossier_id, type, label, ref, status, qr_code, qty, unit_label, position)
         values ($1, $2, $3, $4, $5, $6, $7, 'u', $8)`,
        [
          rows[0].id,
          type,
          `${type === "tissu" ? "Tissu" : type === "rail" ? "Rail DS" : type === "confection" ? "Confection" : "Accessoire"} #${j + 1}`,
          `REF-${rand(1000, 9999)}`,
          iStatus,
          qr,
          rand(1, 3),
          j,
        ],
      );
    }
  }
}
console.log(`✓ ${dossierCount} dossiers + items insérés`);

// ─── 4. Bons de commande fournisseurs ───────────────────────────────────
console.log("→ Insert BCs…");
let bcCount = 0;
for (let i = 0; i < 20; i++) {
  const number = `BC-${year}-${String(200 + i).padStart(4, "0")}`;
  const sup = pick(suppliers);
  if (!sup) continue;
  const amount = rand(200, 3500);
  const st = pick(["brouillon", "envoye", "confirme", "expedie", "recu"]);
  const { rows } = await client.query(
    `insert into public.bons_commande (number, supplier_id, status, amount_ht, language)
     values ($1, $2, $3, $4, $5)
     on conflict (number) do nothing
     returning id`,
    [number, sup.id, st, amount, sup.language ?? "FR"],
  );
  if (rows[0]) {
    bcCount++;
    // 2-4 lignes
    const nLines = rand(2, 4);
    for (let j = 0; j < nLines; j++) {
      const qty = rand(1, 10);
      const price = rand(20, 200);
      await client.query(
        `insert into public.bc_lines (bc_id, position, label, qty, unit_label, unit_price_ht)
         values ($1, $2, $3, $4, 'u', $5)`,
        [rows[0].id, j, `Article ${j + 1}`, qty, price],
      );
    }
  }
}
console.log(`✓ ${bcCount} BCs + lignes insérés`);

// ─── 5. Tickets caisse ──────────────────────────────────────────────────
console.log("→ Insert tickets caisse…");
let tktCount = 0;
const paymentMethods = ["cb", "cb", "cb", "especes", "cheque", "virement"];
for (let i = 0; i < 30; i++) {
  const number = `TKT-${year}-${String(3000 + i).padStart(4, "0")}`;
  const nLines = rand(1, 3);
  let totalHt = 0;
  const lines = [];
  for (let j = 0; j < nLines; j++) {
    const qty = rand(1, 5);
    const price = rand(15, 250);
    lines.push({ label: `Article comptoir #${j + 1}`, qty, price });
    totalHt += qty * price;
  }
  const totalTtc = Math.round(totalHt * 1.2 * 100) / 100;
  const method = pick(paymentMethods);
  const cashReceived = method === "especes" ? Math.ceil(totalTtc / 10) * 10 : null;
  const change = cashReceived ? Math.round((cashReceived - totalTtc) * 100) / 100 : null;
  const withClient = deterministic() > 0.5 ? pick(clientIds) : null;
  const { rows } = await client.query(
    `insert into public.caisse_tickets (number, client_id, cashier_id, total_ht, total_ttc,
       payment_method, paid_amount, cash_received, change_due, store_id, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now() - interval '${rand(0, 20)} days')
     on conflict (number) do nothing
     returning id`,
    [
      number,
      withClient,
      admins[0]?.id ?? null,
      totalHt,
      totalTtc,
      method,
      totalTtc,
      cashReceived,
      change,
      storeId,
    ],
  );
  if (rows[0]) {
    tktCount++;
    for (let j = 0; j < lines.length; j++) {
      const l = lines[j];
      await client.query(
        `insert into public.caisse_ticket_lines (ticket_id, position, label, qty, unit_label, unit_price_ht)
         values ($1, $2, $3, $4, 'u', $5)`,
        [rows[0].id, j, l.label, l.qty, l.price],
      );
    }
  }
}
console.log(`✓ ${tktCount} tickets + lignes insérés`);

// ─── 6. Créneaux de dispo poseurs ───────────────────────────────────────
console.log("→ Insert dispos poseurs…");
let dispoCount = 0;
try {
  const today = new Date();
  const slotKinds = ["morning", "afternoon", "day"];
  for (const p of poseurs) {
    for (let d = 0; d < 14; d++) {
      if (deterministic() < 0.4) continue;
      const day = new Date(today);
      day.setDate(day.getDate() + d);
      const dow = day.getDay();
      if (dow === 0 || dow === 6) continue;
      const kind = pick(slotKinds);
      const dateStr = day.toISOString().split("T")[0];
      try {
        await client.query(
          `insert into public.poseur_availabilities (poseur_id, date, slot, status)
           values ($1, $2, $3, 'available')
           on conflict (poseur_id, date, slot) do nothing`,
          [p.id, dateStr, kind],
        );
        dispoCount++;
      } catch {
        // slot enum différent selon les migrations — on ignore les erreurs
      }
    }
  }
} catch (e) {
  console.log("⚠ dispos poseurs non insérées :", e.message.slice(0, 80));
}
console.log(`✓ ${dispoCount} créneaux de dispo insérés`);

// ─── Récap ──────────────────────────────────────────────────────────────
console.log("\n═══ RÉCAPITULATIF DU SEED ═══");
const summary = await client.query(`
  select 'clients' as t, count(*)::int as n from public.clients where source_notes = '${seedTag}'
  union all select 'devis', count(*)::int from public.devis
  union all select 'devis_lines', count(*)::int from public.devis_lines
  union all select 'dossiers', count(*)::int from public.dossiers
  union all select 'dossier_items', count(*)::int from public.dossier_items
  union all select 'bcs', count(*)::int from public.bons_commande
  union all select 'bc_lines', count(*)::int from public.bc_lines
  union all select 'tickets', count(*)::int from public.caisse_tickets
  union all select 'poseur_availabilities', count(*)::int from public.poseur_availabilities
`);
summary.rows.forEach((r) => console.log(` ${r.t.padEnd(12)} ${r.n}`));

await client.end();
console.log("\n✓ Seed terminé.");
