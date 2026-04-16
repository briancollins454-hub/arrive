import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isDemoMode } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { getDemoRoomTypes, getDemoRooms, getDemoCurrentBookings, getDemoGuests } from './demoData';
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

// ============================================================
// Demo AI Responder — generates intelligent responses from demo data
// No API key needed. Hotels can test the full AI experience.
// ============================================================

function generateDemoResponse(query: string, propertyId: string): string {
  const q = query.toLowerCase();
  const rooms = getDemoRooms(propertyId);
  const roomTypes = getDemoRoomTypes(propertyId);
  const bookings = getDemoCurrentBookings(propertyId);
  const guests = getDemoGuests(propertyId);

  const totalRooms = rooms.length;
  const occupied = rooms.filter((r) => r.status === 'occupied').length;
  const available = rooms.filter((r) => r.status === 'available').length;
  const reserved = rooms.filter((r) => r.status === 'reserved').length;
  const maintenance = rooms.filter((r) => r.status === 'maintenance' || r.status === 'blocked').length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;
  const dirty = rooms.filter((r) => r.housekeeping_status === 'dirty').length;
  const clean = rooms.filter((r) => r.housekeeping_status === 'clean' || r.housekeeping_status === 'inspected').length;

  const arrivals = bookings.filter((b) => b.status === 'confirmed');
  const checkedIn = bookings.filter((b) => b.status === 'checked_in');
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.total_amount ?? 0), 0);
  const avgRate = bookings.length > 0 ? Math.round(totalRevenue / bookings.length) : 0;
  const vipGuests = guests.filter((g) => g.tags?.includes('VIP'));
  const returningGuests = guests.filter((g) => (g.total_stays ?? 0) > 1);

  // Occupancy queries
  if (q.includes('occupancy') || q.includes('how full') || q.includes('how many rooms')) {
    return `## Current Occupancy: ${occupancyRate}%

**${occupied}** of **${totalRooms}** rooms are currently occupied.

| Status | Count |
|--------|-------|
| 🟢 Occupied | ${occupied} |
| 🔵 Reserved | ${reserved} |
| ⚪ Available | ${available} |
| 🔧 Maintenance | ${maintenance} |

**RevPAR today:** £${totalRooms > 0 ? Math.round((occupied * avgRate) / totalRooms) : 0}
**ADR:** £${avgRate}

${occupancyRate < 60 ? '⚠️ Occupancy is below 60% — consider running a flash promotion or adjusting rates to drive last-minute bookings.' : occupancyRate > 85 ? '🎉 Excellent occupancy! Consider upselling upgrades to maximise revenue per room.' : '📊 Healthy occupancy level. Monitor upcoming arrivals to optimise room assignments.'}`;
  }

  // Arrivals & departures
  if (q.includes('arrival') || q.includes('departure') || q.includes('check-in') || q.includes('checkin') || q.includes('check in') || q.includes('check out') || q.includes('checkout')) {
    const arrivalList = arrivals.map((b) => {
      const guest = guests.find((g) => g.id === b.guest_id);
      const rt = roomTypes.find((t) => t.id === b.room_type_id);
      return `- **${guest?.first_name ?? '?'} ${guest?.last_name ?? ''}** — ${rt?.name ?? 'Unknown'} (Room ${rooms.find((r) => r.id === b.room_id)?.room_number ?? 'TBA'}) · ${b.num_guests} guest${b.num_guests > 1 ? 's' : ''} · £${b.total_amount ?? 0}${b.special_requests ? `\n  _Request: ${b.special_requests}_` : ''}`;
    }).join('\n');

    const departureList = checkedIn.map((b) => {
      const guest = guests.find((g) => g.id === b.guest_id);
      const room = rooms.find((r) => r.id === b.room_id);
      return `- **${guest?.first_name ?? '?'} ${guest?.last_name ?? ''}** — Room ${room?.room_number ?? '?'} · £${b.total_amount ?? 0}`;
    }).join('\n');

    return `## Today's Arrivals & Departures

### 🟢 Arrivals (${arrivals.length})
${arrivals.length > 0 ? arrivalList : '_No arrivals today._'}

### 🔴 In-House / Pending Departure (${checkedIn.length})
${checkedIn.length > 0 ? departureList : '_No departures today._'}

**Action items:**
${dirty > 0 ? `- ⚠️ ${dirty} room${dirty > 1 ? 's' : ''} need housekeeping before arrivals` : '- ✅ All rooms clean and ready'}
${arrivals.some((b) => b.special_requests) ? '- 📝 Check special requests above — some guests have preferences noted' : ''}
- 📋 Ensure welcome amenities are prepared for VIP guests`;
  }

  // Revenue
  if (q.includes('revenue') || q.includes('income') || q.includes('money') || q.includes('financial') || q.includes('earnings')) {
    const directBookings = bookings.filter((b) => b.source === 'direct');
    const otaBookings = bookings.filter((b) => b.source !== 'direct');
    const directRevenue = directBookings.reduce((sum, b) => sum + (b.total_amount ?? 0), 0);
    const otaRevenue = otaBookings.reduce((sum, b) => sum + (b.total_amount ?? 0), 0);

    return `## Revenue Summary

### Current Bookings Revenue
| Metric | Value |
|--------|-------|
| **Total Revenue** | **£${totalRevenue.toLocaleString()}** |
| **Average Daily Rate** | £${avgRate} |
| **RevPAR** | £${totalRooms > 0 ? Math.round((occupied * avgRate) / totalRooms) : 0} |
| **Bookings** | ${bookings.length} |

### By Source
- 🏠 **Direct bookings:** ${directBookings.length} (£${directRevenue.toLocaleString()}) — ${bookings.length > 0 ? Math.round((directBookings.length / bookings.length) * 100) : 0}%
- 🌐 **OTA bookings:** ${otaBookings.length} (£${otaRevenue.toLocaleString()}) — ${bookings.length > 0 ? Math.round((otaBookings.length / bookings.length) * 100) : 0}%

### Room Type Performance
${roomTypes.map((rt) => {
  const typeBookings = bookings.filter((b) => b.room_type_id === rt.id);
  const typeRevenue = typeBookings.reduce((sum, b) => sum + (b.total_amount ?? 0), 0);
  return `- **${rt.name}** (£${rt.base_rate}/night): ${typeBookings.length} booking${typeBookings.length !== 1 ? 's' : ''} · £${typeRevenue.toLocaleString()}`;
}).join('\n')}

💡 **Recommendation:** ${directBookings.length < otaBookings.length ? 'Your OTA ratio is high — consider incentivising direct bookings with a "Book Direct" discount to reduce commission costs.' : 'Great direct booking ratio! Keep promoting your booking engine.'}`;
  }

  // Housekeeping
  if (q.includes('housekeeping') || q.includes('cleaning') || q.includes('dirty') || q.includes('clean')) {
    const hkGroups = {
      clean: rooms.filter((r) => r.housekeeping_status === 'clean'),
      dirty: rooms.filter((r) => r.housekeeping_status === 'dirty'),
      inspected: rooms.filter((r) => r.housekeeping_status === 'inspected'),
      serviced: rooms.filter((r) => r.housekeeping_status === 'serviced'),
      out_of_order: rooms.filter((r) => r.housekeeping_status === 'out_of_order'),
    };

    return `## Housekeeping Status

| Status | Rooms | Details |
|--------|-------|---------|
| ✅ Clean | ${hkGroups.clean.length} | ${hkGroups.clean.map((r) => r.room_number).join(', ') || '—'} |
| 🧹 Dirty | ${hkGroups.dirty.length} | ${hkGroups.dirty.map((r) => r.room_number).join(', ') || '—'} |
| 🔍 Inspected | ${hkGroups.inspected.length} | ${hkGroups.inspected.map((r) => r.room_number).join(', ') || '—'} |
| 🛎️ Serviced | ${hkGroups.serviced.length} | ${hkGroups.serviced.map((r) => r.room_number).join(', ') || '—'} |
| 🔧 Out of Order | ${hkGroups.out_of_order.length} | ${hkGroups.out_of_order.map((r) => `${r.room_number}${r.notes ? ` (${r.notes})` : ''}`).join(', ') || '—'} |

**Ready to sell:** ${clean} room${clean !== 1 ? 's' : ''}
${dirty > 0 ? `\n⚠️ **Priority:** ${dirty} room${dirty > 1 ? 's' : ''} need cleaning before new arrivals.` : '\n✅ All rooms are clean or in service.'}`;
  }

  // Maintenance
  if (q.includes('maintenance') || q.includes('repair') || q.includes('work order') || q.includes('out of order') || q.includes('broken')) {
    const maintenanceRooms = rooms.filter((r) => r.status === 'maintenance' || r.status === 'blocked');
    return `## Maintenance & Out of Service

**${maintenanceRooms.length}** room${maintenanceRooms.length !== 1 ? 's' : ''} currently unavailable:

${maintenanceRooms.length > 0 ? maintenanceRooms.map((r) => {
  const rt = roomTypes.find((t) => t.id === r.room_type_id);
  return `- **Room ${r.room_number}** (${rt?.name ?? 'Unknown'}, Floor ${r.floor ?? '?'}) — ${r.status === 'blocked' ? 'Out of Service' : 'Maintenance'}${r.notes ? ` · _${r.notes}_` : ''}`;
}).join('\n') : '_No rooms currently in maintenance._'}

${maintenanceRooms.length > 0 ? `\n💡 These ${maintenanceRooms.length} room${maintenanceRooms.length !== 1 ? 's' : ''} represent **£${maintenanceRooms.reduce((sum, r) => sum + (roomTypes.find((t) => t.id === r.room_type_id)?.base_rate ?? 0), 0)}/night** in lost revenue. Prioritise returning them to service.` : ''}`;
  }

  // Guest queries
  if (q.includes('guest') || q.includes('vip') || q.includes('customer') || q.includes('returning')) {
    return `## Guest Overview

| Metric | Value |
|--------|-------|
| **Total Guests** | ${guests.length} |
| **VIP Guests** | ${vipGuests.length} |
| **Returning Guests** | ${returningGuests.length} |
| **New Guests** | ${guests.filter((g) => (g.total_stays ?? 0) === 0).length} |

### VIP Guests
${vipGuests.length > 0 ? vipGuests.map((g) => `- **${g.first_name} ${g.last_name}** — ${g.total_stays ?? 0} stays, £${(g.total_spend ?? 0).toLocaleString()} total spend${g.preferences?.room_pref ? ` · _Prefers: ${g.preferences.room_pref}_` : ''}`).join('\n') : '_No VIP guests._'}

### Top Spenders
${[...guests].sort((a, b) => (b.total_spend ?? 0) - (a.total_spend ?? 0)).slice(0, 5).map((g, i) => `${i + 1}. **${g.first_name} ${g.last_name}** — £${(g.total_spend ?? 0).toLocaleString()} (${g.total_stays ?? 0} stays)`).join('\n')}

💡 **Tip:** Consider a loyalty programme for your ${returningGuests.length} returning guests to increase retention and direct bookings.`;
  }

  // Room types / inventory
  if (q.includes('room type') || q.includes('inventory') || q.includes('what rooms') || q.includes('room categories')) {
    return `## Room Inventory

${roomTypes.map((rt) => {
  const typeRooms = rooms.filter((r) => r.room_type_id === rt.id);
  const typeOccupied = typeRooms.filter((r) => r.status === 'occupied').length;
  return `### ${rt.name} — £${rt.base_rate}/night
- **Rooms:** ${typeRooms.length} (${typeOccupied} occupied, ${typeRooms.length - typeOccupied} available)
- **Max Occupancy:** ${rt.max_occupancy} guests
- **Beds:** ${rt.bed_config?.map((b) => `${b.count}× ${b.type}`).join(', ') ?? 'N/A'}
- **Amenities:** ${rt.amenities?.join(', ') ?? 'None'}`;
}).join('\n\n')}

**Total Inventory:** ${totalRooms} rooms across ${roomTypes.length} types`;
  }

  // Pricing / rates
  if (q.includes('rate') || q.includes('pricing') || q.includes('price') || q.includes('discount')) {
    return `## Rate Overview

| Room Type | Base Rate | Rooms | Current Demand |
|-----------|-----------|-------|----------------|
${roomTypes.map((rt) => {
  const typeRooms = rooms.filter((r) => r.room_type_id === rt.id);
  const occ = typeRooms.filter((r) => r.status === 'occupied').length;
  const demand = typeRooms.length > 0 ? Math.round((occ / typeRooms.length) * 100) : 0;
  return `| ${rt.name} | £${rt.base_rate} | ${typeRooms.length} | ${demand}% occupied |`;
}).join('\n')}

**Average Rate Across Property:** £${avgRate}
**RevPAR:** £${totalRooms > 0 ? Math.round((occupied * avgRate) / totalRooms) : 0}

💡 **Recommendations:**
${roomTypes.filter((rt) => {
  const occ = rooms.filter((r) => r.room_type_id === rt.id && r.status === 'occupied').length;
  const total = rooms.filter((r) => r.room_type_id === rt.id).length;
  return total > 0 && (occ / total) > 0.8;
}).map((rt) => `- **${rt.name}** is at high demand — consider a rate increase of 10-15%`).join('\n') || '- Demand is balanced across room types'}
${occupancyRate < 50 ? '- Consider a midweek special or last-minute discount to boost occupancy' : ''}`;
  }

  // Bookings
  if (q.includes('booking') || q.includes('reservation')) {
    return `## Bookings Overview

| Status | Count |
|--------|-------|
| ✅ Confirmed | ${bookings.filter((b) => b.status === 'confirmed').length} |
| 🏨 Checked In | ${bookings.filter((b) => b.status === 'checked_in').length} |
| ⏳ Pending | ${bookings.filter((b) => b.status === 'pending').length} |

### Recent Bookings
${bookings.slice(0, 8).map((b) => {
  const guest = guests.find((g) => g.id === b.guest_id);
  const rt = roomTypes.find((t) => t.id === b.room_type_id);
  return `- **${guest?.first_name ?? '?'} ${guest?.last_name ?? ''}** — ${rt?.name ?? '?'} · ${b.check_in} → ${b.check_out} · £${b.total_amount ?? 0} · _${b.source}_`;
}).join('\n')}

**Total Revenue from Current Bookings:** £${totalRevenue.toLocaleString()}`;
  }

  // Staff
  if (q.includes('staff') || q.includes('employee') || q.includes('team')) {
    return `## Staff Information

The AI has access to staff data when connected to your live property database. In this demo, here's what the AI can analyse:

- **Active staff members** and their roles
- **Permission levels** across the platform
- **Staff scheduling** (when Staff Rota is enabled)
- **Activity logs** showing who did what

💡 This is a demo preview — connect your live property to see your actual team data.`;
  }

  // General / catch-all
  return `## Property Dashboard Summary

### Occupancy
- **Rate:** ${occupancyRate}% (${occupied}/${totalRooms} rooms)
- **Available:** ${available} rooms ready to sell
- **Maintenance:** ${maintenance} room${maintenance !== 1 ? 's' : ''}

### Today's Activity
- 🟢 **${arrivals.length}** arrivals expected
- 🏨 **${checkedIn.length}** guests in-house
- ${dirty > 0 ? `⚠️ **${dirty}** rooms need housekeeping` : '✅ All rooms clean'}

### Revenue Snapshot
- **Total from current bookings:** £${totalRevenue.toLocaleString()}
- **Average rate:** £${avgRate}/night
- **RevPAR:** £${totalRooms > 0 ? Math.round((occupied * avgRate) / totalRooms) : 0}

### Guest Highlights
- 👑 ${vipGuests.length} VIP guest${vipGuests.length !== 1 ? 's' : ''}
- 🔄 ${returningGuests.length} returning guest${returningGuests.length !== 1 ? 's' : ''}

---
*Try asking about specific topics: occupancy, arrivals, revenue, housekeeping, guests, room types, rates, maintenance, or bookings.*`;
}

// ============================================================
// System prompt builder — feeds ALL property data to Claude (live mode)
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

  // ---- Send message (calls Claude API in live mode, demo responder in demo mode) ----
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

    setIsStreaming(true);

    // --- DEMO MODE: use local AI responder ---
    if (isDemoMode) {
      // Simulate a brief "thinking" delay
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));

      const assistantContent = generateDemoResponse(content, propertyId ?? 'demo-property-id');
      const assistantMsg: AIMessage = {
        id: `demo-msg-${Date.now()}-resp`,
        conversation_id: activeConversationId,
        role: 'assistant',
        content: assistantContent,
        tokens_used: 0,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData(['ai-messages', activeConversationId], (old: AIMessage[] | undefined) =>
        [...(old ?? []), assistantMsg]
      );

      // Update conversation title from first user message
      const currentMessages = queryClient.getQueryData<AIMessage[]>(['ai-messages', activeConversationId]) ?? [];
      if (currentMessages.filter((m) => m.role === 'user').length <= 1) {
        const title = content.length > 60 ? content.slice(0, 57) + '...' : content;
        queryClient.setQueryData(['ai-conversations', propertyId], (old: AIConversation[] | undefined) =>
          (old ?? []).map((c) => c.id === activeConversationId ? { ...c, title, updated_at: new Date().toISOString() } : c)
        );
      }

      setIsStreaming(false);
      return;
    }

    // --- LIVE MODE: call Claude API ---
    // Save user message to DB
    await supabase.from('ai_messages').insert({
      conversation_id: activeConversationId,
      role: 'user',
      content,
    });

    // Build messages array for Claude
    const currentMessages = queryClient.getQueryData<AIMessage[]>(['ai-messages', activeConversationId]) ?? [];
    const claudeMessages = currentMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })).filter((m) => m.role !== 'system' as string);

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
        id: crypto.randomUUID(),
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
