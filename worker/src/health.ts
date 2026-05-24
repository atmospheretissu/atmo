import { createServer } from 'node:http';
import { env } from './env.js';
import { logger } from './logger.js';
import { runOnce } from './run.js';

export function startHealthServer(): void {
  const server = createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, version: env.workerVersion }));
      return;
    }

    if (req.method === 'POST' && req.url === '/trigger') {
      const auth = req.headers.authorization?.replace(/^Bearer\s+/i, '');
      if (env.triggerSecret && auth !== env.triggerSecret) {
        res.writeHead(401).end('unauthorized');
        return;
      }
      res.writeHead(202, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ accepted: true }));
      runOnce('manual').catch((err) =>
        logger.error({ err: err instanceof Error ? err.message : String(err) }, 'manual trigger failed'),
      );
      return;
    }

    res.writeHead(404).end('not found');
  });

  server.listen(env.port, () => {
    logger.info({ port: env.port }, 'health server listening');
  });
}
