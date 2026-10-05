import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicOrigin } from "@/lib/http/public-origin";

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
 * Le garde-fou vit maintenant dans @/lib/http/public-origin, partagé avec
 * /auth/callback qui souffrait du même défaut. `allowRequestFallback`
 * autorise ici le repli sur l'URL de la requête : une déconnexion doit
 * aboutir même si la configuration est incomplète.
 */
async function signOutAndRedirect(request: NextRequest) {
  // La déconnexion ne doit jamais échouer à cause de Supabase : même si
  // l'appel casse, on continue et on renvoie l'utilisateur à l'accueil.
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("[sign-out] signOut a échoué, redirection quand même", err);
  }

  const base = publicOrigin(request, { allowRequestFallback: true });

  return NextResponse.redirect(new URL("/", base), { status: 302 });
}

export async function GET(request: NextRequest) {
  return signOutAndRedirect(request);
}

export async function POST(request: NextRequest) {
  return signOutAndRedirect(request);
}
