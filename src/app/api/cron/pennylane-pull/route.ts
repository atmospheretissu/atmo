import { NextResponse } from "next/server";
import { pullPennylaneInvoices } from "@/lib/pennylane/pull";
import { pullWireTransfersAndReconcile } from "@/lib/pennylane/wire-match";

export const dynamic = "force-dynamic";

/**
 * Endpoint appelé par un cron externe (worker Railway Atmolead).
 *
 * Sécurisé par un header `x-cron-secret` qui doit matcher
 * `PENNYLANE_CRON_SECRET` en env. Le worker doit envoyer une requête
 * horaire (ou selon la fréquence choisie).
 *
 * Exemple d'appel côté worker :
 *   curl -X POST -H "x-cron-secret: <secret>" \
 *     https://app.atmospheretissus.fr/api/cron/pennylane-pull
 *
 * Renvoie un JSON de rapport :
 *   { ok, scanned, matched, errors, disabled? }
 */
export async function POST(request: Request) {
  const expected = process.env.PENNYLANE_CRON_SECRET?.trim();
  const provided = request.headers.get("x-cron-secret")?.trim();
  if (!expected) {
    return NextResponse.json(
      { ok: false, message: "PENNYLANE_CRON_SECRET absent côté serveur" },
      { status: 503 },
    );
  }
  if (!provided || provided !== expected) {
    return NextResponse.json(
      { ok: false, message: "unauthorized" },
      { status: 401 },
    );
  }

  try {
    const url = new URL(request.url);
    const days = Number(url.searchParams.get("days") ?? "30");
    const since = new Date(Date.now() - days * 86400_000)
      .toISOString()
      .slice(0, 10);
    // 2 flux pull sont exécutés en parallèle (chacun respecte son
    // propre toggle, disabled=true si off).
    const [invoicesResult, wiresResult] = await Promise.all([
      pullPennylaneInvoices({ sinceISODate: since }),
      pullWireTransfersAndReconcile({ sinceISODate: since }),
    ]);
    return NextResponse.json({
      ok: true,
      invoices: invoicesResult,
      wires: wiresResult,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

/** Ping GET pour vérifier que la route existe (renvoie 200 sans exec). */
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "pennylane-pull",
    method: "POST with x-cron-secret header",
  });
}
