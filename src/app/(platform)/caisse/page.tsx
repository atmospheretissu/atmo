import { getTodayStats } from "@/lib/db/caisse";
import CaisseClient from "./caisse-client";

export const dynamic = "force-dynamic";

export default async function CaissePage() {
  const todayStats = await getTodayStats();
  return <CaisseClient todayStats={todayStats} />;
}
