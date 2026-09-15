import { env } from './env.js';
import { logger } from './logger.js';
import { scrape } from './scraper.js';
import { persistLeads } from './persist.js';
import { supabase, getConfig, setConfigLastRun } from './supabase.js';
import { notifyBreakerTripped } from './breaker-notify.js';

type Trigger = 'cron' | 'manual' | 'startup';

// A run that exceeds this duration is considered hung and forcibly aborted.
// The worker then exits so Railway restarts it with a clean Playwright state.
const RUN_TIMEOUT_MS = Number(process.env.RUN_TIMEOUT_MS ?? 5 * 60_000);

// Stale = a 'running' execution row whose started_at is older than this.
// Sweep marks them as 'failed' so they don't stay stuck forever in the UI
// AND so a hung in-memory flag from a previous worker process can't block runs.
const STALE_THRESHOLD_MS = Math.max(RUN_TIMEOUT_MS * 1.5, 10 * 60_000);

let isRunning = false;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`Timeout après ${Math.round(ms / 1000)}s: ${label}`);
      (err as Error & { isTimeout?: true }).isTimeout = true;
      reject(err);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer!));
}

export async function sweepStaleExecutions(reason: string): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();
  const { data, error } = await supabase
    .from('atmolead_executions')
    .update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      error_message: `Stale: ${reason} (started before ${cutoff})`,
    })
    .eq('status', 'running')
    .lt('started_at', cutoff)
    .select('id');
  if (error) {
    logger.warn({ err: error.message }, 'sweep stale executions failed');
    return 0;
  }
  const count = data?.length ?? 0;
  if (count > 0) {
    logger.warn({ count, reason }, 'swept stale running executions');
    // Also mark any orphan jobs pointing at those executions as failed
    const ids = data!.map((d) => (d as { id: string }).id);
    await supabase
      .from('atmolead_jobs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_message: `Stale: ${reason}`,
      })
      .in('execution_id', ids);
  }
  return count;
}

export async function runOnce(trigger: Trigger, jobId?: string): Promise<string | null> {
  // Kill-switch immédiat via env var — court-circuite tout, y compris
  // l'insertion du row d'exécution (évite de polluer la table).
  if (env.killSwitch) {
    logger.warn({ trigger }, 'kill-switch ATMOLEAD_KILL_SWITCH=1 → skip');
    return null;
  }

  // Defensive sweep: clean up any 'running' row left behind by a previous
  // process that crashed without flushing its status. Cheap query (indexed
  // status + started_at), runs in < 50ms most of the time.
  await sweepStaleExecutions('reclaimed at run start').catch(() => {});

  if (isRunning) {
    logger.warn({ trigger }, 'run already in progress — skipping');
    return null;
  }
  isRunning = true;

  const { data: exec, error: execErr } = await supabase
    .from('atmolead_executions')
    .insert({
      status: 'running',
      triggered_by: trigger,
      worker_version: env.workerVersion,
    })
    .select('id, started_at')
    .single();

  if (execErr || !exec) {
    isRunning = false;
    logger.error({ err: execErr }, 'failed to create execution row');
    return null;
  }

  if (jobId) {
    await supabase
      .from('atmolead_jobs')
      .update({ status: 'running', picked_at: new Date().toISOString(), execution_id: exec.id })
      .eq('id', jobId);
  }

  const t0 = Date.now();
  let timedOut = false;
  try {
    const config = await getConfig();
    if (!config.enabled) {
      await supabase
        .from('atmolead_executions')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - t0,
          error_message: 'scraping disabled in atmolead_config',
        })
        .eq('id', exec.id);
      if (jobId) {
        await supabase
          .from('atmolead_jobs')
          .update({ status: 'cancelled', finished_at: new Date().toISOString() })
          .eq('id', jobId);
      }
      return exec.id;
    }

    // Circuit-breaker : si la config est en pause (paused_at non-null), on
    // court-circuite immédiatement. Permet à un admin d'arrêter le scraping
    // depuis la DB sans redéployer, et au breaker de pauser automatiquement
    // après N échecs consécutifs. On enregistre un row "cancelled" pour
    // garder la trace mais pas "failed" (évite de compter comme un échec
    // qui pousserait le compteur plus loin).
    const cfgAny = config as { paused_at?: string | null; paused_reason?: string | null };
    if (cfgAny.paused_at) {
      logger.warn({ pausedAt: cfgAny.paused_at, reason: cfgAny.paused_reason }, 'scraper paused — skip');
      await supabase
        .from('atmolead_executions')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - t0,
          error_message: `Scraper en pause depuis ${cfgAny.paused_at} — motif : ${cfgAny.paused_reason ?? 'n/a'}`,
        })
        .eq('id', exec.id);
      if (jobId) {
        await supabase
          .from('atmolead_jobs')
          .update({ status: 'cancelled', finished_at: new Date().toISOString() })
          .eq('id', jobId);
      }
      return exec.id;
    }

    const result = await withTimeout(scrape(config, exec.id), RUN_TIMEOUT_MS, 'scrape');
    const persistT0 = Date.now();
    const { inserted, skipped } = await withTimeout(
      persistLeads(exec.id, result.leads),
      60_000,
      'persist',
    );
    const persistMs = Date.now() - persistT0;

    const steps = [
      ...result.steps,
      {
        name: 'persist',
        label: `Insertion dans Supabase (${inserted} insérés / ${skipped} ignorés)`,
        status: skipped === 0 ? 'ok' : 'partial',
        started_at: new Date(persistT0).toISOString(),
        duration_ms: persistMs,
        data: { inserted, skipped, total: result.leads.length },
      },
    ];

    // No-error path: scraping itself succeeded. Skipped leads (duplicates,
    // missing fields) are informational, not a failure. Only the catch branch
    // below marks 'failed'.
    const status = skipped > 0 && inserted > 0 ? 'partial' : 'success';
    const resultAny = result as { tracePath?: string | null };
    await supabase
      .from('atmolead_executions')
      .update({
        status,
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - t0,
        leads_found: result.leads.length,
        leads_inserted: inserted,
        leads_skipped: skipped,
        logs: steps,
        trace_path: resultAny.tracePath ?? null,
      })
      .eq('id', exec.id);

    // Reset le compteur d'échecs consécutifs — un succès efface l'ardoise
    await supabase
      .from('atmolead_config')
      .update({ consecutive_failures: 0 })
      .neq('consecutive_failures', 0);

    await setConfigLastRun();

    if (jobId) {
      await supabase
        .from('atmolead_jobs')
        .update({ status: 'done', finished_at: new Date().toISOString() })
        .eq('id', jobId);
    }

    logger.info({ executionId: exec.id, found: result.leads.length, inserted, skipped }, 'execution finished');
    return exec.id;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const errAny = err as Error & {
      steps?: unknown;
      isTimeout?: true;
      screenshotPath?: string | null;
      tracePath?: string | null;
    };
    const partialSteps = errAny.steps;
    timedOut = Boolean(errAny.isTimeout);
    logger.error({ err: message, timedOut }, 'scraping failed');

    await supabase
      .from('atmolead_executions')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - t0,
        error_message: message,
        logs: partialSteps ?? null,
        screenshot_path: errAny.screenshotPath ?? null,
        trace_path: errAny.tracePath ?? null,
      })
      .eq('id', exec.id);

    if (jobId) {
      await supabase
        .from('atmolead_jobs')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_message: message,
        })
        .eq('id', jobId);
    }

    // Circuit-breaker : incrémente le compteur d'échecs consécutifs. Si on
    // atteint le seuil → pause auto + email admin. Best-effort — un échec
    // ici ne remonte pas au caller (le run reste "failed", peu importe).
    try {
      const { data: cfg } = await supabase
        .from('atmolead_config')
        .select('consecutive_failures, paused_at')
        .maybeSingle();
      const cfgAny = (cfg ?? {}) as {
        consecutive_failures?: number | null;
        paused_at?: string | null;
      };
      const newCount = (cfgAny.consecutive_failures ?? 0) + 1;
      if (!cfgAny.paused_at && newCount >= env.breakerThreshold) {
        const reason = `${newCount} échecs consécutifs — dernier : ${message.slice(0, 200)}`;
        await supabase
          .from('atmolead_config')
          .update({
            consecutive_failures: newCount,
            paused_at: new Date().toISOString(),
            paused_reason: reason,
          })
          .not('consecutive_failures', 'is', null);
        logger.warn(
          { newCount, threshold: env.breakerThreshold },
          'circuit-breaker tripped — scraper paused',
        );
        await notifyBreakerTripped({
          consecutiveFailures: newCount,
          lastErrorMessage: message,
          lastExecutionId: exec.id,
          reason,
        });
      } else {
        await supabase
          .from('atmolead_config')
          .update({ consecutive_failures: newCount })
          .not('consecutive_failures', 'is', null);
      }
    } catch (breakerErr) {
      logger.warn({ err: breakerErr }, 'breaker bookkeeping failed');
    }

    return exec.id;
  } finally {
    isRunning = false;
    // On timeout we can't trust the Playwright session state — exit so Railway
    // restarts the container with a fresh Chromium. Give async logs a tick.
    if (timedOut) {
      logger.error('exiting process after timeout — Railway will restart');
      setTimeout(() => process.exit(1), 500);
    }
  }
}
