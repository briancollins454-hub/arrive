// supabase/functions/create-subscription-checkout/index.ts
// ============================================================
// Edge Function — Start a hotel subscription via Stripe Checkout
// ============================================================
// Body: { property_id, plan_code, ai_addon? }
// Caller must be the platform admin OR an owner of the property.
// Creates/reuses a Stripe customer for the property and returns a
// hosted Checkout Session URL for the chosen plan (+ optional AI add-on).
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
    const planCode = (body.plan_code ?? '').trim();
    const aiAddon = body.ai_addon === true;
    if (!propertyId || !planCode) return json({ error: 'property_id and plan_code are required' }, 400);

    if (!(await canBill(admin, user, propertyId))) {
      return json({ error: 'You are not authorized to manage billing for this property.' }, 403);
    }

    // Resolve plan + add-on prices
    const { data: plan } = await admin
      .from('subscription_plans')
      .select('code, name, stripe_price_id, is_addon')
      .eq('code', planCode)
      .maybeSingle();
    if (!plan || plan.is_addon) return json({ error: 'Unknown plan' }, 400);
    if (!plan.stripe_price_id) return json({ error: `Plan "${planCode}" has no Stripe price configured yet.` }, 400);

    let addonPriceId: string | null = null;
    if (aiAddon) {
      const { data: addon } = await admin
        .from('subscription_plans')
        .select('stripe_price_id')
        .eq('code', 'ai_addon')
        .maybeSingle();
      if (!addon?.stripe_price_id) return json({ error: 'AI add-on has no Stripe price configured yet.' }, 400);
      addonPriceId = addon.stripe_price_id;
    }

    const { data: property } = await admin
      .from('properties')
      .select('id, name, contact')
      .eq('id', propertyId)
      .maybeSingle();
    if (!property) return json({ error: 'Property not found' }, 404);

    const stripe = getStripe();

    // Reuse an existing customer if we have one
    const { data: sub } = await admin
      .from('hotel_subscriptions')
      .select('id, stripe_customer_id')
      .eq('property_id', propertyId)
      .maybeSingle();

    let customerId = sub?.stripe_customer_id ?? null;
    if (!customerId) {
      const contactEmail = (property.contact as Record<string, string> | null)?.email || user.email || undefined;
      const customer = await stripe.customers.create({
        name: property.name as string,
        email: contactEmail,
        metadata: { property_id: propertyId },
      });
      customerId = customer.id;
      await admin
        .from('hotel_subscriptions')
        .upsert({ property_id: propertyId, stripe_customer_id: customerId, plan_code: planCode, ai_addon: aiAddon, updated_at: new Date().toISOString() }, { onConflict: 'property_id' });
    }

    const lineItems: { price: string; quantity: number }[] = [{ price: plan.stripe_price_id, quantity: 1 }];
    if (addonPriceId) lineItems.push({ price: addonPriceId, quantity: 1 });

    const base = appUrl();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: lineItems,
      client_reference_id: propertyId,
      subscription_data: { metadata: { property_id: propertyId, plan_code: planCode } },
      success_url: `${base}/dashboard/billing?checkout=success`,
      cancel_url: `${base}/dashboard/billing?checkout=cancelled`,
      allow_promotion_codes: true,
    });

    return json({ success: true, url: session.url });
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
