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
