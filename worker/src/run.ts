import { env } from './env.js';
import { logger } from './logger.js';
import { scrape } from './scraper.js';
import { persistLeads } from './persist.js';
import { supabase, getConfig, setConfigLastRun } from './supabase.js';

type Trigger = 'cron' | 'manual' | 'startup';

let isRunning = false;

export async function runOnce(trigger: Trigger, jobId?: string): Promise<string | null> {
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

    const result = await scrape(config);
    const persistT0 = Date.now();
    const { inserted, skipped } = await persistLeads(exec.id, result.leads);
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
    logger.error({ err: message }, 'scraping failed');
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
  }
}
