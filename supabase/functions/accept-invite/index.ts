// supabase/functions/accept-invite/index.ts
// ============================================================
// Edge Function — Accept an invite (public, token-gated)
// ============================================================
// Validates the invite token, creates a CONFIRMED auth user with
// the chosen password, then links staff_members + staff_properties
// via accept_invite(). Returns the email so the client can sign in.
//
// Creating the user with email_confirm:true guarantees the invited
// person can log in immediately — possession of the emailed token is
// proof of email ownership.
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders, json } from '../_shared/cors.ts';

interface AcceptRequest {
  token: string;
  password: string;
  name?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { token, password, name } = (await req.json()) as AcceptRequest;

    if (!token) return json({ error: 'Missing invite token' }, 400);
    if (!password || password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 1. Validate the invite
    const { data: invite, error: inviteError } = await admin
      .from('staff_invites')
      .select('id, email, name, role, status, expires_at, property_id')
      .eq('token', token)
      .maybeSingle();

    if (inviteError) return json({ error: inviteError.message }, 500);
    if (!invite) return json({ error: 'This invite link is invalid.' }, 404);
    if (invite.status !== 'pending') return json({ error: 'This invite has already been used or revoked.', code: 'used' }, 409);
    if (new Date(invite.expires_at) < new Date()) return json({ error: 'This invite has expired. Ask for a new one.', code: 'expired' }, 410);

    const email = invite.email.toLowerCase();
    const displayName = (name?.trim() || invite.name);

    // 2. Create the confirmed auth user
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: displayName },
    });

    let userId = created?.user?.id;

    if (createError) {
      // User already exists — they should sign in instead.
      const msg = createError.message?.toLowerCase() ?? '';
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        return json({
          error: 'An account with this email already exists. Please sign in instead.',
          code: 'user_exists',
          email,
        }, 409);
      }
      return json({ error: createError.message }, 400);
    }

    if (!userId) return json({ error: 'Failed to create account' }, 500);

    // 3. Link staff_members + staff_properties and mark invite accepted
    const { data: result, error: rpcError } = await admin.rpc('accept_invite', {
      invite_token: token,
      new_user_id: userId,
    });

    if (rpcError) {
      return json({ error: `Account created but linking failed: ${rpcError.message}`, email }, 500);
    }
    if (result && result.success === false) {
      return json({ error: result.error || 'Failed to accept invite', email }, 400);
    }

    return json({ success: true, email, property_id: invite.property_id, role: invite.role });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return json({ error: message }, 500);
  }
});
