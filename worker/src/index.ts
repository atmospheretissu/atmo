import { logger } from './logger.js';
import { startHealthServer } from './health.js';
import { startScheduler } from './scheduler.js';
import { startQueuePoller } from './queue.js';
import { sweepStaleExecutions } from './run.js';

async function main(): Promise<void> {
  logger.info('atmolead-worker booting');
  startHealthServer();
  // Reclaim any stuck 'running' executions left by a previous process.
  // Without this, an orphan row + an in-memory isRunning flag could block
  // every subsequent cron (skipping forever with "already in progress").
  await sweepStaleExecutions('worker startup').catch((err) =>
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'startup sweep failed'),
  );
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
