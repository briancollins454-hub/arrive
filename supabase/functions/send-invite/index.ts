// supabase/functions/send-invite/index.ts
// ============================================================
// Edge Function — Invite a staff member (owner / manager)
// ============================================================
// Two modes:
//   - New invite:  { property_id, name, email, role }
//   - Resend:      { invite_id }  (regenerates token + expiry)
// Verifies the caller manages the property, creates/updates the
// staff_invite, and emails a branded invite link via platform Resend.
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders, json } from '../_shared/cors.ts';
import { sendPlatformEmail, staffInviteEmail } from '../_shared/email.ts';

const MANAGER_ROLES = ['owner', 'general_manager', 'front_office_manager'];

interface NewInviteRequest {
  property_id: string;
  name: string;
  email: string;
  role: string;
}
interface ResendRequest {
  invite_id: string;
}

function roleLabel(role: string): string {
  return role.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function newToken(): string {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
}

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

    const body = await req.json();
    const appUrl = (Deno.env.get('APP_URL') ?? '').trim().replace(/\/$/, '');

    // ---- Resend mode ----
    if (body.invite_id) {
      const { invite_id } = body as ResendRequest;
      const { data: invite } = await admin
        .from('staff_invites')
        .select('id, property_id, name, email, role')
        .eq('id', invite_id)
        .maybeSingle();
      if (!invite) return json({ error: 'Invite not found' }, 404);

      if (!(await canManage(admin, user, invite.property_id))) {
        return json({ error: 'You are not authorized to manage this property.' }, 403);
      }

      const token = newToken();
      const { error: updErr } = await admin
        .from('staff_invites')
        .update({ token, status: 'pending', expires_at: expiry() })
        .eq('id', invite_id);
      if (updErr) return json({ error: updErr.message }, 400);

      const propertyName = await getPropertyName(admin, invite.property_id);
      const inviteUrl = `${appUrl}/invite/${token}`;
      const sent = await trySend(invite.email, invite.name, propertyName, invite.role, inviteUrl);
      return json({ success: true, invite_url: inviteUrl, email_sent: sent.ok, email_error: sent.error });
    }

    // ---- New invite mode ----
    const { property_id, name, email, role } = body as NewInviteRequest;
    if (!property_id || !name?.trim() || !email?.trim() || !role) {
      return json({ error: 'property_id, name, email and role are required' }, 400);
    }

    if (!(await canManage(admin, user, property_id))) {
      return json({ error: 'You are not authorized to invite staff for this property.' }, 403);
    }

    const token = newToken();
    const { data: invite, error: insErr } = await admin
      .from('staff_invites')
      .insert({
        property_id,
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role,
        token,
        status: 'pending',
        invited_by: user.id,
        expires_at: expiry(),
      })
      .select('id')
      .single();

    if (insErr || !invite) return json({ error: insErr?.message || 'Failed to create invite' }, 400);

    const propertyName = await getPropertyName(admin, property_id);
    const inviteUrl = `${appUrl}/invite/${token}`;
    const sent = await trySend(email.trim(), name.trim(), propertyName, role, inviteUrl);

    return json({ success: true, invite_id: invite.id, invite_url: inviteUrl, email_sent: sent.ok, email_error: sent.error });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return json({ error: message }, 500);
  }
});

function expiry(): string {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

async function canManage(
  admin: ReturnType<typeof createClient>,
  user: { id: string; email?: string },
  propertyId: string,
): Promise<boolean> {
  // Platform admins can manage any property
  const { data: pa } = await admin
    .from('platform_admins')
    .select('email')
    .eq('email', (user.email ?? '').toLowerCase())
    .maybeSingle();
  if (pa) return true;

  // Otherwise the caller must be an active manager of this property
  const { data: staff } = await admin
    .from('staff_members')
    .select('role, is_active')
    .eq('id', user.id)
    .eq('property_id', propertyId)
    .maybeSingle();

  return !!staff && staff.is_active === true && MANAGER_ROLES.includes(staff.role);
}

async function getPropertyName(admin: ReturnType<typeof createClient>, propertyId: string): Promise<string> {
  const { data } = await admin.from('properties').select('name').eq('id', propertyId).maybeSingle();
  return data?.name ?? 'your hotel';
}

async function trySend(
  email: string,
  name: string,
  propertyName: string,
  role: string,
  inviteUrl: string,
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const { subject, html } = staffInviteEmail({ name, propertyName, roleLabel: roleLabel(role), inviteUrl });
    await sendPlatformEmail({ to: email, subject, html });
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Email failed' };
  }
}
