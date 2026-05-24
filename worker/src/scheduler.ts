import { Cron } from 'croner';
import { logger } from './logger.js';
import { getConfig } from './supabase.js';
import { runOnce } from './run.js';

let currentCron: Cron | null = null;
let currentExpression: string | null = null;

export async function startScheduler(): Promise<void> {
  await refreshSchedule();

  // Re-check every 5 minutes whether the cron expression was changed via the dashboard.
  setInterval(() => {
    refreshSchedule().catch((err) =>
      logger.error({ err: err instanceof Error ? err.message : String(err) }, 'failed to refresh schedule'),
    );
  }, 5 * 60_000);
}

async function refreshSchedule(): Promise<void> {
  const config = await getConfig();
  if (!config.enabled) {
    if (currentCron) {
      logger.info('scraping disabled — stopping cron');
      currentCron.stop();
      currentCron = null;
      currentExpression = null;
    }
    return;
  }

  if (currentExpression === config.cron_expression) return;

  if (currentCron) {
    logger.info({ from: currentExpression, to: config.cron_expression }, 'cron expression changed — rescheduling');
    currentCron.stop();
  }

  currentCron = new Cron(config.cron_expression, { protect: true }, () => {
    logger.info('cron fired');
    runOnce('cron').catch((err) =>
      logger.error({ err: err instanceof Error ? err.message : String(err) }, 'cron run failed'),
    );
  });
  currentExpression = config.cron_expression;
  logger.info({ expression: currentExpression, next: currentCron.nextRun()?.toISOString() }, 'scheduler armed');
}
