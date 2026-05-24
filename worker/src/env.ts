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
  workerVersion: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
  // Webhook Atmo notifié instantanément après chaque lead inséré
  atmoWebhookUrl:
    process.env.ATMO_WEBHOOK_URL ??
    'https://atmo-production.up.railway.app/api/webhooks/lm-lead-created',
  atmoWebhookSecret: process.env.ATMO_WEBHOOK_SECRET,
};
