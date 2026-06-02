// supabase/functions/billing-portal/index.ts
// ============================================================
// Edge Function — Stripe Customer Portal link
// ============================================================
// Body: { property_id }
// Returns a Stripe Billing Portal URL so an owner (or platform admin)
// can update their card, view invoices, or cancel the subscription.
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders, json } from '../_shared/cors.ts';
import { getStripe, appUrl } from '../_shared/stripe.ts';

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
    const propertyId = (body.property_id ?? '').trim();
    if (!propertyId) return json({ error: 'property_id is required' }, 400);

    if (!(await canBill(admin, user, propertyId))) {
      return json({ error: 'You are not authorized to manage billing for this property.' }, 403);
    }

    const { data: sub } = await admin
      .from('hotel_subscriptions')
      .select('stripe_customer_id')
      .eq('property_id', propertyId)
      .maybeSingle();

    if (!sub?.stripe_customer_id) {
      return json({ error: 'No billing account yet. Start a subscription first.' }, 400);
    }

    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${appUrl()}/dashboard/billing`,
    });

    return json({ success: true, url: portal.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return json({ error: message }, 500);
  }
});

async function canBill(
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
  return !!staff && staff.is_active === true && staff.role === 'owner';
}
