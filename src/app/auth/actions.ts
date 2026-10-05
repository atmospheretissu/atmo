"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
  email?: string;
} | undefined;

/**
 * Sign in with email + password (Supabase Auth).
 * Used by the form on the / route.
 */
export async function signInWithPassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email et mot de passe requis.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      error:
        error.message === "Invalid login credentials"
          ? "Identifiants incorrects."
          : error.message,
      email,
    };
  }

  redirect("/dashboard");
}

/**
 * Send a magic link to the email — used as a fallback path.
 */
export async function sendMagicLink(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Email requis.", email };

  // appBaseUrl garantit une URL absolue : `NEXT_PUBLIC_APP_URL ?? ""`
  // produisait sinon un redirect relatif « /auth/callback », que Supabase
  // remplace par son Site URL.
  const { appBaseUrl } = await import("@/lib/auth/action-link");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${appBaseUrl()}/auth/callback`,
      shouldCreateUser: false, // admin-only invites
    },
  });

  if (error) return { error: error.message, email };
  return { email };
}

/**
 * Demande de réinitialisation depuis la page de connexion.
 *
 * Volontairement muette sur l'existence du compte : on répond la même
 * chose qu'un email soit connu ou non, pour ne pas transformer ce
 * formulaire en annuaire des comptes de l'entreprise. L'erreur Supabase
 * n'est pas davantage remontée telle quelle.
 */
export async function requestPasswordResetAction(
  email: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = (email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { ok: false, message: "Adresse email invalide." };
  }

  try {
    // `resetPasswordForEmail` déléguait la construction du lien à
    // Supabase, qui remplace le redirectTo demandé par le « Site URL » du
    // projet quand il n'est pas dans sa liste blanche. Celui-ci valait
    // encore https://localhost:8080 : les mails de réinitialisation
    // envoyaient donc les utilisateurs sur une adresse locale. On
    // fabrique le lien nous-mêmes et on l'envoie par Brevo.
    const { buildAuthActionLink, sendAuthActionLinkEmail } = await import(
      "@/lib/auth/action-link"
    );
    const built = await buildAuthActionLink({ email: trimmed, kind: "recovery" });
    if (built.ok) {
      await sendAuthActionLinkEmail({
        email: trimmed,
        link: built.link,
        kind: "recovery",
      });
    } else {
      // Adresse inconnue, le plus souvent. On le trace côté serveur sans
      // rien en dire au visiteur.
      console.info("[reset] demande sans effet", trimmed, built.message);
    }
  } catch (err) {
    // On avale aussi les erreurs techniques : les signaler reviendrait à
    // distinguer « compte inexistant » de « panne d'envoi ».
    console.warn("[reset] échec technique", err);
  }
  return { ok: true };
}
