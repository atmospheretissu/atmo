/**
 * Configure les redirect URLs autorisées dans Supabase Auth.
 *
 * Nécessaire après chaque ajout d'environnement (prod Railway, staging…),
 * sinon Supabase rejette les callbacks OAuth + reset password vers ces URLs.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx \
 *   SUPABASE_PROJECT_REF=mryvgigwmbuusbxzgoym \
 *   PROD_URL=https://atmo.up.railway.app \
 *   node scripts/configure-auth-urls.mjs
 *
 * Le SUPABASE_ACCESS_TOKEN (PAT) se génère sur:
 *   https://supabase.com/dashboard/account/tokens
 *
 * ⚠ Alternative: tu peux faire cette config manuellement dans le dashboard :
 *   Project Settings → Authentication → URL Configuration
 *     - Site URL: <PROD_URL>
 *     - Redirect URLs:
 *         http://localhost:3000/auth/callback
 *         http://localhost:3001/auth/callback
 *         <PROD_URL>/auth/callback
 */

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
const prodUrl = process.env.PROD_URL;

function bail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (!token) bail("Manque SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)");
if (!ref) bail("Manque SUPABASE_PROJECT_REF (ex: mryvgigwmbuusbxzgoym)");
if (!prodUrl) bail("Manque PROD_URL (ex: https://atmo-production.up.railway.app)");

const redirectUrls = [
  "http://localhost:3000/auth/callback",
  "http://localhost:3001/auth/callback",
  `${prodUrl}/auth/callback`,
];

console.log(`→ Configuration Supabase Auth pour le projet ${ref}…`);
console.log(`  Site URL    : ${prodUrl}`);
console.log(`  Redirect URLs:`);
for (const u of redirectUrls) console.log(`    - ${u}`);
console.log("");

const res = await fetch(
  `https://api.supabase.com/v1/projects/${ref}/config/auth`,
  {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      site_url: prodUrl,
      uri_allow_list: redirectUrls.join(","),
    }),
  }
);

if (!res.ok) {
  const text = await res.text();
  bail(`Échec API Supabase (${res.status}): ${text}`);
}

console.log("✓ Configuration mise à jour.");
console.log("  Tu peux maintenant te connecter en prod sur l'URL Railway.");
