/**
 * Convertit les CSVs de tarification de la boutique en modules TypeScript typés.
 *
 * Source: src/lib/boutique/data/*.csv
 * Cible:  src/lib/boutique/data.ts (tout en un, sauf le catalogue produits — split)
 *         src/lib/boutique/products-catalog.ts (47k lignes — séparé)
 *
 * Usage: node scripts/build-boutique-data.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src/lib/boutique");
const dataDir = join(root, "data");

function parseCsv(filename) {
  const raw = readFileSync(join(dataDir, filename), "utf-8");
  const lines = raw.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    // Simple CSV parser — fields may contain leading spaces, no embedded commas.
    const fields = line.split(",");
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (fields[i] ?? "").trim();
    });
    return row;
  });
}

function asNumber(v) {
  if (v === "" || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ---------- CONFIG ----------
const configRows = parseCsv("config.csv");
const config = {
  coefficients: {
    "Plis simples": Number(configRows.find((r) => r.cle === "coefficient_plis_simples").valeur),
    Vague: Number(configRows.find((r) => r.cle === "coefficient_vague").valeur),
    "À œillets": Number(configRows.find((r) => r.cle === "coefficient_oeillets").valeur),
  },
  margesConfection: Number(configRows.find((r) => r.cle === "marges_confection").valeur),
  doublureOccultante: {
    laize: Number(configRows.find((r) => r.cle === "doublure_occultante_laize").valeur),
    prixParMetre: Number(configRows.find((r) => r.cle === "doublure_occultante_prix_par_metre").valeur),
  },
  coefficientCache: Number(configRows.find((r) => r.cle === "coefficient_cache").valeur),
  coutCoude: Number(configRows.find((r) => r.cle === "cout_coude").valeur),
  supplementChainette: Number(configRows.find((r) => r.cle === "supplement_chainette").valeur),
  forfaits: {
    deplacement: Number(configRows.find((r) => r.cle === "forfait_deplacement").valeur),
    nettoyage: Number(configRows.find((r) => r.cle === "forfait_nettoyage").valeur),
  },
};

// ---------- PRODUCT IDS (Woocommerce mapping) ----------
const productIdsRows = parseCsv("product_ids.csv");
const productIds = productIdsRows.map((r) => ({
  type: r.type,
  sousType: r.sous_type,
  productId: Number(r.product_id),
}));

// ---------- TARIFS CONFECTION (3 types × bandes largeur/hauteur × double|non) ----------
function parseConfection(file) {
  return parseCsv(file).map((r) => ({
    typeDouble: r.type_double, // "double" | "non_double"
    plageLargeur: r.plage_largeur,
    plageHauteur: r.plage_hauteur,
    prix: Number(r.prix),
  }));
}
const confectionPlisSimples = parseConfection("tarifs_confection_plis_simples.csv");
const confectionVague = parseConfection("tarifs_confection_vague.csv");
const confectionOeillets = parseConfection("tarifs_confection_oeillets.csv");

// ---------- TARIFS ACCESSOIRES (par bande de largeur) ----------
function parseAccByLargeur(file) {
  return parseCsv(file).map((r) => ({ plageLargeur: r.plage_largeur, prix: Number(r.prix) }));
}
const accessoiresPlisSimples = parseAccByLargeur("tarifs_accessoires_plis_simples.csv");
const accessoiresVague = parseAccByLargeur("tarifs_accessoires_vague.csv");
const accessoiresOeillets = parseAccByLargeur("tarifs_accessoires_oeillets.csv");

// ---------- RAILS ----------
const rails = parseCsv("tarifs_rails.csv").map((r) => ({
  typeConfection: r.type_confection, // CS / CV / DS / DV
  typePose: r.type_pose, // plafond / face
  plageLargeur: r.plage_largeur,
  prix: Number(r.prix),
}));

// ---------- POSE ----------
const poseRideaux = parseCsv("tarifs_pose_rideaux.csv").map((r) => ({
  plageLargeur: r.plage_largeur,
  plageHauteur: r.plage_hauteur,
  prix: Number(r.prix),
}));
const poseStores = parseCsv("tarifs_pose_stores.csv").map((r) => ({
  plageLargeur: r.plage_largeur,
  plageHauteur: r.plage_hauteur,
  prix: Number(r.prix),
}));

// ---------- STORES — mécanismes + bateau + accessoires ----------
const mecanismes = parseCsv("tarifs_mecanismes.csv").map((r) => ({
  largeur: Number(r.largeur),
  prix: Number(r.prix),
}));
const storeBateau = parseCsv("tarifs_store_bateau.csv").map((r) => ({
  largeur: Number(r.largeur),
  hauteur: Number(r.hauteur),
  typeDouble: r.type_double,
  prix: Number(r.prix),
}));
const accessoiresStore = parseCsv("tarifs_accessoires_store.csv").map((r) => ({
  largeur: Number(r.largeur),
  hauteur: Number(r.hauteur),
  prix: Number(r.prix),
}));

// ---------- RIDEAUX EN SÉRIE ----------
const rideauxEnSerie = parseCsv("rideaux_en_serie.csv").map((r) => ({
  type: r.Type,
  finition: r.Finition,
  doublage: r.Doublage,
  tissu: r.Tissu,
  largeur: Number(r.Largeur),
  hauteur: Number(r.Hauteur),
  prix: Number(r.Prix),
}));

// ---------- CATALOGUE PRODUITS (séparé — 47k lignes) ----------
const catalogRows = parseCsv("produits_catalogue.csv");
const catalog = catalogRows.map((r) => ({
  nom: r.nom?.trim() ?? "",
  fournisseur: r.fournisseur?.trim() ?? "",
  prix: asNumber(r.prix),
  designation: r.designation?.trim() ?? "",
  reference: r.reference?.trim() ?? "",
  type: r.type?.trim() ?? "",
}));

// Stats
console.log(`Config: ${configRows.length} rows`);
console.log(`Product IDs: ${productIds.length}`);
console.log(`Confection (3 types): ${confectionPlisSimples.length + confectionVague.length + confectionOeillets.length}`);
console.log(`Rails: ${rails.length}`);
console.log(`Pose: ${poseRideaux.length + poseStores.length}`);
console.log(`Mécanismes/bateau/accStore: ${mecanismes.length + storeBateau.length + accessoiresStore.length}`);
console.log(`Rideaux en série: ${rideauxEnSerie.length}`);
console.log(`Catalogue produits: ${catalog.length}`);

// ---------- WRITE: data.ts (TARIFS + CONFIG + tout sauf catalogue) ----------
const dataModule = `// Auto-generated from src/lib/boutique/data/*.csv by scripts/build-boutique-data.mjs
// Ne pas éditer à la main. Modifier les CSV puis relancer le script.

export type TypeRideau = "Plis simples" | "Vague" | "À œillets";
export type TypeStore = "Bateau régulier" | "Bateau irrégulier";
export type TypeRail = "CS" | "CV" | "DS" | "DV" | "Tringle";
export type TypePose = "plafond" | "face";

export interface ConfectionTarif {
  typeDouble: "double" | "non_double";
  plageLargeur: string;
  plageHauteur: string;
  prix: number;
}
export interface AccLargeurTarif {
  plageLargeur: string;
  prix: number;
}
export interface RailTarif {
  typeConfection: TypeRail;
  typePose: TypePose;
  plageLargeur: string;
  prix: number;
}
export interface PoseTarif {
  plageLargeur: string;
  plageHauteur: string;
  prix: number;
}
export interface MecanismeTarif { largeur: number; prix: number; }
export interface StoreBateauTarif { largeur: number; hauteur: number; typeDouble: "double" | "non_double"; prix: number; }
export interface AccStoreTarif { largeur: number; hauteur: number; prix: number; }
export interface RideauSerie {
  type: string;
  finition: string;
  doublage: string;
  tissu: string;
  largeur: number;
  hauteur: number;
  prix: number;
}
export interface ProductId {
  type: string;
  sousType: string;
  productId: number;
}

export const CONFIG = ${JSON.stringify(config, null, 2)} as const;

export const PRODUCT_IDS: ProductId[] = ${JSON.stringify(productIds, null, 2)};

export const CONFECTION_PLIS_SIMPLES: ConfectionTarif[] = ${JSON.stringify(confectionPlisSimples)};
export const CONFECTION_VAGUE: ConfectionTarif[] = ${JSON.stringify(confectionVague)};
export const CONFECTION_OEILLETS: ConfectionTarif[] = ${JSON.stringify(confectionOeillets)};

export const ACCESSOIRES_PLIS_SIMPLES: AccLargeurTarif[] = ${JSON.stringify(accessoiresPlisSimples)};
export const ACCESSOIRES_VAGUE: AccLargeurTarif[] = ${JSON.stringify(accessoiresVague)};
export const ACCESSOIRES_OEILLETS: AccLargeurTarif[] = ${JSON.stringify(accessoiresOeillets)};

export const RAILS: RailTarif[] = ${JSON.stringify(rails)};
export const POSE_RIDEAUX: PoseTarif[] = ${JSON.stringify(poseRideaux)};
export const POSE_STORES: PoseTarif[] = ${JSON.stringify(poseStores)};

export const MECANISMES: MecanismeTarif[] = ${JSON.stringify(mecanismes)};
export const STORE_BATEAU: StoreBateauTarif[] = ${JSON.stringify(storeBateau)};
export const ACCESSOIRES_STORE: AccStoreTarif[] = ${JSON.stringify(accessoiresStore)};

export const RIDEAUX_EN_SERIE: RideauSerie[] = ${JSON.stringify(rideauxEnSerie)};
`;

writeFileSync(join(root, "data.ts"), dataModule);
console.log(`✓ src/lib/boutique/data.ts written (${dataModule.length.toLocaleString()} chars)`);

// ---------- WRITE: products-catalog.json + .ts wrapper ----------
// Le JSON contourne le problème "union type too complex" de TypeScript.
writeFileSync(join(root, "products-catalog.json"), JSON.stringify(catalog));

const catalogWrapper = `// Auto-generated. ${catalog.length.toLocaleString()} produits du catalogue.
// Le JSON est importé via une assertion d'import — pas d'inférence TS de types littéraux.

export interface CatalogProduct {
  nom: string;
  fournisseur: string;
  prix: number | null;
  designation: string;
  reference: string;
  type: string;
}

import data from "./products-catalog.json";
export const CATALOG_PRODUCTS = data as CatalogProduct[];
`;

writeFileSync(join(root, "products-catalog.ts"), catalogWrapper);
console.log(`✓ src/lib/boutique/products-catalog.{json,ts} written`);

console.log("\n✅ Build done.");
