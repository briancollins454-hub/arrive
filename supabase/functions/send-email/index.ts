// supabase/functions/send-email/index.ts
// ============================================================
// Supabase Edge Function — Send Email via Resend
// ============================================================
// Called from the frontend via supabase.functions.invoke('send-email').
// Reads the property's Resend API key from property_secrets,
// sends the email via Resend, and logs the result in
// guest_communications.
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendEmailRequest {
  property_id: string;
  to: string;
  subject: string;
  html: string;
  from_name?: string;
  kind?: 'pre_arrival' | 'post_stay_review' | 'marketing' | 'self_checkin_link' | 'custom';
  booking_id?: string;
  guest_id?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: SendEmailRequest = await req.json();
    const { property_id, to, subject, html, from_name, kind, booking_id, guest_id } = body;

    if (!property_id || !to || !subject || !html) {
      return json({ error: 'property_id, to, subject, html are required' }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the caller is on staff for this property
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Not authenticated' }, 401);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) return json({ error: 'Invalid authentication' }, 401);

    const { data: access } = await supabaseAdmin
      .from('staff_properties')
      .select('staff_id')
      .eq('property_id', property_id)
      .eq('staff_id', user.id)
      .maybeSingle();
    if (!access) return json({ error: 'Not authorised for this property' }, 403);

    // Get the Resend key from property_secrets (falls back to env var)
    const { data: secret } = await supabaseAdmin
      .from('property_secrets')
      .select('secret_value')
      .eq('property_id', property_id)
      .eq('secret_key', 'resend_api_key')
      .maybeSingle();

    const resendKey = secret?.secret_value || Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      await logComm(supabaseAdmin, {
        property_id, booking_id, guest_id, to, subject, kind, status: 'failed',
        error: 'No Resend API key configured. Add it in Settings → Integrations.',
        created_by: user.id,
      });
      return json({ error: 'No Resend API key configured for this property.' }, 400);
    }

    // Get the property name for the From header
    const { data: property } = await supabaseAdmin
      .from('properties')
      .select('name, contact')
      .eq('id', property_id)
      .single();

    const fromLabel = from_name || property?.name || 'Arrivé';
    // Resend requires either a verified domain or their onboarding@resend.dev
    // We default to onboarding until users set up their own domain.
    const fromAddress = (property?.contact as { email?: string } | null)?.email || 'onboarding@resend.dev';

    // Send via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromLabel} <${fromAddress}>`,
        to: [to],
        subject,
        html,
      }),
    });

    const resendBody = await resendResponse.json();

    if (!resendResponse.ok) {
      await logComm(supabaseAdmin, {
        property_id, booking_id, guest_id, to, subject, kind, status: 'failed',
        error: resendBody?.message || JSON.stringify(resendBody),
        created_by: user.id, body: html,
      });
      return json({ error: resendBody?.message || 'Resend API error', details: resendBody }, 400);
    }

    await logComm(supabaseAdmin, {
      property_id, booking_id, guest_id, to, subject, kind, status: 'sent',
      sent_at: new Date().toISOString(), created_by: user.id, body: html,
    });

    return json({ success: true, id: resendBody?.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return json({ error: message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface LogCommInput {
  property_id: string;
  booking_id?: string;
  guest_id?: string;
  to: string;
  subject: string;
  kind?: string;
  status: 'queued' | 'sent' | 'failed' | 'skipped';
  error?: string;
  sent_at?: string;
  body?: string;
  created_by: string;
}

async function logComm(
  admin: ReturnType<typeof createClient>,
  input: LogCommInput,
) {
  await admin.from('guest_communications').insert({
    property_id: input.property_id,
    booking_id: input.booking_id ?? null,
    guest_id: input.guest_id ?? null,
    kind: input.kind ?? 'custom',
    channel: 'email',
    status: input.status,
    to_email: input.to,
    subject: input.subject,
    body: input.body ?? null,
    error: input.error ?? null,
    sent_at: input.sent_at ?? null,
    created_by: input.created_by,
  });
}
