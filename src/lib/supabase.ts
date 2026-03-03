import { createClient, type SupabaseClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/database';
// ^ Uncomment after running: npx supabase gen types typescript > src/types/database.ts

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

const isMissing = !supabaseUrl || !supabaseAnonKey;

if (isMissing) {
  // In production builds, missing env vars is a config error — warn loudly
  if (import.meta.env.PROD) {
    console.error(
      '[Arrivé] CRITICAL: Supabase env vars are not configured. ' +
      'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before deploying. ' +
      'The app will run in demo mode — no data will be persisted.'
    );
  } else {
    console.warn(
      '[Arrivé] Missing Supabase env vars. Running in demo mode with mock data. ' +
      'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local to connect.'
    );
  }
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

/** True when Supabase env vars are not configured — use mock data instead */
export const isDemoMode = isMissing;
