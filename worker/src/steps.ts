export type StepStatus = 'ok' | 'failed' | 'partial';

export type Step = {
  name: string;
  label: string;
  status: StepStatus;
  started_at: string;
  duration_ms: number;
  message?: string;
  data?: Record<string, unknown>;
};

export class StepRecorder {
  private steps: Step[] = [];

  async run<T>(
    name: string,
    label: string,
    fn: () => Promise<T>,
    extract?: (result: T) => Record<string, unknown>,
  ): Promise<T> {
    const t0 = Date.now();
    const startedAt = new Date().toISOString();
    try {
      const result = await fn();
      this.steps.push({
        name,
        label,
        status: 'ok',
        started_at: startedAt,
        duration_ms: Date.now() - t0,
        data: extract?.(result),
      });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.steps.push({
        name,
        label,
        status: 'failed',
        started_at: startedAt,
        duration_ms: Date.now() - t0,
        message,
      });
      throw err;
    }
  }

  record(step: Omit<Step, 'started_at' | 'duration_ms'> & Partial<Pick<Step, 'started_at' | 'duration_ms'>>): void {
    this.steps.push({
      started_at: step.started_at ?? new Date().toISOString(),
      duration_ms: step.duration_ms ?? 0,
      ...step,
    } as Step);
  }

  toJSON(): Step[] {
    return [...this.steps];
  }
}
