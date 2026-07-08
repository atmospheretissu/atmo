"use server";

import {
  listTarifTissusByCategory,
  type NewCollectionCategory,
  type Tissu,
} from "@/lib/db/boutique-tarifs";

export async function listTarifTissusAction(
  category: NewCollectionCategory,
): Promise<Tissu[]> {
  return listTarifTissusByCategory(category);
}
