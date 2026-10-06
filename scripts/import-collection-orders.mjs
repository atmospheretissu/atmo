/**
 * Reprise du suivi des commandes de confection Collection Atmosphère.
 *
 * Source : data/collection-orders-import.json — l'export du suivi tenu
 * jusqu'ici hors logiciel (185 commandes, Pologne et Ukraine), fourni par
 * David le 06/10/2026 avec la maquette de la page.
 *
 * Idempotent : chaque commande est identifiée par (ref, client,
 * date_commande, description). La description fait partie de la clé parce
 * qu'une même référence de confection peut porter PLUSIEURS commandes
 * distinctes — BECU a un rideau et une banquette sous « conf 9416 136 ».
 * Sans elle, six commandes sur 185 s'écrasaient mutuellement.
 *
 * Relancer le script ne crée pas de doublon ; il met à jour les champs
 * d'origine SANS écraser ce que l'usine ou Atmosphère ont saisi depuis
 * (dates usine, commentaire SAV, date de réception).
 *
 *   SUPABASE_DB_URL=... node scripts/import-collection-orders.mjs [--dry]
 */

import { Client } from "pg";
import { readFileSync } from "node:fs";

const DRY = process.argv.includes("--dry");

// Le suivi d'origine nomme ses colonnes de dates d1…d5 ; voici ce qu'elles
// portent, d'après src/lib/orders.ts de la maquette.
const MAP = {
  d1: "date_envoi",      // envoi à l'atelier
  d2: "date_prevue",     // livraison prévue
  d3: "date_butoir",     // échéance
  d4: "date_reception",  // réception constatée par Atmosphère
};

const STATUTS = new Set(["En cours", "Terminée", "Archivée", "SAV", "Annulé"]);

function clean(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

/**
 * Les colonnes de dates du suivi d'origine contiennent souvent du texte
 * libre : « exportée 11.06.26 », « export semaine 19 », « fini 25.06.2026,
 * 03.07.2026 », « 17.07.2026 COUPON 1PC ». 58 lignes sur 185 pour la seule
 * colonne de réception.
 *
 * On en extrait la première date exploitable, et le texte brut est conservé
 * à part (voir `noteFromDate`) : il porte des précisions — numéro de coupon,
 * nombre de panneaux, semaine d'export — que personne ne veut perdre.
 *
 * Formats acceptés : AAAA-MM-JJ, JJ.MM.AAAA, JJ/MM/AAAA, et leurs variantes
 * à deux chiffres pour l'année. L'année doit rester plausible : « 22.06.0226 »
 * est une faute de frappe, pas une date.
 */
function parseDate(v) {
  const s = clean(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const m = s.match(/(\d{1,2})[./](\d{1,2})[./,]*\s*(\d{2,4})/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  if (year < 100) year += 2000;
  if (year < 2015 || year > 2035) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  // Vérifie que la date existe vraiment (31 février, par exemple).
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) || d.getUTCDate() !== day ? null : iso;
}

/** Le texte brut d'une colonne de date, s'il porte autre chose qu'une date. */
function noteFromDate(label, v) {
  const s = clean(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  // Rien n'a pu être extrait : on garde le texte quoi qu'il arrive, sans
  // quoi une valeur comme « 22.06.0226 » disparaîtrait sans laisser de
  // trace, et l'erreur de saisie serait impossible à retrouver.
  if (!parseDate(s)) return `${label} : ${s}`;
  // Une valeur réduite à la date déjà extraite n'apprend rien de plus.
  const stripped = s.replace(/\d{1,2}[./]\d{1,2}[./,]*\s*\d{2,4}/g, "").trim();
  if (!stripped || /^[.,;\s-]*$/.test(stripped)) return null;
  return `${label} : ${s}`;
}

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error("✗ SUPABASE_DB_URL manquante.");
    process.exit(1);
  }

  const raw = JSON.parse(
    readFileSync(new URL("../data/collection-orders-import.json", import.meta.url), "utf8"),
  );
  console.log(`→ ${raw.length} commandes dans le fichier source.`);

  const rows = raw.map((r) => {
    let statut = STATUTS.has(r.statut) ? r.statut : "En cours";

    // Règle du suivi d'origine : une commande dont la case « réception »
    // est remplie est archivée — peu importe que la case porte une date ou
    // une mention libre (« exporté », « export semaine 19 »). Comme on ne
    // peut pas inventer une date là où il n'y en a pas, on pose directement
    // le statut ; le texte brut est conservé dans le commentaire.
    if (clean(r.d4)) statut = "Archivée";

    return {
      source: "import",
      statut,
      ref: clean(r.ref),
      client_name: clean(r.client) ?? "—",
      date_commande: clean(r.date_commande),
      atelier: clean(r.atelier),
      description: clean(r.description),
      fournisseur: clean(r.fournisseur),
      [MAP.d1]: parseDate(r.d1),
      [MAP.d2]: parseDate(r.d2),
      [MAP.d3]: parseDate(r.d3),
      [MAP.d4]: parseDate(r.d4),
      retard_source: clean(r.retard),
      // Le commentaire d'origine, enrichi de ce que les colonnes de dates
      // portaient en plus de la date elle-même.
      commentaire:
        [
          clean(r.commentaire),
          noteFromDate("Envoi atelier", r.d1),
          noteFromDate("Réception", r.d4),
          clean(r.d5) ? `Note usine : ${clean(r.d5)}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || null,
    };
  });

  const byAtelier = rows.reduce((a, r) => ((a[r.atelier ?? "—"] = (a[r.atelier ?? "—"] ?? 0) + 1), a), {});
  const byStatut = rows.reduce((a, r) => ((a[r.statut] = (a[r.statut] ?? 0) + 1), a), {});
  console.log("  ateliers :", byAtelier);
  console.log("  statuts  :", byStatut);

  if (DRY) {
    console.log("\n(simulation — rien n'est écrit)");
    return;
  }

  const client = new Client({ connectionString: url });
  await client.connect();
  let inserted = 0;
  let updated = 0;

  try {
    await client.query("BEGIN");
    for (const r of rows) {
      // Clé métier : référence + client + date + description. La
      // description est indispensable, voir l'en-tête du fichier.
      const { rows: found } = await client.query(
        `SELECT id FROM public.collection_orders
         WHERE source = 'import'
           AND coalesce(ref, '') = coalesce($1, '')
           AND client_name = $2
           AND coalesce(date_commande::text, '') = coalesce($3, '')
           AND coalesce(description, '') = coalesce($4, '')
         LIMIT 1`,
        [r.ref, r.client_name, r.date_commande, r.description],
      );

      if (found.length > 0) {
        // On ne réécrit que les champs venant du suivi d'origine : les
        // saisies faites depuis dans l'outil doivent survivre à un
        // réimport.
        await client.query(
          `UPDATE public.collection_orders SET
             statut = $2, atelier = $3, description = $4, fournisseur = $5,
             date_envoi = $6, date_prevue = $7, date_butoir = $8,
             retard_source = $9, commentaire = $10
           WHERE id = $1`,
          [
            found[0].id, r.statut, r.atelier, r.description, r.fournisseur,
            r.date_envoi, r.date_prevue, r.date_butoir, r.retard_source, r.commentaire,
          ],
        );
        updated++;
      } else {
        await client.query(
          `INSERT INTO public.collection_orders
             (source, statut, ref, client_name, date_commande, atelier, description,
              fournisseur, date_envoi, date_prevue, date_butoir, date_reception,
              retard_source, commentaire)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [
            r.source, r.statut, r.ref, r.client_name, r.date_commande, r.atelier,
            r.description, r.fournisseur, r.date_envoi, r.date_prevue, r.date_butoir,
            r.date_reception, r.retard_source, r.commentaire,
          ],
        );
        inserted++;
      }
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }

  console.log(`\n✓ ${inserted} créée(s), ${updated} mise(s) à jour.`);
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
