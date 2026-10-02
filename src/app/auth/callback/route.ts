import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Callback d'authentification Supabase.
 *
 * Supabase renvoie l'utilisateur ici sous TROIS formats différents selon
 * le type de lien et la configuration du projet :
 *
 *   1. `?code=xxx`                  → flow PKCE (OAuth, magic link récent)
 *   2. `?token_hash=xxx&type=yyy`   → flow OTP (invite, recovery, email_change)
 *   3. `#access_token=...` (hash)   → flow implicit — INVISIBLE côté serveur,
 *                                      traité par la page client /auth/confirm
 *
 * Avant (bug 02/10) : seul le cas 1 était géré. Les liens d'invitation et
 * de réinitialisation de mot de passe arrivent en cas 2 ou 3 — ils
 * tombaient donc systématiquement sur `redirect('/?error=auth')`, d'où le
 * « le lien ne donne sur rien » rapporté par David.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const isReset = searchParams.get("reset") === "1";

  // Après une invitation ou un reset, l'utilisateur doit choisir son mot
  // de passe. Sinon on l'envoie sur son tableau de bord.
  const defaultNext =
    isReset || type === "recovery" || type === "invite"
      ? "/auth/definir-mot-de-passe"
      : "/dashboard";
  const next = searchParams.get("next") ?? defaultNext;

  const supabase = await createClient();

  // Cas 1 — PKCE
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return NextResponse.redirect(
      `${origin}/?error=auth&reason=${encodeURIComponent(error.message)}`,
    );
  }

  // Cas 2 — OTP (invite / recovery / signup / email_change)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return NextResponse.redirect(
      `${origin}/?error=auth&reason=${encodeURIComponent(error.message)}`,
    );
  }

  // Cas 3 — le token est dans le fragment `#`, que le serveur ne voit pas.
  // On renvoie vers une page client qui lira window.location.hash et
  // posera la session elle-même.
  return NextResponse.redirect(
    `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
  );
}
