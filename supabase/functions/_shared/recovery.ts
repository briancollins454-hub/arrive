// supabase/functions/_shared/recovery.ts
// Build a recovery URL that lands on the SPA directly (token_hash flow).
// Avoids embedding the Supabase verify URL in emails, which often 404s when
// redirect URLs or APP_URL are misconfigured.

const DEFAULT_APP_URL = 'https://www.arrivebooking.online';

export function resolveAppUrl(): string {
  const raw = (Deno.env.get('APP_URL') ?? '').trim().replace(/\/$/, '');
  return raw || DEFAULT_APP_URL;
}

export function buildRecoveryUrl(
  appUrl: string,
  properties: { hashed_token?: string; action_link?: string },
): string | null {
  if (properties.hashed_token) {
    const params = new URLSearchParams({
      token_hash: properties.hashed_token,
      type: 'recovery',
    });
    return `${appUrl}/reset-password?${params.toString()}`;
  }
  return properties.action_link ?? null;
}
