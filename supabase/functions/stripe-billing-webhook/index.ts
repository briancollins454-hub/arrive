// supabase/functions/stripe-billing-webhook/index.ts
// ============================================================
// Edge Function — Stripe billing webhook (no JWT; signature-verified)
// ============================================================
// Keeps hotel_subscriptions in sync with the platform Stripe account.
// Configure STRIPE_WEBHOOK_SECRET to the signing secret of the
// endpoint you create in the Stripe dashboard.
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { getStripe } from '../_shared/stripe.ts';

function mapStatus(s: string): string {
  switch (s) {
    case 'trialing': return 'trialing';
    case 'active': return 'active';
    case 'past_due': return 'past_due';
    case 'unpaid': return 'past_due';
    case 'canceled': return 'canceled';
    case 'incomplete': return 'incomplete';
    case 'incomplete_expired': return 'incomplete';
    default: return 'incomplete';
  }
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const sig = req.headers.get('stripe-signature');
  const secret = (Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '').trim();
  if (!sig || !secret) return new Response('Missing signature/secret', { status: 400 });

  const stripe = getStripe();
  const payload = await req.text();

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, sig, secret);
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${err instanceof Error ? err.message : err}`, { status: 400 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

  // Resolve plan codes from price ids
  async function planFromItems(items: { price?: { id?: string } }[]): Promise<{ plan_code: string | null; ai_addon: boolean }> {
    const priceIds = items.map((i) => i.price?.id).filter(Boolean) as string[];
    if (priceIds.length === 0) return { plan_code: null, ai_addon: false };
    const { data: plans } = await admin.from('subscription_plans').select('code, stripe_price_id, is_addon').in('stripe_price_id', priceIds);
    let planCode: string | null = null;
    let ai = false;
    for (const p of plans ?? []) {
      if (p.is_addon) ai = true; else planCode = p.code;
    }
    return { plan_code: planCode, ai_addon: ai };
  }

  async function syncSubscription(subscriptionId: string, propertyHint?: string) {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const propertyId = (sub.metadata?.property_id as string) || propertyHint || null;
    const { plan_code, ai_addon } = await planFromItems((sub.items?.data ?? []) as { price?: { id?: string } }[]);
    const status = mapStatus(sub.status);
    const update: Record<string, unknown> = {
      status,
      stripe_subscription_id: sub.id,
      stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
      current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
      cancel_at_period_end: !!sub.cancel_at_period_end,
      ai_addon,
      updated_at: new Date().toISOString(),
    };
    if (plan_code) update.plan_code = plan_code;
    if (status !== 'past_due') update.grace_until = null;

    if (propertyId) {
      await admin.from('hotel_subscriptions').upsert({ property_id: propertyId, ...update }, { onConflict: 'property_id' });
    } else {
      await admin.from('hotel_subscriptions').update(update).eq('stripe_customer_id', update.stripe_customer_id);
    }
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as { subscription?: string; client_reference_id?: string };
        if (session.subscription) await syncSubscription(session.subscription, session.client_reference_id ?? undefined);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as { id: string };
        await syncSubscription(sub.id);
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as { customer?: string };
        if (inv.customer) {
          await admin
            .from('hotel_subscriptions')
            .update({ status: 'past_due', grace_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date().toISOString() })
            .eq('stripe_customer_id', inv.customer);
        }
        break;
      }
      case 'invoice.paid': {
        const inv = event.data.object as { customer?: string };
        if (inv.customer) {
          await admin
            .from('hotel_subscriptions')
            .update({ status: 'active', grace_until: null, updated_at: new Date().toISOString() })
            .eq('stripe_customer_id', inv.customer);
        }
        break;
      }
    }

    // Audit (deduped by unique stripe_event_id)
    const propGuess = (event.data.object as { metadata?: { property_id?: string } }).metadata?.property_id ?? null;
    await admin.from('billing_events').insert({
      stripe_event_id: event.id,
      type: event.type,
      property_id: propGuess,
      payload: event.data.object as unknown,
    });
  } catch (err) {
    console.error('[stripe-billing-webhook] handler error:', err instanceof Error ? err.message : err);
    return new Response('handler error', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
