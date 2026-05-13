// Auto-generated. 47,066 produits du catalogue.
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
