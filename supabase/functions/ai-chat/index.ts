// supabase/functions/ai-chat/index.ts
// ============================================================
// Supabase Edge Function — Arrivé AI chat
// ============================================================
// Called from the dashboard via supabase.functions.invoke('ai-chat').
//
// The Anthropic API key is read server-side from the locked-down
// property_secrets table (service role) and NEVER sent to the browser.
// The function authenticates the caller, confirms they are staff of the
// conversation's property, builds the property context, calls Claude, and
// persists both the user and assistant messages.
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

function buildSystemPrompt(context: unknown, propertyName: string): string {
  const contextJson = context ? JSON.stringify(context) : 'No property data loaded.';
  return `You are Arrivé AI, an expert hotel management assistant. You have full access to all data for "${propertyName}".

Your capabilities:
- Analyse occupancy, revenue, ADR, RevPAR, and booking trends
- Review guest profiles, preferences, and stay history
- Monitor housekeeping status, maintenance work orders, and room availability
- Track arrivals, departures, in-house guests, and no-shows
- Review rate periods, packages, and pricing strategy
- Analyse guest requests, concierge tasks, and service quality
- Provide actionable recommendations for revenue optimisation
- Draft guest communications and operational summaries
- Answer any question about the property's operations

Rules:
- Always base your answers on the ACTUAL data provided below. Never invent data.
- Use UK English spelling (analyse, colour, optimise, etc.)
- Format monetary values with £ symbol
- When showing stats, use clear headers and bullet points
- If data is missing for a query, say so honestly rather than guessing
- Be concise but thorough. Hotel managers are busy.
- Proactively suggest actions when you spot issues (e.g. dirty rooms before arrivals, overdue checkouts)

CURRENT PROPERTY DATA (live snapshot):
${contextJson}`;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { conversation_id, content } = await req.json();
    if (!conversation_id || !content || typeof content !== 'string') {
      return json({ error: 'conversation_id and content are required' }, 400);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Not authenticated' }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) return json({ error: 'Invalid authentication' }, 401);

    // Resolve the conversation's property
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('ai_conversations')
      .select('id, property_id')
      .eq('id', conversation_id)
      .maybeSingle();

    if (convError || !conversation) return json({ error: 'Conversation not found' }, 404);
    const propertyId = conversation.property_id;

    // Confirm the caller is staff of this property
    const [{ data: staffRecord }, { data: staffPropertyRecord }] = await Promise.all([
      supabaseAdmin.from('staff_members').select('id')
        .eq('property_id', propertyId).eq('id', user.id).eq('is_active', true).maybeSingle(),
      supabaseAdmin.from('staff_properties').select('id')
        .eq('property_id', propertyId).eq('staff_id', user.id).maybeSingle(),
    ]);
    if (!staffRecord && !staffPropertyRecord) {
      return json({ error: 'Not authorised for this property' }, 403);
    }

    // Read the Claude API key (service role — bypasses RLS)
    const { data: secretRow } = await supabaseAdmin
      .from('property_secrets')
      .select('secret_value')
      .eq('property_id', propertyId)
      .eq('secret_key', 'claude_api_key')
      .maybeSingle();

    const apiKey = (secretRow?.secret_value ?? '').trim();
    if (!apiKey) {
      return json({ error: 'No Claude API key is configured for this property. Add one in the AI Assistant settings.' }, 400);
    }

    // Property name + context
    const { data: property } = await supabaseAdmin
      .from('properties').select('name').eq('id', propertyId).maybeSingle();

    const { data: context } = await supabaseAdmin
      .rpc('get_ai_property_context', { p_property_id: propertyId });

    // Persist the user's message
    await supabaseAdmin.from('ai_messages').insert({
      conversation_id, role: 'user', content,
    });

    // Build the full message history for Claude
    const { data: history } = await supabaseAdmin
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true });

    const claudeMessages = (history ?? [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    // Call Anthropic
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: buildSystemPrompt(context ?? null, property?.name ?? 'Unknown Property'),
        messages: claudeMessages,
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.json().catch(() => ({}));
      return json({ error: err?.error?.message ?? `AI provider error: ${anthropicRes.status}` }, 502);
    }

    const aiData = await anthropicRes.json();
    const assistantContent = aiData.content?.[0]?.text ?? 'No response received.';
    const tokensUsed = (aiData.usage?.input_tokens ?? 0) + (aiData.usage?.output_tokens ?? 0);

    // Persist the assistant message
    await supabaseAdmin.from('ai_messages').insert({
      conversation_id, role: 'assistant', content: assistantContent, tokens_used: tokensUsed,
    });

    // Set the conversation title from the first user message
    const userMessageCount = (history ?? []).filter((m) => m.role === 'user').length;
    if (userMessageCount <= 1) {
      const title = content.length > 60 ? content.slice(0, 57) + '...' : content;
      await supabaseAdmin.from('ai_conversations')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', conversation_id);
    }

    return json({ content: assistantContent, tokens_used: tokensUsed });
  } catch (err) {
    console.error('ai-chat error:', err);
    return json({ error: err instanceof Error ? err.message : 'Internal server error' }, 500);
  }
});
