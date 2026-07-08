#!/usr/bin/env node
/**
 * Parse tous les fichiers Excel du dossier TARIFS et produit un JSON structuré
 * consommable par la NewCollectionForm.
 *
 * Format sortie :
 * {
 *   rideau: {
 *     tissus: [
 *       {
 *         name: "VOGUE",
 *         family: "POLYESTER" | "LIN" | "POLYESTER_DOUBLE",
 *         laize: 140,
 *         coefficient: 1.8,
 *         // Pour chaque confection : matrice largeur[] x hauteur[] → prix
 *         confections: {
 *           "pli_simple": {
 *             largeurs: [55, 145, 225, ...], // seuils MAX inclus
 *             hauteurs: [55, 65, 75, ...],
 *             grid: number[][], // grid[i_hauteur][i_largeur] = prix
 *           },
 *           "wave": { ... },
 *           "oeillet": { ... },
 *         },
 *       },
 *       ...
 *     ],
 *   },
 *   store_bateau: { ... },
 *   store_enrouleur: { ... },
 *   store_screen: { ... },
 * }
 */
import * as XLSX from "xlsx";
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "../TARIFS";
const OUT = "src/lib/boutique/new-collection-tarifs.json";

function normalize(s) {
  return String(s ?? "").trim();
}

function slugify(s) {
  return normalize(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Extrait une seule sheet type "grille tissu × dimensions" au format Atmosphère. */
function extractGridSheet(rows, sheetName) {
  // Cherche la ligne "Largeur" ou "Largeur en cm" — chaque famille a un
  // layout légèrement différent (POLYESTER : row "Largeur en cm" en col 0,
  // LIN : row "Largeur" en col 1).
  let largeurRowIdx = -1;
  let largeurStartCol = 2;
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const r = rows[i] ?? [];
    for (let c = 0; c < Math.min(3, r.length); c++) {
      const cell = normalize(r[c]).toLowerCase();
      if (cell === "largeur" || cell === "largeur en cm" || cell.startsWith("largeur")) {
        largeurRowIdx = i;
        largeurStartCol = c + 1;
        break;
      }
    }
    if (largeurRowIdx >= 0) break;
  }
  if (largeurRowIdx < 0) return null;

  const largeurRow = rows[largeurRowIdx];
  // Avance jusqu'au premier numérique >= 30 (les largeurs sont en cm)
  while (
    largeurStartCol < largeurRow.length &&
    !(Number.isFinite(Number(largeurRow[largeurStartCol])) &&
      Number(largeurRow[largeurStartCol]) >= 30)
  ) {
    largeurStartCol++;
  }
  const largeurs = [];
  for (let c = largeurStartCol; c < largeurRow.length; c++) {
    const val = Number(largeurRow[c]);
    if (Number.isFinite(val) && val > 0) largeurs.push(val);
    else if (largeurs.length > 0) break;
  }
  if (largeurs.length === 0) return null;

  // Les hauteurs sont dans une des premières colonnes ; on cherche laquelle
  // en regardant la première ligne suivante avec un nombre.
  let hauteurCol = -1;
  for (let r = largeurRowIdx + 1; r < Math.min(largeurRowIdx + 5, rows.length); r++) {
    const row = rows[r] ?? [];
    for (let c = 0; c < largeurStartCol; c++) {
      const v = Number(row[c]);
      if (Number.isFinite(v) && v >= 50 && v <= 800) {
        hauteurCol = c;
        break;
      }
    }
    if (hauteurCol >= 0) break;
  }
  if (hauteurCol < 0) return null;

  const hauteurs = [];
  const grid = [];
  for (let r = largeurRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const hauteur = Number(row[hauteurCol]);
    if (!Number.isFinite(hauteur) || hauteur <= 0) continue;
    const prices = [];
    for (let c = largeurStartCol; c < largeurStartCol + largeurs.length; c++) {
      const p = Number(row[c]);
      prices.push(Number.isFinite(p) ? Math.round(p * 100) / 100 : 0);
    }
    if (prices.some((p) => p > 0)) {
      hauteurs.push(hauteur);
      grid.push(prices);
    }
  }
  if (hauteurs.length === 0) return null;

  return { largeurs, hauteurs, grid };
}

/** Détermine le type de confection depuis le nom de sheet. */
function detectConfection(sheetName) {
  const n = normalize(sheetName).toLowerCase();
  if (n.includes("pli") || n.includes("simple")) return "pli_simple";
  if (n.includes("wave")) return "wave";
  if (n.includes("oeillet") || n.includes("œillet")) return "oeillet";
  if (n.includes("pack")) return "pack";
  if (n.includes("bateau") || n.includes("roman") || n.startsWith("store ")) return "store";
  if (n.includes("enrouleur") || n.includes("roller")) return "enrouleur";
  if (n.includes("screen")) return "screen";
  return slugify(sheetName);
}

/** Parse un fichier Excel et retourne les infos tissu + confections. */
function parseTissuFile(filepath, family) {
  const wb = XLSX.read(readFileSync(filepath));
  const filename = filepath.split("/").pop().replace(/\.xlsx?$/i, "");
  // Extrait "VOGUE" de "VOGUE  _ Collection Atmosphère Tissus"
  const tissuName = filename
    .split("_")[0]
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

  const confections = {};
  let laize = null;
  let coefficient = null;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
    // Row 0 contient parfois coefficient + tissu (laize)
    if (rows[0]) {
      const first = normalize(rows[0][0]);
      if (Number.isFinite(Number(first)) && coefficient === null) {
        coefficient = Number(first);
      }
      const second = normalize(rows[0][1]);
      const laizeMatch = second.match(/\((\d{2,4})\)/);
      if (laizeMatch && laize === null) laize = Number(laizeMatch[1]);
    }
    const grid = extractGridSheet(rows, sheetName);
    if (!grid) continue;
    confections[detectConfection(sheetName)] = grid;
  }

  if (Object.keys(confections).length === 0) return null;

  return {
    name: tissuName,
    family,
    laize,
    coefficient,
    confections,
  };
}

function collectXlsxFilesRecursive(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) collectXlsxFilesRecursive(p, out);
    else if (/\.xlsx$/i.test(entry) && !entry.startsWith("~$")) out.push(p);
  }
  return out;
}

const result = {
  rideau: { tissus: [] },
  store_bateau: { tissus: [] },
  store_enrouleur: { tissus: [] },
  store_screen: { tissus: [] },
};

const paths = {
  rideau: [
    { subdir: "RIDEAUX/TARIFS LIN", family: "LIN" },
    { subdir: "RIDEAUX/TARIFS POLYESTER", family: "POLYESTER" },
    { subdir: "RIDEAUX/TARIFS POLYESTER DOUBLE", family: "POLYESTER_DOUBLE" },
  ],
  store_bateau: [
    { subdir: "STORES BATEAU/POLYESTER ", family: "POLYESTER" },
    { subdir: "STORES BATEAU/POLYESTER DOUBLE", family: "POLYESTER_DOUBLE" },
  ],
  store_enrouleur: [{ subdir: "STORES ENROULEUR", family: "COLLECTION" }],
  store_screen: [{ subdir: "STORES SCREEN", family: "COLLECTION" }],
};

for (const [category, dirs] of Object.entries(paths)) {
  for (const { subdir, family } of dirs) {
    const full = join(ROOT, subdir);
    try {
      const files = collectXlsxFilesRecursive(full);
      for (const f of files) {
        try {
          const parsed = parseTissuFile(f, family);
          if (parsed) result[category].tissus.push(parsed);
        } catch (e) {
          console.error(`ERR ${f}:`, e.message);
        }
      }
    } catch (e) {
      console.warn(`Skip ${full}:`, e.message);
    }
  }
}

writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log(`\n✓ Écrit ${OUT}`);
for (const [cat, data] of Object.entries(result)) {
  console.log(`  ${cat}: ${data.tissus.length} tissus`);
  for (const t of data.tissus) {
    const confKeys = Object.keys(t.confections).join(", ");
    console.log(`    • ${t.name} [${t.family}] laize=${t.laize} → ${confKeys}`);
  }
}
