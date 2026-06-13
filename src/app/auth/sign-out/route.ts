import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Déconnexion : invalide la session Supabase puis redirige vers /.
 * Supporte GET (lien dans la sidebar) ET POST (form classique) — la route
 * fait toujours la même chose, peu importe le verbe.
 */
async function signOutAndRedirect(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // En prod, request.url peut pointer sur localhost (proxy interne).
  // On préfère l'origine publique configurée, sinon on retombe sur les
  // headers forwardés, puis en dernier recours sur request.url.
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const railwayUrl = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : null;
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const forwardedUrl = forwardedHost ? `${forwardedProto}://${forwardedHost}` : null;

  const base =
    envUrl ?? railwayUrl ?? forwardedUrl ?? new URL(request.url).origin;
  return NextResponse.redirect(`${base}/`, { status: 302 });
}

export async function GET(request: NextRequest) {
  return signOutAndRedirect(request);
}

export async function POST(request: NextRequest) {
  return signOutAndRedirect(request);
}
