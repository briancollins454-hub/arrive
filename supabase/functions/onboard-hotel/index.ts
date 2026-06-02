// supabase/functions/onboard-hotel/index.ts
// ============================================================
// Edge Function — Onboard a new hotel (platform admin only)
// ============================================================
// 1. Verifies the caller is a platform admin.
// 2. Creates the property (service role — bypasses RLS).
// 3. Creates an owner staff_invite.
// 4. Emails the owner a branded setup link (platform Resend).
// Returns the invite link as a fallback if email fails.
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders, json } from '../_shared/cors.ts';
import { ownerSetupEmail, sendPlatformEmail } from '../_shared/email.ts';

interface OnboardRequest {
  name: string;
  slug: string;
  description?: string;
  address?: Record<string, string>;
  contact?: Record<string, string>;
  owner: { name: string; email: string };
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

    // Identify the caller
    const { data: { user }, error: authError } = await asUser.auth.getUser();
    if (authError || !user) return json({ error: 'Invalid authentication' }, 401);

    // Authorize: must be a platform admin
    if (!(await isPlatformAdmin(admin, user.email))) {
      return json({ error: 'Only the platform administrator can onboard hotels.' }, 403);
    }

    const body = (await req.json()) as OnboardRequest;
    const name = body.name?.trim();
    const slug = body.slug?.trim().toLowerCase();
    const owner = body.owner;

    if (!name) return json({ error: 'Hotel name is required' }, 400);
    if (!slug) return json({ error: 'URL slug is required' }, 400);
    if (!/^[a-z0-9-]+$/.test(slug)) return json({ error: 'Slug may only contain lowercase letters, numbers and hyphens' }, 400);
    if (!owner?.name?.trim() || !owner?.email?.trim()) return json({ error: 'Owner name and email are required' }, 400);

    // Ensure slug is unique
    const { data: existing } = await admin.from('properties').select('id').eq('slug', slug).maybeSingle();
    if (existing) return json({ error: `The slug "${slug}" is already taken. Choose another.` }, 409);

    // 1. Create the property
    const { data: property, error: propError } = await admin
      .from('properties')
      .insert({
        name,
        slug,
        description: body.description?.trim() || null,
        address: body.address ?? {},
        contact: body.contact ?? {},
      })
      .select('id, name, slug')
      .single();

    if (propError || !property) {
      return json({ error: propError?.message || 'Failed to create property' }, 400);
    }

    // 2. Create the owner invite
    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: inviteError } = await admin.from('staff_invites').insert({
      property_id: property.id,
      email: owner.email.trim().toLowerCase(),
      name: owner.name.trim(),
      role: 'owner',
      token,
      status: 'pending',
      invited_by: user.id,
      expires_at: expiresAt,
    });

    if (inviteError) {
      return json({ error: `Property created but invite failed: ${inviteError.message}`, property_id: property.id }, 400);
    }

    const appUrl = (Deno.env.get('APP_URL') ?? '').trim().replace(/\/$/, '');
    const inviteUrl = `${appUrl}/invite/${token}`;

    // 3. Email the owner
    let emailSent = false;
    let emailError: string | null = null;
    try {
      const { subject, html } = ownerSetupEmail({ ownerName: owner.name.trim(), propertyName: name, inviteUrl });
      await sendPlatformEmail({ to: owner.email.trim(), subject, html });
      emailSent = true;
    } catch (err) {
      emailError = err instanceof Error ? err.message : 'Email failed';
    }

    return json({
      success: true,
      property_id: property.id,
      property_name: property.name,
      slug: property.slug,
      invite_url: inviteUrl,
      email_sent: emailSent,
      email_error: emailError,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return json({ error: message }, 500);
  }
});

async function isPlatformAdmin(
  admin: ReturnType<typeof createClient>,
  email: string | undefined,
): Promise<boolean> {
  if (!email) return false;
  const lower = email.toLowerCase();

  // 1. Env allowlist (comma-separated)
  const envList = (Deno.env.get('PLATFORM_ADMIN_EMAILS') ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (envList.includes(lower)) return true;

  // 2. platform_admins table (seeded by migration 013)
  const { data } = await admin.from('platform_admins').select('email').eq('email', lower).maybeSingle();
  return !!data;
}
