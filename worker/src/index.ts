import { logger } from './logger.js';
import { startHealthServer } from './health.js';
import { startScheduler } from './scheduler.js';
import { startQueuePoller } from './queue.js';

async function main(): Promise<void> {
  logger.info('atmolead-worker booting');
  startHealthServer();
  await startScheduler();
  startQueuePoller();
  logger.info('atmolead-worker ready');
}

main().catch((err) => {
  logger.error({ err: err instanceof Error ? err.message : String(err) }, 'fatal boot error');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason: reason instanceof Error ? reason.message : String(reason) }, 'unhandledRejection');
});
process.on('uncaughtException', (err) => {
  logger.error({ err: err.message }, 'uncaughtException');
});
