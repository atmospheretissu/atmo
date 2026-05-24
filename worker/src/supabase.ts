import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { env } from './env.js';

// Polyfill native WebSocket for environments where it's not built in.
// Supabase realtime-js needs WebSocket even though we don't use realtime —
// we pass it explicitly so it doesn't crash on Node < 22.
if (typeof globalThis.WebSocket === 'undefined') {
  (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = WebSocket;
}

export const supabase: SupabaseClient = createClient(
  env.supabaseUrl,
  env.supabaseServiceRoleKey,
  {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocket as unknown as never },
    global: { headers: { 'x-application': 'atmolead-worker' } },
  },
);

export type AtmoleadConfig = {
  id: true;
  target_url: string;
  cron_expression: string;
  enabled: boolean;
  css_selectors: Record<string, string>;
  last_run_at: string | null;
  notes: string | null;
};

export async function getConfig(): Promise<AtmoleadConfig> {
  const { data, error } = await supabase
    .from('atmolead_config')
    .select('*')
    .single();
  if (error || !data) throw new Error(`Failed to load atmolead_config: ${error?.message}`);
  return data as AtmoleadConfig;
}

export async function setConfigLastRun(): Promise<void> {
  await supabase
    .from('atmolead_config')
    .update({ last_run_at: new Date().toISOString() })
    .eq('id', true);
}
