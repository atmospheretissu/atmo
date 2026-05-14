import { listCollectionProducts, getCollectionStats } from "@/lib/db/collection";
import CollectionClient from "./collection-client";

export const dynamic = "force-dynamic";

export default async function CollectionPage() {
  const [products, stats] = await Promise.all([
    listCollectionProducts(),
    getCollectionStats(),
  ]);
  return <CollectionClient products={products} categories={stats.categories} />;
}
