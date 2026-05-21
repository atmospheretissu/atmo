import { NextResponse, type NextRequest } from "next/server";
import { processPendingLmLeadAlerts } from "@/lib/events/process-pending";

/**
 * Endpoint cron : traite tous les events pending (leads LM non-alertés).
 *
 * Appel manuel : GET ou POST sur /api/cron/process-pending-events
 * Cron externe : cron-job.org, EasyCron, Railway cron, etc. — toutes les 1-5 min.
 *
 * Auth optionnelle via header `x-cron-secret` = $CRON_SECRET (recommandé en prod).
 */
async function handle(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const provided = request.headers.get("x-cron-secret");
    if (provided !== expected) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const result = await processPendingLmLeadAlerts({ batchSize: 50 });
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
