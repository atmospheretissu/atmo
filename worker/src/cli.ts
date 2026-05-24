import { runOnce } from './run.js';
import { logger } from './logger.js';

const cmd = process.argv[2];

if (cmd === 'run-once') {
  runOnce('manual')
    .then((id) => {
      logger.info({ executionId: id }, 'one-shot run finished');
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, 'one-shot run failed');
      process.exit(1);
    });
} else {
  console.error(`Unknown command: ${cmd}. Available: run-once`);
  process.exit(1);
}
