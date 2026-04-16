import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isDemoMode } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import type { AIConversation, AIMessage } from '@/types';
import toast from 'react-hot-toast';

// ============================================================
// DEMO DATA
// ============================================================

const DEMO_CONVERSATIONS: AIConversation[] = [
  {
    id: 'demo-conv-1',
    property_id: 'demo',
    user_id: 'demo',
    title: 'Occupancy analysis',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

const DEMO_MESSAGES: AIMessage[] = [
  {
    id: 'demo-msg-1',
    conversation_id: 'demo-conv-1',
    role: 'user',
    content: 'What is our current occupancy rate and how does it compare to last week?',
    tokens_used: 0,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'demo-msg-2',
    conversation_id: 'demo-conv-1',
    role: 'assistant',
    content: 'Based on your current property data:\n\n**Current Occupancy: 72%** (7 of 10 rooms occupied)\n\nHere\'s the breakdown:\n- 🟢 Available: 2 rooms (Standard Twin #104, Deluxe Sea View #203)\n- 🔵 Occupied: 7 rooms\n- 🔧 Maintenance: 1 room (Suite #301 — plumbing repair)\n\n**Compared to last week**, occupancy is up 12% — you had 6 rooms occupied this time last week. The increase is driven by 3 new direct bookings and a group booking for the Henderson wedding party.\n\n**Today\'s key actions:**\n- 2 arrivals expected (Mrs. Chen at 14:00, Mr. & Mrs. Patel at 15:30)\n- 1 departure: Room 102 checking out by 11:00\n- 1 pending housekeeping request for Room 205\n\nWould you like me to dig into revenue figures or suggest strategies to fill the remaining rooms?',
    tokens_used: 342,
    created_at: new Date(Date.now() - 3590000).toISOString(),
  },
];

// ============================================================
// System prompt builder — feeds ALL property data to Claude
// ============================================================

function buildSystemPrompt(propertyContext: Record<string, unknown> | null, propertyName: string): string {
  const contextJson = propertyContext ? JSON.stringify(propertyContext, null, 0) : 'No property data loaded.';

  return `You are Arrivé AI, an expert hotel management assistant. You have full access to all data for "${propertyName}".

Your capabilities:
- Analyse occupancy, revenue, ADR, RevPAR, and booking trends
- Review guest profiles, preferences, and stay history
- Monitor housekeeping status, maintenance work orders, and room availability
- Track arrivals, departures, in-house guests, and no-shows
- Review rate periods, packages, and pricing strategy
- Analyse guest requests, concierge tasks, and service quality
- Review group bookings, waitlist, and lost & found items
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

// ============================================================
// Hook
// ============================================================

export function useAIAssistant() {
  const queryClient = useQueryClient();
  const property = useAppStore((s) => s.property);
  const user = useAppStore((s) => s.user);
  const propertyId = property?.id;
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ---- Conversations list ----
  const { data: conversations = [] } = useQuery({
    queryKey: ['ai-conversations', propertyId],
    queryFn: async () => {
      if (isDemoMode) return DEMO_CONVERSATIONS;

      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('property_id', propertyId!)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as AIConversation[];
    },
    enabled: !!propertyId || isDemoMode,
  });

  // ---- Messages for active conversation ----
  const { data: messages = [] } = useQuery({
    queryKey: ['ai-messages', activeConversationId],
    queryFn: async () => {
      if (isDemoMode) {
        return DEMO_MESSAGES.filter((m) => m.conversation_id === activeConversationId);
      }

      const { data, error } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', activeConversationId!)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as AIMessage[];
    },
    enabled: !!activeConversationId,
  });

  // ---- Load property context via RPC ----
  const { data: propertyContext } = useQuery({
    queryKey: ['ai-context', propertyId],
    queryFn: async () => {
      if (isDemoMode || !propertyId) return null;

      const { data, error } = await supabase.rpc('get_ai_property_context', {
        p_property_id: propertyId,
      });

      if (error) {
        console.warn('Failed to load AI context:', error.message);
        return null;
      }
      return data as Record<string, unknown>;
    },
    enabled: !!propertyId && !isDemoMode,
    staleTime: 1000 * 60 * 2, // refresh every 2 min
  });

  // ---- Create conversation ----
  const createConversation = useMutation({
    mutationFn: async () => {
      if (isDemoMode) {
        const conv: AIConversation = {
          id: `demo-conv-${Date.now()}`,
          property_id: propertyId ?? 'demo',
          user_id: 'demo',
          title: 'New conversation',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return conv;
      }

      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({ property_id: propertyId!, user_id: user!.id })
        .select()
        .single();

      if (error) throw error;
      return data as AIConversation;
    },
    onSuccess: (conv) => {
      if (isDemoMode) {
        queryClient.setQueryData(['ai-conversations', propertyId], (old: AIConversation[] | undefined) =>
          [conv, ...(old ?? [])]
        );
      } else {
        queryClient.invalidateQueries({ queryKey: ['ai-conversations', propertyId] });
      }
      setActiveConversationId(conv.id);
    },
  });

  // ---- Delete conversation ----
  const deleteConversation = useMutation({
    mutationFn: async (convId: string) => {
      if (isDemoMode) return convId;

      const { error } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('id', convId);

      if (error) throw error;
      return convId;
    },
    onSuccess: (convId) => {
      if (isDemoMode) {
        queryClient.setQueryData(['ai-conversations', propertyId], (old: AIConversation[] | undefined) =>
          (old ?? []).filter((c) => c.id !== convId)
        );
        queryClient.removeQueries({ queryKey: ['ai-messages', convId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['ai-conversations', propertyId] });
      }
      if (activeConversationId === convId) setActiveConversationId(null);
      toast.success('Conversation deleted');
    },
  });

  // ---- Send message (calls Claude API) ----
  const sendMessage = useCallback(async (content: string, apiKey: string) => {
    if (!activeConversationId) return;

    const userMsg: AIMessage = {
      id: isDemoMode ? `demo-msg-${Date.now()}` : crypto.randomUUID(),
      conversation_id: activeConversationId,
      role: 'user',
      content,
      tokens_used: 0,
      created_at: new Date().toISOString(),
    };

    // Optimistic: append user message
    queryClient.setQueryData(['ai-messages', activeConversationId], (old: AIMessage[] | undefined) =>
      [...(old ?? []), userMsg]
    );

    // Save user message to DB
    if (!isDemoMode) {
      await supabase.from('ai_messages').insert({
        conversation_id: activeConversationId,
        role: 'user',
        content,
      });
    }

    // Build messages array for Claude
    const currentMessages = queryClient.getQueryData<AIMessage[]>(['ai-messages', activeConversationId]) ?? [];
    const claudeMessages = currentMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })).filter((m) => m.role !== 'system' as string);

    setIsStreaming(true);
    abortRef.current = new AbortController();

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          system: buildSystemPrompt(propertyContext ?? null, property?.name ?? 'Unknown Property'),
          messages: claudeMessages,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message ?? `API error: ${response.status}`);
      }

      const data = await response.json();
      const assistantContent = data.content?.[0]?.text ?? 'No response received.';
      const tokensUsed = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);

      const assistantMsg: AIMessage = {
        id: isDemoMode ? `demo-msg-${Date.now()}-resp` : crypto.randomUUID(),
        conversation_id: activeConversationId,
        role: 'assistant',
        content: assistantContent,
        tokens_used: tokensUsed,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData(['ai-messages', activeConversationId], (old: AIMessage[] | undefined) =>
        [...(old ?? []), assistantMsg]
      );

      // Persist assistant message
      if (!isDemoMode) {
        await supabase.from('ai_messages').insert({
          conversation_id: activeConversationId,
          role: 'assistant',
          content: assistantContent,
          tokens_used: tokensUsed,
        });

        // Update conversation title from first exchange
        if (currentMessages.filter((m) => m.role === 'user').length <= 1) {
          const title = content.length > 60 ? content.slice(0, 57) + '...' : content;
          await supabase
            .from('ai_conversations')
            .update({ title, updated_at: new Date().toISOString() })
            .eq('id', activeConversationId);
          queryClient.invalidateQueries({ queryKey: ['ai-conversations', propertyId] });
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Failed to get AI response';
      toast.error(message);

      // Remove optimistic user message on error
      queryClient.setQueryData(['ai-messages', activeConversationId], (old: AIMessage[] | undefined) =>
        (old ?? []).filter((m) => m.id !== userMsg.id)
      );
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [activeConversationId, propertyContext, property?.name, propertyId, queryClient]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return {
    conversations,
    messages,
    activeConversationId,
    setActiveConversationId,
    createConversation,
    deleteConversation,
    sendMessage,
    isStreaming,
    stopStreaming,
    propertyContext,
  };
}
