import { env } from './env.js';
import { logger } from './logger.js';
import { supabase } from './supabase.js';
import { runOnce } from './run.js';

export function startQueuePoller(): void {
  const tick = async () => {
    try {
      const { data, error } = await supabase
        .from('atmolead_jobs')
        .select('id, triggered_by')
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1);

      if (error) {
        logger.error({ err: error.message }, 'queue poll failed');
        return;
      }

      const job = data?.[0];
      if (!job) return;

      logger.info({ jobId: job.id }, 'picking up job');
      await runOnce(job.triggered_by as 'cron' | 'manual' | 'startup', job.id);
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, 'queue tick threw');
    }
  };

  setInterval(tick, env.jobPollIntervalMs);
  logger.info({ intervalMs: env.jobPollIntervalMs }, 'queue poller started');
}
