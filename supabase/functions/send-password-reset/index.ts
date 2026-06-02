// supabase/functions/send-password-reset/index.ts
// ============================================================
// Edge Function — Self-service password reset (public)
// ============================================================
// Body: { email }
// Generates a Supabase recovery link via the admin API and emails
// a branded reset link through the platform Resend account.
// Always returns success (never reveals whether an account exists).
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders, json } from '../_shared/cors.ts';
import { passwordResetEmail, sendPlatformEmail } from '../_shared/email.ts';
import { resolveAppUrl, buildRecoveryUrl } from '../_shared/recovery.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const email = (body.email ?? '').trim().toLowerCase();

    // Neutral response — never reveal account existence.
    const neutral = json({ success: true });
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return neutral;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const appUrl = resolveAppUrl();
    const redirectTo = `${appUrl}/reset-password`;

    // generateLink does NOT send email — we send via Resend only.
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    });

    const resetUrl = data?.properties ? buildRecoveryUrl(appUrl, data.properties) : null;
    if (error || !resetUrl) {
      console.warn('[send-password-reset] no link:', error?.message ?? 'missing token');
      return neutral;
    }

    // Try to use the person's name if we have a staff record.
    let name: string | undefined;
    const { data: staff } = await admin
      .from('staff_members')
      .select('name')
      .eq('email', email)
      .maybeSingle();
    if (staff?.name) name = staff.name as string;

    try {
      const { subject, html } = passwordResetEmail({ name, resetUrl });
      await sendPlatformEmail({ to: email, subject, html });
    } catch (err) {
      console.error('[send-password-reset] email failed:', err instanceof Error ? err.message : err);
    }

    return neutral;
  } catch (err) {
    console.error('[send-password-reset] error:', err instanceof Error ? err.message : err);
    // Still neutral to avoid leaking anything.
    return json({ success: true });
  }
});
