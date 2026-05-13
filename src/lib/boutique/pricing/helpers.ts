/**
 * Helpers de tarification — portés depuis AtmosphèreV15.html.
 * Fonctions pures, utilisables côté client comme serveur.
 */

import {
  CONFIG,
  CONFECTION_OEILLETS,
  CONFECTION_PLIS_SIMPLES,
  CONFECTION_VAGUE,
  ACCESSOIRES_OEILLETS,
  ACCESSOIRES_PLIS_SIMPLES,
  ACCESSOIRES_VAGUE,
  RAILS,
  POSE_RIDEAUX,
  POSE_STORES,
  MECANISMES,
  STORE_BATEAU,
  ACCESSOIRES_STORE,
  type TypeRideau,
  type TypeRail,
  type TypePose,
  type ConfectionTarif,
  type AccLargeurTarif,
  type PoseTarif,
} from "@/lib/boutique/data";

/**
 * Une plage type "0-150" ou "151-240" matche-t-elle une valeur ?
 */
function matchesRange(range: string, value: number): boolean {
  const [low, high] = range.split("-").map(Number);
  return value >= low && value <= high;
}

function findTarifInRange<T extends { plageLargeur: string }>(
  rows: T[],
  largeur: number
): T | undefined {
  return rows.find((r) => matchesRange(r.plageLargeur, largeur));
}

/**
 * Coefficient de tissu pour un type de rideau.
 */
export function getCoefficient(typeRideau: TypeRideau): number {
  return CONFIG.coefficients[typeRideau] ?? 1.7;
}

/**
 * Confection : prix selon type, dimensions et doublage.
 */
export function getTarifConfection(
  typeRideau: TypeRideau,
  largeur: number,
  hauteur: number,
  double: boolean
): number {
  let rows: ConfectionTarif[];
  if (typeRideau === "Plis simples") rows = CONFECTION_PLIS_SIMPLES;
  else if (typeRideau === "Vague") rows = CONFECTION_VAGUE;
  else rows = CONFECTION_OEILLETS;

  const typeDouble = double ? "double" : "non_double";
  const row = rows.find(
    (r) =>
      r.typeDouble === typeDouble &&
      matchesRange(r.plageLargeur, largeur) &&
      matchesRange(r.plageHauteur, hauteur)
  );
  return row?.prix ?? 0;
}

/**
 * Accessoires confection — par bande de largeur, par type.
 */
export function getTarifAccessoires(
  typeRideau: TypeRideau,
  largeur: number
): number {
  let rows: AccLargeurTarif[];
  if (typeRideau === "Plis simples") rows = ACCESSOIRES_PLIS_SIMPLES;
  else if (typeRideau === "Vague") rows = ACCESSOIRES_VAGUE;
  else rows = ACCESSOIRES_OEILLETS;

  return findTarifInRange(rows, largeur)?.prix ?? 0;
}

/**
 * Rail : prix selon type confection, type pose, largeur.
 */
export function getTarifRail(
  typeConfection: TypeRail,
  typePose: TypePose,
  largeur: number
): number {
  const row = RAILS.find(
    (r) =>
      r.typeConfection === typeConfection &&
      r.typePose === typePose &&
      matchesRange(r.plageLargeur, largeur)
  );
  return row?.prix ?? 0;
}

/**
 * Pose rideau : prix par bande de dimensions.
 */
export function getTarifPoseRideau(largeur: number, hauteur: number): number {
  const row = POSE_RIDEAUX.find(
    (r) => matchesRange(r.plageLargeur, largeur) && matchesRange(r.plageHauteur, hauteur)
  );
  return row?.prix ?? 0;
}

/**
 * Pose store : prix par bande.
 */
export function getTarifPoseStore(largeur: number, hauteur: number): number {
  const row = POSE_STORES.find(
    (r) => matchesRange(r.plageLargeur, largeur) && matchesRange(r.plageHauteur, hauteur)
  );
  return row?.prix ?? 0;
}

/**
 * Mécanisme de store — interpolation entre les paliers de largeur.
 * Le CSV donne les prix pour 60, 80, 100, 120, 150, 180, 200, 220, 250, 300.
 */
export function getMecanismeStore(largeur: number): number {
  const sorted = [...MECANISMES].sort((a, b) => a.largeur - b.largeur);
  // largeur <= plus petit
  if (largeur <= sorted[0].largeur) return sorted[0].prix;
  // largeur >= plus grand
  if (largeur >= sorted[sorted.length - 1].largeur)
    return sorted[sorted.length - 1].prix;
  // entre deux paliers → on prend le palier supérieur (politique conservative)
  for (const row of sorted) {
    if (largeur <= row.largeur) return row.prix;
  }
  return sorted[sorted.length - 1].prix;
}

/**
 * Accessoires store — par dimensions.
 */
export function getAccessoiresStore(largeur: number, hauteur: number): number {
  // Le CSV donne des combinaisons spécifiques (50x50, 50x100, ...). On prend
  // le palier le plus proche par défaut conservatif (supérieur).
  const sorted = [...ACCESSOIRES_STORE].sort(
    (a, b) => a.largeur + a.hauteur - (b.largeur + b.hauteur)
  );
  for (const row of sorted) {
    if (row.largeur >= largeur && row.hauteur >= hauteur) return row.prix;
  }
  return sorted[sorted.length - 1]?.prix ?? 0;
}

// ============================================================================
// CALCULATEURS COMPLETS
// ============================================================================

export interface RideauInput {
  typeRideau: TypeRideau;
  largeurFinie: number;
  hauteurFinie: number;
  laizeTissu: number;
  raccordTissu: number;
  prixTissuMetre: number;
  double: boolean;
  rail: TypeRail;
  poseRail: TypePose;
  nombreCoudes: number;
  avecPose: boolean;
}

export interface RideauCalculation {
  metrageTotal: number;
  prixTissu: number;
  prixDoublure: number;
  prixConfection: number;
  prixAccessoires: number;
  prixRail: number;
  prixCoudes: number;
  prixPose: number;
  prixTotal: number;
  details: {
    coefficient: number;
    hauteurLe: number;
    sensConfection: string;
    nombreLes: number;
    metrageDoublure?: number;
  };
}

/**
 * Calcule le prix complet d'un rideau sur mesure.
 * Reproduit la logique de calculateRideau() depuis AtmosphèreV15.html.
 */
export function calculateRideau(input: RideauInput): RideauCalculation {
  const calc: RideauCalculation = {
    metrageTotal: 0,
    prixTissu: 0,
    prixDoublure: 0,
    prixConfection: 0,
    prixAccessoires: 0,
    prixRail: 0,
    prixCoudes: 0,
    prixPose: 0,
    prixTotal: 0,
    details: {
      coefficient: 1.7,
      hauteurLe: 0,
      sensConfection: "",
      nombreLes: 0,
    },
  };

  const coefficient = getCoefficient(input.typeRideau);
  const hauteurLe = input.hauteurFinie + CONFIG.margesConfection;
  calc.details.coefficient = coefficient;
  calc.details.hauteurLe = hauteurLe;

  let sensConfection: string;
  let metrageTotal: number;
  let nombreLes: number;

  if (hauteurLe <= input.laizeTissu) {
    sensConfection = "Dans la hauteur";
    const largeurDeveloppee = input.largeurFinie * coefficient;
    metrageTotal = largeurDeveloppee / 100;
    nombreLes = 1;
  } else {
    sensConfection = "Lés verticaux (dans la largeur)";
    const largeurDeveloppee = input.largeurFinie * coefficient;
    nombreLes = Math.ceil(largeurDeveloppee / input.laizeTissu);
    let hauteurAvecRaccord = hauteurLe;
    if (input.raccordTissu > 0) {
      hauteurAvecRaccord =
        Math.ceil(hauteurLe / input.raccordTissu) * input.raccordTissu;
    }
    metrageTotal = (nombreLes * hauteurAvecRaccord) / 100;
  }

  calc.details.sensConfection = sensConfection;
  calc.details.nombreLes = nombreLes;
  calc.metrageTotal = metrageTotal;
  calc.prixTissu = metrageTotal * input.prixTissuMetre;

  // Doublure
  if (input.double) {
    let metrageDoublure = 0;
    if (hauteurLe <= CONFIG.doublureOccultante.laize) {
      metrageDoublure = (input.largeurFinie * coefficient) / 100;
    } else {
      const nombreLesDoublure = Math.ceil(
        (input.largeurFinie * coefficient) / CONFIG.doublureOccultante.laize
      );
      metrageDoublure = (nombreLesDoublure * hauteurLe) / 100;
    }
    calc.prixDoublure = metrageDoublure * CONFIG.doublureOccultante.prixParMetre;
    calc.details.metrageDoublure = metrageDoublure;
  }

  calc.prixConfection = getTarifConfection(
    input.typeRideau,
    input.largeurFinie,
    input.hauteurFinie,
    input.double
  );
  calc.prixAccessoires = getTarifAccessoires(input.typeRideau, input.largeurFinie);
  calc.prixRail = getTarifRail(input.rail, input.poseRail, input.largeurFinie);
  calc.prixCoudes = input.nombreCoudes * CONFIG.coutCoude;

  if (input.avecPose) {
    // tarifPose + forfait_deplacement - 45 (formule existante)
    calc.prixPose =
      getTarifPoseRideau(input.largeurFinie, input.hauteurFinie) +
      CONFIG.forfaits.deplacement -
      45;
  }

  calc.prixTotal =
    calc.prixTissu +
    calc.prixDoublure +
    calc.prixConfection +
    calc.prixAccessoires +
    calc.prixRail +
    calc.prixCoudes +
    calc.prixPose;

  return calc;
}

// ----------------------------------------------------------------------------

export interface StoreInput {
  typeStore: "Bateau régulier" | "Bateau irrégulier";
  largeurFinie: number;
  hauteurFinie: number;
  laizeTissu: number;
  prixTissuMetre: number;
  double: boolean;
  chainetteCouleur: string; // "blanc" = pas de supplément
  avecPose: boolean;
}

export interface StoreCalculation {
  metrageTotal: number;
  prixTissu: number;
  prixDoublure: number;
  prixConfection: number;
  prixAccessoires: number;
  prixMecanisme: number;
  supplementChainette: number;
  prixPose: number;
  prixTotal: number;
  details: {
    hauteurAvecMarge: number;
    sensConfection: string;
    nombreLes: number;
    prixMecanismeAffiche: number;
  };
}

/**
 * Calcule le prix complet d'un store sur mesure.
 */
export function calculateStore(input: StoreInput): StoreCalculation {
  const calc: StoreCalculation = {
    metrageTotal: 0,
    prixTissu: 0,
    prixDoublure: 0,
    prixConfection: 0,
    prixAccessoires: 0,
    prixMecanisme: 0,
    supplementChainette: 0,
    prixPose: 0,
    prixTotal: 0,
    details: {
      hauteurAvecMarge: 0,
      sensConfection: "",
      nombreLes: 0,
      prixMecanismeAffiche: 0,
    },
  };

  const hauteurAvecMarge =
    input.hauteurFinie + Math.ceil(input.hauteurFinie / 100) * 15;
  calc.details.hauteurAvecMarge = hauteurAvecMarge;

  let metrageTotal: number;
  let sensConfection: string;
  let nombreLes: number;

  if (hauteurAvecMarge <= input.laizeTissu) {
    sensConfection = "Dans la hauteur";
    metrageTotal = input.largeurFinie / 100;
    nombreLes = 1;
  } else {
    sensConfection = "Lés verticaux (dans la largeur)";
    nombreLes = Math.ceil(input.largeurFinie / input.laizeTissu);
    metrageTotal = (nombreLes * hauteurAvecMarge) / 100;
  }

  calc.details.sensConfection = sensConfection;
  calc.details.nombreLes = nombreLes;
  calc.metrageTotal = metrageTotal;
  calc.prixTissu = metrageTotal * input.prixTissuMetre;

  if (input.double) {
    calc.prixDoublure = metrageTotal * CONFIG.doublureOccultante.prixParMetre;
  }

  // Confection store bateau — table par dimensions
  calc.prixConfection = getTarifConfectionStore(
    input.largeurFinie,
    input.hauteurFinie,
    input.double
  );

  // Mécanisme + cache coefficient
  const mecBase = getMecanismeStore(input.largeurFinie);
  calc.prixMecanisme = mecBase * CONFIG.coefficientCache;
  calc.details.prixMecanismeAffiche = mecBase;

  if (input.chainetteCouleur && input.chainetteCouleur !== "blanc") {
    calc.supplementChainette = CONFIG.supplementChainette;
  }

  calc.prixAccessoires = getAccessoiresStore(input.largeurFinie, input.hauteurFinie);

  if (input.avecPose) {
    calc.prixPose =
      getTarifPoseStore(input.largeurFinie, input.hauteurFinie) +
      CONFIG.forfaits.deplacement -
      45;
  }

  calc.prixTotal =
    calc.prixTissu +
    calc.prixDoublure +
    calc.prixConfection +
    calc.prixMecanisme +
    calc.supplementChainette +
    calc.prixAccessoires +
    calc.prixPose;

  return calc;
}

/**
 * Confection store bateau : table par largeur × hauteur.
 */
export function getTarifConfectionStore(
  largeur: number,
  hauteur: number,
  double: boolean
): number {
  const typeDouble = double ? "double" : "non_double";
  // On cherche le palier directement supérieur ou égal
  const sorted = [...STORE_BATEAU]
    .filter((r) => r.typeDouble === typeDouble)
    .sort((a, b) => a.largeur + a.hauteur - (b.largeur + b.hauteur));
  for (const row of sorted) {
    if (row.largeur >= largeur && row.hauteur >= hauteur) return row.prix;
  }
  return sorted[sorted.length - 1]?.prix ?? 0;
}
