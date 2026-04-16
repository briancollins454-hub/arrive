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
export let isDemoMode = isMissing || sessionStorage.getItem('arrive_demo') === '1';

/** Activate demo mode at runtime (e.g. from the "Explore Demo" button) */
export function enterDemoMode() {
  sessionStorage.setItem('arrive_demo', '1');
  isDemoMode = true;
}

/** Exit demo mode (e.g. when signing in with real credentials) */
export function exitDemoMode() {
  sessionStorage.removeItem('arrive_demo');
  isDemoMode = isMissing;
}

/**
 * Platform admin email — the single account that can onboard new hotels.
 * Set VITE_PLATFORM_ADMIN_EMAIL in .env.local to your email address.
 */
export const PLATFORM_ADMIN_EMAIL = (import.meta.env.VITE_PLATFORM_ADMIN_EMAIL ?? '').toLowerCase();

/** Check if the given email is the platform admin */
export function isPlatformAdmin(email: string | undefined | null): boolean {
  if (!PLATFORM_ADMIN_EMAIL || !email) return false;
  return email.toLowerCase() === PLATFORM_ADMIN_EMAIL;
}
