import { getTodayStats } from "@/lib/db/caisse";
import { listAllPayments } from "@/lib/db/payments-feed";
import CaissePageClient from "./caisse-page";

export const dynamic = "force-dynamic";

export default async function CaissePage() {
  const [todayStats, payments] = await Promise.all([
    getTodayStats(),
    listAllPayments({ limit: 200 }),
  ]);
  return <CaissePageClient todayStats={todayStats} payments={payments} />;
}
