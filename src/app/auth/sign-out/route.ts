import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Déconnexion : invalide la session Supabase puis renvoie vers l'accueil.
 * Répond à GET (lien de la sidebar) comme à POST (formulaire).
 *
 * Cette route renvoyait un 500 en production (06/10). Elle construisait
 * sa cible de redirection en concaténant `NEXT_PUBLIC_APP_URL` sans
 * vérifier que la valeur était bien une URL absolue. Une variable posée
 * sans schéma — « atmo-production.up.railway.app » plutôt que
 * « https://… » — produisait une chaîne que NextResponse.redirect ne
 * peut pas analyser, et l'exception remontait en 500.
 *
 * On valide donc chaque candidat avant de s'en servir, et plus aucune
 * défaillance ne peut empêcher un utilisateur de se déconnecter : en
 * dernier recours on redirige vers l'origine de la requête elle-même.
 */
function firstValidOrigin(candidates: Array<string | null | undefined>): string | null {
  for (const raw of candidates) {
    if (!raw) continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    // Une valeur sans schéma est tolérée : on la complète en https.
    const withScheme = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    try {
      const url = new URL(withScheme);
      // `new URL("https://http:")` est techniquement valide et donnerait
      // un hôte « http ». On exige donc un vrai nom de domaine.
      const host = url.hostname;
      if (!host || (!host.includes(".") && host !== "localhost")) continue;
      return url.origin;
    } catch {
      // Candidat inexploitable, on passe au suivant.
    }
  }
  return null;
}

async function signOutAndRedirect(request: NextRequest) {
  // La déconnexion ne doit jamais échouer à cause de Supabase : même si
  // l'appel casse, on continue et on renvoie l'utilisateur à l'accueil.
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("[sign-out] signOut a échoué, redirection quand même", err);
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  const base =
    firstValidOrigin([
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.RAILWAY_PUBLIC_DOMAIN,
      forwardedHost ? `${forwardedProto}://${forwardedHost}` : null,
      request.url,
    ]) ?? new URL(request.url).origin;

  return NextResponse.redirect(new URL("/", base), { status: 302 });
}

export async function GET(request: NextRequest) {
  return signOutAndRedirect(request);
}

export async function POST(request: NextRequest) {
  return signOutAndRedirect(request);
}
