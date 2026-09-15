import { config } from 'dotenv';
config({ path: '.env.local' });
config();

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  lmLogin: required('LM_PARTNER_LOGIN'),
  lmPassword: required('LM_PARTNER_PASSWORD'),
  port: Number(process.env.PORT ?? 3000),
  triggerSecret: process.env.WORKER_TRIGGER_SECRET,
  jobPollIntervalMs: Number(process.env.JOB_POLL_INTERVAL_MS ?? 15_000),
  debugTrace: process.env.DEBUG_TRACE === 'true',
  // Kill-switch immédiat : ATMOLEAD_KILL_SWITCH=1 côté Railway → le worker
  // skip toute exécution (cron OU manuelle) sans même toucher au navigateur.
  // Utile pour stopper un flood d'échecs pendant qu'on diagnostique.
  killSwitch: process.env.ATMOLEAD_KILL_SWITCH === '1',
  // Seuil du circuit-breaker : après N échecs consécutifs, le worker pause
  // automatiquement le scraping (met atmolead_config.paused_at = now) et
  // envoie une alerte à l'admin. Défaut 5 = ~1h15 de flou avant coupure
  // avec un cron 15min.
  breakerThreshold: Number(process.env.ATMOLEAD_BREAKER_THRESHOLD ?? 5),
  // Bucket Storage où sont uploadés screenshots + traces Playwright
  artifactsBucket: process.env.ATMOLEAD_ARTIFACTS_BUCKET ?? 'atmolead-artifacts',
  // Emails destinataires de l'alerte "scraper en panne" (comma-sep)
  breakerAlertEmails:
    process.env.ATMOLEAD_BREAKER_ALERT_EMAILS ?? 'dmanscour70@gmail.com',
  // API Brevo côté worker pour envoyer l'alerte (le worker n'a pas accès
  // à la stack Next.js, donc on tape Brevo directement)
  brevoApiKey: process.env.BREVO_API_KEY,
  brevoSenderEmail:
    process.env.BREVO_SENDER_EMAIL ?? 'contact@atmospheretissus.fr',
  workerVersion: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
  // Webhook Atmo notifié instantanément après chaque lead inséré
  atmoWebhookUrl:
    process.env.ATMO_WEBHOOK_URL ??
    'https://atmo-production.up.railway.app/api/webhooks/lm-lead-created',
  atmoWebhookSecret: process.env.ATMO_WEBHOOK_SECRET,
};
