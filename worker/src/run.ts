import { env } from './env.js';
import { logger } from './logger.js';
import { scrape } from './scraper.js';
import { persistLeads } from './persist.js';
import { supabase, getConfig, setConfigLastRun } from './supabase.js';

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

    const result = await withTimeout(scrape(config), RUN_TIMEOUT_MS, 'scrape');
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
      })
      .eq('id', exec.id);

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
    const partialSteps = (err as Error & { steps?: unknown }).steps;
    timedOut = Boolean((err as Error & { isTimeout?: true }).isTimeout);
    logger.error({ err: message, timedOut }, 'scraping failed');
    await supabase
      .from('atmolead_executions')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - t0,
        error_message: message,
        logs: partialSteps ?? null,
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
