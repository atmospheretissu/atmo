/**
 * Liens d'authentification (invitation, réinitialisation de mot de passe).
 *
 * ─── Pourquoi ce fichier existe ───────────────────────────────────────
 * Jusqu'au 06/10/2026 on se contentait du lien fourni par Supabase :
 * `generateLink()` renvoie une propriété `action_link`, et
 * `resetPasswordForEmail()` envoie un mail dont le lien est construit par
 * Supabase. Dans les deux cas l'URL de destination N'EST PAS celle qu'on
 * demande via `redirectTo` : Supabase compare la valeur demandée à la
 * liste blanche du projet (Authentication → URL Configuration) et, si
 * elle n'y figure pas, la remplace silencieusement par le « Site URL »
 * configuré. Celui du projet valait encore `https://localhost:8080`,
 * valeur par défaut d'un projet neuf — d'où les liens de
 * réinitialisation qui pointaient vers `https://localhost:8080/auth/
 * definir-mot-de-passe`, signalés en production.
 *
 * Deux façons de corriger : configurer la liste blanche côté Supabase
 * (nécessite un accès console ou un jeton Management valide), ou ne plus
 * dépendre du tout de cette configuration. On choisit la seconde, parce
 * qu'elle est vérifiable ici et ne peut plus se dérégler : `generateLink`
 * renvoie aussi le `hashed_token` brut, et c'est tout ce qu'il faut pour
 * fabriquer nous-mêmes l'URL. `/auth/callback` la consomme déjà via
 * `verifyOtp({ type, token_hash })` — cas 2 de la route.
 *
 * Effet de bord bienvenu : plus aucun mail d'authentification ne passe
 * par le SMTP Supabase, limité à 3 envois par heure en offre gratuite.
 * Tout part par Brevo, comme le reste des mails de l'application.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";

export type AuthLinkKind = "invite" | "recovery";

/** Base URL publique de l'app, toujours absolue et sans slash final. */
export function appBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "https://atmo-production.up.railway.app");
  const trimmed = raw.trim().replace(/\/+$/, "");
  // Une variable posée sans schéma a déjà provoqué un 500 sur
  // /auth/sign-out : on la complète plutôt que de la propager telle quelle.
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export type AuthLinkResult =
  | { ok: true; link: string; userId: string | null }
  | { ok: false; message: string };

/**
 * Fabrique un lien d'invitation ou de réinitialisation pointant vers
 * notre propre domaine, sans dépendre de la liste blanche Supabase.
 *
 * `kind: "invite"` crée le compte s'il n'existe pas encore ;
 * `kind: "recovery"` échoue si l'adresse est inconnue — à l'appelant de
 * décider s'il expose cette information (le formulaire public, non).
 */
export async function buildAuthActionLink(input: {
  email: string;
  kind: AuthLinkKind;
  /** Page d'arrivée après validation du jeton. */
  next?: string;
}): Promise<AuthLinkResult> {
  const email = (input.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Email invalide." };
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: input.kind,
    email,
  });
  if (error) return { ok: false, message: error.message };

  const hashedToken = data?.properties?.hashed_token;
  if (!hashedToken) {
    return { ok: false, message: "Supabase n'a pas renvoyé de jeton." };
  }

  const next = input.next ?? "/auth/definir-mot-de-passe";
  const url = new URL(`${appBaseUrl()}/auth/callback`);
  url.searchParams.set("token_hash", hashedToken);
  url.searchParams.set("type", input.kind);
  url.searchParams.set("next", next);

  return { ok: true, link: url.toString(), userId: data?.user?.id ?? null };
}

/**
 * Envoie le lien par mail via Brevo. Utilisé par le formulaire « mot de
 * passe oublié » et par l'onglet Utilisateurs lorsque l'admin choisit
 * l'envoi automatique plutôt que la copie du lien.
 */
export async function sendAuthActionLinkEmail(input: {
  email: string;
  link: string;
  kind: AuthLinkKind;
  fullName?: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { sendBrevoEmail, isBrevoConfigured } = await import("@/lib/brevo/client");
  const { wrapAtmoEmail } = await import("@/lib/brevo/email-shell");

  if (!isBrevoConfigured()) {
    return { ok: false, message: "BREVO_API_KEY non configurée." };
  }

  const isInvite = input.kind === "invite";
  const greeting = input.fullName?.trim() ? `Bonjour ${input.fullName.trim()},` : "Bonjour,";
  const subject = isInvite
    ? "Votre accès à l'outil Atmosphère Tissus"
    : "Réinitialisation de votre mot de passe";

  const inner = `
    <p style="margin:0 0 16px 0;font-size:14.5px;line-height:1.6;color:#1f2430;font-family:Arial,sans-serif">${greeting}</p>
    <p style="margin:0 0 16px 0;font-size:14.5px;line-height:1.6;color:#1f2430;font-family:Arial,sans-serif">${
      isInvite
        ? "Un accès vient d'être créé pour vous sur l'outil interne Atmosphère Tissus. Cliquez sur le bouton ci-dessous pour choisir votre mot de passe."
        : "Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau."
    }</p>
    <!-- atmo:cta -->
    <p style="margin:0 0 8px 0;font-size:12.5px;line-height:1.6;color:#6b7280;font-family:Arial,sans-serif">
      Ce lien est valable une heure et ne peut être utilisé qu'une seule fois.
      ${isInvite ? "" : "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message : votre mot de passe actuel reste valable."}
    </p>`;

  const html = wrapAtmoEmail(inner, {
    title: isInvite ? "Bienvenue sur l'outil Atmosphère" : "Nouveau mot de passe",
    preheader: subject,
    primaryCta: {
      url: input.link,
      label: isInvite ? "Choisir mon mot de passe" : "Réinitialiser mon mot de passe",
    },
  });

  const res = await sendBrevoEmail({
    to: [{ email: input.email, name: input.fullName ?? undefined }],
    subject,
    htmlContent: html,
    textContent: `${greeting}\n\n${
      isInvite
        ? "Un accès vient d'être créé pour vous sur l'outil interne Atmosphère Tissus."
        : "Vous avez demandé à réinitialiser votre mot de passe."
    }\n\nLien (valable une heure, usage unique) :\n${input.link}\n`,
  });

  return res.ok ? { ok: true } : { ok: false, message: res.message };
}
