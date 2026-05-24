import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.ATMOLEAD_WORKER_URL;
  if (!url) {
    return NextResponse.json({
      healthy: false,
      error: "ATMOLEAD_WORKER_URL not configured",
    });
  }
  const t0 = Date.now();
  try {
    const res = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    const latency = Date.now() - t0;
    if (!res.ok) {
      return NextResponse.json({ healthy: false, latency, error: `HTTP ${res.status}` });
    }
    const body = await res.json();
    return NextResponse.json({ healthy: true, latency, ...body });
  } catch (err) {
    return NextResponse.json({
      healthy: false,
      latency: Date.now() - t0,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
