/**
 * Crée le premier utilisateur admin via Supabase Auth Admin API.
 *
 * Usage:
 *   ADMIN_EMAIL=david@atmospheretissus.fr \
 *   ADMIN_PASSWORD='un-mot-de-passe-fort' \
 *   ADMIN_FULL_NAME='David Manscour' \
 *   node scripts/create-admin.mjs
 *
 * Variables d'env requises (lues depuis .env.local si présent) :
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - ADMIN_EMAIL
 *   - ADMIN_PASSWORD (au moins 8 caractères)
 *   - ADMIN_FULL_NAME (optionnel — défaut: partie avant @)
 *
 * Le trigger `on_auth_user_created` créera automatiquement le profil
 * dans public.profiles avec role='admin' (passé via user_metadata).
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// Lit .env.local si présent (utile en local — Railway passe les vars en env directement)
const envPath = join(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const fullName = process.env.ADMIN_FULL_NAME ?? email?.split("@")[0];

function bail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (!url || !key) bail("Manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY");
if (!email || !email.includes("@")) bail("ADMIN_EMAIL invalide ou manquant");
if (!password || password.length < 8) bail("ADMIN_PASSWORD trop court (min 8 caractères)");

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`→ Création du compte admin ${email}…`);

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true, // pas d'email de validation à cliquer
  user_metadata: {
    full_name: fullName,
    role: "admin",
  },
});

if (error) {
  if (error.message.toLowerCase().includes("already")) {
    console.log(`ℹ Compte existant pour ${email} — vérification du rôle…`);
    const { data: users } = await supabase.auth.admin.listUsers();
    const existing = users?.users.find((u) => u.email === email);
    if (existing) {
      // S'assure que le profil a bien le rôle admin (au cas où il aurait été créé sans)
      const { error: e2 } = await supabase
        .from("profiles")
        .update({ role: "admin", full_name: fullName })
        .eq("id", existing.id);
      if (e2) bail(`Échec mise à jour profil : ${e2.message}`);
      console.log(`✓ Compte ${email} mis à jour avec role=admin.`);
      console.log(`  user.id = ${existing.id}`);
      process.exit(0);
    }
  }
  bail(`Échec création : ${error.message}`);
}

console.log(`✓ Compte créé.`);
console.log(`  user.id = ${data.user.id}`);
console.log(`  email   = ${data.user.email}`);
console.log(`  role    = admin (via trigger handle_new_user)`);
console.log("");
console.log(`Tu peux maintenant te connecter sur l'app avec ${email}.`);
