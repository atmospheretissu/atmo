import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Diagnostic des variables d'env critiques (admin uniquement).
 *
 * Ne renvoie JAMAIS les valeurs — uniquement booléens + longueur, pour ne pas
 * fuiter de secret dans les logs / l'historique navigateur.
 *
 * GET /api/admin/env-check
 */
export async function GET() {
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
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Réservé aux administrateurs" }, { status: 403 });
  }

  const stat = (v: string | undefined) => ({
    set: Boolean(v),
    length: v?.length ?? 0,
  });

  const env = {
    supabase: {
      NEXT_PUBLIC_SUPABASE_URL: stat(process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: stat(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_ROLE_KEY: stat(process.env.SUPABASE_SERVICE_ROLE_KEY),
      SUPABASE_WEBHOOK_SECRET: stat(process.env.SUPABASE_WEBHOOK_SECRET),
    },
    stripe: {
      STRIPE_PUBLISHABLE_KEY: stat(process.env.STRIPE_PUBLISHABLE_KEY),
      STRIPE_SECRET_KEY: stat(process.env.STRIPE_SECRET_KEY),
      STRIPE_WEBHOOK_SECRET: stat(process.env.STRIPE_WEBHOOK_SECRET),
    },
    brevo: {
      BREVO_API_KEY: stat(process.env.BREVO_API_KEY),
      BREVO_SENDER_EMAIL: stat(process.env.BREVO_SENDER_EMAIL),
      BREVO_SENDER_NAME: stat(process.env.BREVO_SENDER_NAME),
      BREVO_SMS_SENDER: stat(process.env.BREVO_SMS_SENDER),
    },
    pennylane: {
      PENNYLANE_API_KEY: stat(process.env.PENNYLANE_API_KEY),
    },
    app: {
      NEXT_PUBLIC_APP_URL: stat(process.env.NEXT_PUBLIC_APP_URL),
      NEXT_PUBLIC_APP_NAME: stat(process.env.NEXT_PUBLIC_APP_NAME),
      APP_ADMIN_SECRET: stat(process.env.APP_ADMIN_SECRET),
      CRON_SECRET: stat(process.env.CRON_SECRET),
    },
    atmolead: {
      ATMOLEAD_WORKER_URL: stat(process.env.ATMOLEAD_WORKER_URL),
      ATMOLEAD_WORKER_TRIGGER_SECRET: stat(process.env.ATMOLEAD_WORKER_TRIGGER_SECRET),
    },
  };

  // Services "prêts" = toutes leurs vars critiques set
  const services = {
    supabase: env.supabase.NEXT_PUBLIC_SUPABASE_URL.set
      && env.supabase.NEXT_PUBLIC_SUPABASE_ANON_KEY.set
      && env.supabase.SUPABASE_SERVICE_ROLE_KEY.set,
    stripeCheckout: env.stripe.STRIPE_SECRET_KEY.set
      && env.stripe.STRIPE_PUBLISHABLE_KEY.set,
    stripeWebhook: env.stripe.STRIPE_WEBHOOK_SECRET.set,
    brevoEmail: env.brevo.BREVO_API_KEY.set && env.brevo.BREVO_SENDER_EMAIL.set,
    brevoSms: env.brevo.BREVO_API_KEY.set,
    pennylane: env.pennylane.PENNYLANE_API_KEY.set,
    cron: env.app.CRON_SECRET.set,
    atmoleadWorker: env.atmolead.ATMOLEAD_WORKER_URL.set,
    leadsWebhook: env.supabase.SUPABASE_WEBHOOK_SECRET.set,
  };

  return NextResponse.json(
    {
      ok: true,
      runtime: {
        railway_commit: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
        node_env: process.env.NODE_ENV,
      },
      services,
      env,
    },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
