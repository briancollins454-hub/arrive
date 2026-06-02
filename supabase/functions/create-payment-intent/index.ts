// supabase/functions/create-payment-intent/index.ts
// ============================================================
// Supabase Edge Function — Create Stripe PaymentIntent
// ============================================================
// Called from the frontend via supabase.functions.invoke().
// Reads the hotel's Stripe secret key from the locked-down property_secrets
// table (service role only) and creates a PaymentIntent via the Stripe API.
// The secret key is NEVER stored on the publicly-readable properties row.
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { amount, currency, property_id, booking_id, description } = await req.json();

    if (!amount || !property_id) {
      return new Response(
        JSON.stringify({ error: 'amount and property_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a Supabase client with the service role key to read
    // the property's Stripe secret key (bypasses RLS).
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify JWT and get user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user belongs to this property (staff_members OR staff_properties)
    const [{ data: staffRecord }, { data: staffPropertyRecord }] = await Promise.all([
      supabaseAdmin
        .from('staff_members')
        .select('id')
        .eq('property_id', property_id)
        .eq('id', user.id)
        .eq('is_active', true)
        .maybeSingle(),
      supabaseAdmin
        .from('staff_properties')
        .select('id')
        .eq('property_id', property_id)
        .eq('staff_id', user.id)
        .maybeSingle(),
    ]);

    if (!staffRecord && !staffPropertyRecord) {
      return new Response(
        JSON.stringify({ error: 'Not authorised for this property' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the property's Stripe secret key from the locked-down secrets table.
    const { data: secretRow, error: secretError } = await supabaseAdmin
      .from('property_secrets')
      .select('secret_value')
      .eq('property_id', property_id)
      .eq('secret_key', 'stripe_secret_key')
      .maybeSingle();

    const stripeSecretKey = (secretRow?.secret_value ?? '').trim();

    if (secretError || !stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe is not configured for this property. Add your Stripe keys in Settings → Payments.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enforce minimum amount (Stripe requires >= 30 for GBP, 50 for USD)
    const minAmount = (currency || 'gbp') === 'gbp' ? 30 : 50;
    if (amount < minAmount) {
      return new Response(
        JSON.stringify({ error: `Amount too small. Minimum is ${minAmount} ${(currency || 'gbp').toUpperCase()} minor units (£${(minAmount / 100).toFixed(2)}).` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create PaymentIntent via Stripe API (direct HTTP — no SDK needed in Deno)
    // Use explicit card payment method type to avoid needing Klarna/Apple Pay activation
    const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: String(amount),
        currency: currency || 'gbp',
        description: description || `Payment for booking ${booking_id}`,
        'metadata[booking_id]': booking_id || '',
        'metadata[property_id]': property_id,
        'payment_method_types[]': 'card',
      }).toString(),
    });

    const stripeData = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error('Stripe error:', stripeData);
      return new Response(
        JSON.stringify({ error: stripeData.error?.message || 'Failed to create payment intent' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        clientSecret: stripeData.client_secret,
        paymentIntentId: stripeData.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
