/**
 * Origine publique de l'application, pour les redirections absolues.
 *
 * ─── Pourquoi ne pas se servir de `request.url` ───────────────────────
 * Sur Railway, l'application écoute sur localhost:8080 derrière un
 * proxy. `new URL(request.url).origin` ne renvoie donc PAS l'adresse
 * par laquelle le visiteur est arrivé, mais celle du conteneur :
 * `https://localhost:8080`.
 *
 * C'est l'explication du bug signalé le 06/10/2026 : les liens de
 * réinitialisation de mot de passe aboutissaient bien sur
 * `/auth/callback`, la session s'ouvrait correctement, puis la route
 * renvoyait l'utilisateur sur `https://localhost:8080/auth/
 * definir-mot-de-passe` — une adresse qui ne mène nulle part depuis un
 * navigateur. Même cause pour le 500 de `/auth/sign-out` corrigé la
 * veille, raison pour laquelle le garde-fou est désormais partagé plutôt
 * que recopié dans chaque route.
 *
 * Ordre de préférence : la variable d'environnement explicite, le
 * domaine fourni par Railway, puis les en-têtes du proxy. `request.url`
 * ne sert que de dernier recours, pour qu'une déconnexion ou un retour
 * de callback ne puisse jamais échouer faute d'URL exploitable.
 */

export function firstValidOrigin(
  candidates: Array<string | null | undefined>,
): string | null {
  for (const raw of candidates) {
    if (!raw) continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    // Une valeur sans schéma est tolérée : on la complète en https.
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
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

/**
 * Origine à utiliser pour renvoyer le visiteur vers l'application.
 *
 * `allowRequestFallback: false` (défaut pour les parcours d'auth) refuse
 * de retomber sur `request.url` : mieux vaut un lien cassé repéré en
 * recette qu'une redirection vers localhost:8080 en production. Les
 * routes qui doivent aboutir coûte que coûte — la déconnexion — passent
 * `true`.
 */
export function publicOrigin(
  request: Request,
  opts: { allowRequestFallback?: boolean } = {},
): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  const resolved = firstValidOrigin([
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.RAILWAY_PUBLIC_DOMAIN,
    forwardedHost ? `${forwardedProto}://${forwardedHost}` : null,
    request.headers.get("host") && !/^localhost(:|$)/i.test(request.headers.get("host")!)
      ? `${forwardedProto}://${request.headers.get("host")}`
      : null,
  ]);
  if (resolved) return resolved;

  if (opts.allowRequestFallback) {
    try {
      return new URL(request.url).origin;
    } catch {
      /* rien d'exploitable */
    }
  }
  return "https://atmo-production.up.railway.app";
}
