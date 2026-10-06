import { listCollectionProducts, getCollectionStats } from "@/lib/db/collection";
import { listCollectionOrders } from "@/lib/db/collection-orders";
import { getEffectiveProfile } from "@/lib/db/impersonation";
import CollectionClient from "./collection-client";

export const dynamic = "force-dynamic";

export default async function CollectionPage() {
  const profile = await getEffectiveProfile();

  // L'usine partenaire (rôle collection_atmosphere) n'a rien à faire dans
  // le catalogue — prix d'achat, remises Leroy Merlin — et ne doit pouvoir
  // renseigner que ses deux dates. Le reste de la page lui est en lecture.
  // Les politiques RLS et le trigger de la migration 20261006200000 posent
  // la même limite côté base : l'interface ne fait que la refléter.
  // effectiveRole et non actualRole : un admin qui simule ce rôle depuis le
  // sélecteur d'impersonation doit voir exactement ce que l'usine verra.
  const isUsine = profile?.effectiveRole === "collection_atmosphere";

  const [products, stats, orders] = await Promise.all([
    isUsine ? Promise.resolve([]) : listCollectionProducts(),
    isUsine
      ? Promise.resolve({ categories: [] as string[] })
      : getCollectionStats(),
    listCollectionOrders(),
  ]);

  return (
    <CollectionClient
      products={products}
      categories={stats.categories}
      orders={orders}
      usineOnly={isUsine}
    />
  );
}
