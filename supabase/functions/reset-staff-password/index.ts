// supabase/functions/reset-staff-password/index.ts
// ============================================================
// Edge Function — Manager-initiated staff password reset
// ============================================================
// Body: { staff_id }
// An owner / general manager / front office manager (or platform
// admin) triggers a password reset for one of their staff members.
// Generates a Supabase recovery link and emails a branded reset
// link via the platform Resend account. Never sets/exposes passwords.
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders, json } from '../_shared/cors.ts';
import { passwordResetEmail, sendPlatformEmail } from '../_shared/email.ts';

const MANAGER_ROLES = ['owner', 'general_manager', 'front_office_manager'];

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Not authenticated' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const asUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await asUser.auth.getUser();
    if (authError || !user) return json({ error: 'Invalid authentication' }, 401);

    const body = await req.json().catch(() => ({}));
    const staffId = (body.staff_id ?? '').trim();
    if (!staffId) return json({ error: 'staff_id is required' }, 400);

    // Look up the target staff member
    const { data: target } = await admin
      .from('staff_members')
      .select('id, property_id, name, email, is_active')
      .eq('id', staffId)
      .maybeSingle();
    if (!target) return json({ error: 'Staff member not found' }, 404);

    // Authorize: caller must manage the target's property (or be platform admin)
    if (!(await canManage(admin, user, target.property_id as string))) {
      return json({ error: 'You are not authorized to reset this user\'s password.' }, 403);
    }

    const appUrl = (Deno.env.get('APP_URL') ?? '').trim().replace(/\/$/, '');
    const email = (target.email as string).toLowerCase();

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${appUrl}/reset-password` },
    });

    if (linkError || !linkData?.properties?.action_link) {
      return json({ error: linkError?.message || 'Could not generate reset link' }, 400);
    }

    const propertyName = await getPropertyName(admin, target.property_id as string);

    try {
      const { subject, html } = passwordResetEmail({
        name: target.name as string,
        resetUrl: linkData.properties.action_link,
        byManager: true,
        propertyName,
      });
      await sendPlatformEmail({ to: email, subject, html });
      return json({ success: true, email_sent: true, email });
    } catch (err) {
      return json({ success: true, email_sent: false, email, email_error: err instanceof Error ? err.message : 'Email failed' });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return json({ error: message }, 500);
  }
});

async function canManage(
  admin: ReturnType<typeof createClient>,
  user: { id: string; email?: string },
  propertyId: string,
): Promise<boolean> {
  const { data: pa } = await admin
    .from('platform_admins')
    .select('email')
    .eq('email', (user.email ?? '').toLowerCase())
    .maybeSingle();
  if (pa) return true;

  const { data: staff } = await admin
    .from('staff_members')
    .select('role, is_active')
    .eq('id', user.id)
    .eq('property_id', propertyId)
    .maybeSingle();

  return !!staff && staff.is_active === true && MANAGER_ROLES.includes(staff.role as string);
}

async function getPropertyName(admin: ReturnType<typeof createClient>, propertyId: string): Promise<string> {
  const { data } = await admin.from('properties').select('name').eq('id', propertyId).maybeSingle();
  return (data?.name as string) ?? 'your hotel';
}
