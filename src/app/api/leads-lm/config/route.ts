import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { updateAtmoleadConfig } from "@/lib/db/atmolead";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  target_url: z.string().url(),
  cron_expression: z.string().min(1),
  enabled: z.boolean(),
  css_selectors: z.record(z.string(), z.string()),
  notes: z.string().nullable().optional(),
});

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Only admins can change scraper config — affects security (URL, selectors).
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Réservé aux administrateurs" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides" },
      { status: 400 },
    );
  }

  const result = await updateAtmoleadConfig({
    target_url: parsed.data.target_url,
    cron_expression: parsed.data.cron_expression,
    enabled: parsed.data.enabled,
    css_selectors: parsed.data.css_selectors,
    notes: parsed.data.notes ?? null,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
