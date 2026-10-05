import { Cron } from 'croner';
import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Cron quotidien Pennylane.
 *
 * Le worker tourne déjà 24/7 pour Atmolead — on y greffe un second job
 * qui appelle l'endpoint `/api/cron/pennylane-pull` de l'app Next.js.
 * Celui-ci déclenche deux flux (import des factures + rapprochement des
 * virements bancaires), chacun conditionné à son propre toggle dans
 * `pennylane_settings`. Si les toggles sont off, l'appel répond
 * `disabled: true` sans rien écrire — le cron tourne donc à vide tant
 * que l'activation n'est pas faite côté Paramètres.
 *
 * Avant le 06/10/2026 : l'endpoint existait mais n'était planifié nulle
 * part (ni railway.json, ni GitHub Actions). Résultat, aucun scan n'a
 * jamais tourné en production.
 */
export function startPennylaneCron(): void {
  if (!env.pennylaneCronSecret) {
    logger.warn(
      'PENNYLANE_CRON_SECRET absent — cron Pennylane désactivé',
    );
    return;
  }

  const job = new Cron(
    env.pennylaneCronExpression,
    { protect: true, timezone: 'Europe/Paris' },
    () => {
      void runPennylanePull();
    },
  );

  logger.info(
    {
      expression: env.pennylaneCronExpression,
      next: job.nextRun()?.toISOString(),
      target: env.atmoBaseUrl,
    },
    'cron Pennylane armé',
  );
}

async function runPennylanePull(): Promise<void> {
  const url = `${env.atmoBaseUrl}/api/cron/pennylane-pull?days=${env.pennylanePullDays}`;
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'x-cron-secret': env.pennylaneCronSecret as string },
      signal: AbortSignal.timeout(120_000),
    });
    const body = await res.text();
    if (!res.ok) {
      logger.error(
        { status: res.status, body: body.slice(0, 300) },
        'cron Pennylane : réponse en erreur',
      );
      return;
    }
    logger.info(
      { ms: Date.now() - started, body: body.slice(0, 300) },
      'cron Pennylane exécuté',
    );
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      'cron Pennylane : appel échoué',
    );
  }
}
