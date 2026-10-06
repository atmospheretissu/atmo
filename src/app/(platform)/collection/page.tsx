import { listCollectionProducts, getCollectionStats } from "@/lib/db/collection";
import { listCollectionOrders } from "@/lib/db/collection-orders";
import CollectionClient from "./collection-client";

export const dynamic = "force-dynamic";

export default async function CollectionPage() {
  const [products, stats, orders] = await Promise.all([
    listCollectionProducts(),
    getCollectionStats(),
    listCollectionOrders(),
  ]);
  return (
    <CollectionClient
      products={products}
      categories={stats.categories}
      orders={orders}
    />
  );
}
