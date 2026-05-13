import { NextResponse } from "next/server";

/**
 * Liveness + readiness probe.
 * Returns 200 when the Node process is healthy. Used by Railway's
 * healthchecks and any external monitoring (UptimeRobot, BetterStack, …).
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "atmosphere-tissus",
      timestamp: new Date().toISOString(),
      version: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
    },
    {
      status: 200,
      headers: {
        "cache-control": "no-store",
      },
    }
  );
}
