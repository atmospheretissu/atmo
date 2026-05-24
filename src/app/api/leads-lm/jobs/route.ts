import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAtmoleadJob } from "@/lib/db/atmolead";
import { canAccess } from "@/lib/db/profiles-shared";
import type { UserRole } from "@/lib/db/profiles-shared";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.role as UserRole | undefined;
  if (!role || !canAccess(role, "/leads-lm")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const result = await createAtmoleadJob("manual", user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }

  // Best-effort nudge to the worker (it'll pick up the job from the queue anyway).
  const workerUrl = process.env.ATMOLEAD_WORKER_URL;
  const triggerSecret = process.env.ATMOLEAD_WORKER_TRIGGER_SECRET;
  if (workerUrl) {
    fetch(`${workerUrl}/trigger`, {
      method: "POST",
      headers: triggerSecret ? { authorization: `Bearer ${triggerSecret}` } : {},
      signal: AbortSignal.timeout(3000),
    }).catch(() => {
      // Nudge failed — the queue poller will pick it up
    });
  }

  return NextResponse.json({ jobId: result.jobId }, { status: 202 });
}
