import { getTodayStats, getPreviousUnclosedDay } from "@/lib/db/caisse";
import { listAllPayments } from "@/lib/db/payments-feed";
import CaissePageClient from "./caisse-page";

export const dynamic = "force-dynamic";

export default async function CaissePage() {
  const [todayStats, payments, blockedDay] = await Promise.all([
    getTodayStats(),
    listAllPayments({ limit: 200 }),
    getPreviousUnclosedDay(),
  ]);
  return (
    <CaissePageClient
      todayStats={todayStats}
      payments={payments}
      blockedDay={blockedDay}
    />
  );
}
