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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/callback`,
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

  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "https://atmo-production.up.railway.app");
  const appUrl = raw.startsWith("http")
    ? raw.replace(/\/+$/, "")
    : `https://${raw.replace(/\/+$/, "")}`;

  try {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(
        "/auth/definir-mot-de-passe",
      )}`,
    });
  } catch {
    // On avale aussi les erreurs techniques : les signaler reviendrait à
    // distinguer « compte inexistant » de « quota SMTP atteint ».
  }
  return { ok: true };
}
