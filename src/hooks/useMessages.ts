import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isDemoMode } from '@/lib/supabase';
import { useProperty } from './useProperty';
import type { Message, MessageTemplate } from '@/types';
import type { MessageTemplateFormData } from '@/lib/validators';
import toast from 'react-hot-toast';

// ============================================================
// Demo Data
// ============================================================

const demoMessages: Message[] = [
  {
    id: 'm1', property_id: 'demo-property-id', booking_id: '1', guest_id: 'g1',
    channel: 'email', direction: 'outbound', template_id: null,
    subject: 'Your Booking is Confirmed — AR-TK82NP',
    body: 'Dear Sarah, Thank you for booking with The Grand Harbour Hotel! Your reservation is confirmed.',
    status: 'delivered', sent_at: new Date().toISOString(), metadata: {}, created_at: new Date().toISOString(),
  },
  {
    id: 'm2', property_id: 'demo-property-id', booking_id: '3', guest_id: 'g3',
    channel: 'email', direction: 'outbound', template_id: null,
    subject: "We're Looking Forward to Your Stay — AR-MF47RL",
    body: 'Dear Maria, Your stay is just around the corner!',
    status: 'delivered', sent_at: new Date().toISOString(), metadata: {}, created_at: new Date().toISOString(),
  },
  {
    id: 'm3', property_id: 'demo-property-id', booking_id: '2', guest_id: 'g2',
    channel: 'sms', direction: 'outbound', template_id: null,
    subject: null,
    body: "Hi James! Just a reminder — you're checking in to The Grand Harbour Hotel tomorrow.",
    status: 'sent', sent_at: new Date().toISOString(), metadata: {}, created_at: new Date().toISOString(),
  },
];

const demoTemplates: MessageTemplate[] = [
  {
    id: 'mt1', property_id: 'demo-property-id', trigger: 'booking_confirmed', channel: 'email',
    name: 'Booking Confirmation', subject: 'Your Booking is Confirmed — {{confirmation_code}}',
    body: 'Dear {{guest_name}},\n\nThank you for booking with {{property_name}}!\n\nYour reservation details:\n• Confirmation Code: {{confirmation_code}}\n• Room: {{room_type}}\n• Check-in: {{check_in}}\n• Check-out: {{check_out}}\n• Total: {{total_amount}}',
    send_offset_hours: 0, is_active: true, created_at: '', updated_at: '',
  },
  {
    id: 'mt2', property_id: 'demo-property-id', trigger: 'pre_arrival', channel: 'email',
    name: 'Pre-Arrival Message', subject: "We're Looking Forward to Your Stay — {{confirmation_code}}",
    body: 'Dear {{guest_name}},\n\nYour stay at {{property_name}} is just around the corner!\n\nCheck-in: {{check_in}} from {{check_in_time}}',
    send_offset_hours: -48, is_active: true, created_at: '', updated_at: '',
  },
  {
    id: 'mt3', property_id: 'demo-property-id', trigger: 'check_in_reminder', channel: 'sms',
    name: 'Check-in Reminder SMS', subject: null,
    body: "Hi {{guest_name}}! Just a reminder — you're checking in to {{property_name}} tomorrow. Check-in from {{check_in_time}}. Ref: {{confirmation_code}}",
    send_offset_hours: -24, is_active: true, created_at: '', updated_at: '',
  },
  {
    id: 'mt4', property_id: 'demo-property-id', trigger: 'post_stay', channel: 'email',
    name: 'Post-Stay Thank You', subject: 'Thank You for Staying with Us!',
    body: 'Dear {{guest_name}},\n\nThank you for choosing {{property_name}}. We hope you had a wonderful stay!',
    send_offset_hours: 24, is_active: true, created_at: '', updated_at: '',
  },
];

// ============================================================
// Hook
// ============================================================

export function useMessages() {
  const { propertyId } = useProperty();
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ['messages', propertyId],
    queryFn: async (): Promise<Message[]> => {
      if (isDemoMode) return demoMessages;
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('property_id', propertyId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!propertyId,
  });

  const templatesQuery = useQuery({
    queryKey: ['message-templates', propertyId],
    queryFn: async (): Promise<MessageTemplate[]> => {
      if (isDemoMode) return demoTemplates;
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('property_id', propertyId!)
        .order('trigger');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!propertyId,
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...input }: MessageTemplateFormData & { id: string }) => {
      if (isDemoMode) {
        queryClient.setQueryData<MessageTemplate[]>(['message-templates', propertyId], (old) =>
          (old ?? []).map((t) => t.id === id ? { ...t, ...input, updated_at: new Date().toISOString() } : t)
        );
        toast.success('Template updated');
        return;
      }
      const { error } = await supabase.from('message_templates').update(input).eq('id', id);
      if (error) throw error;
      toast.success('Template updated');
    },
    onSuccess: () => { if (!isDemoMode) queryClient.invalidateQueries({ queryKey: ['message-templates'] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  const sendMessage = useMutation({
    mutationFn: async (input: { guest_id: string | null; booking_id?: string; channel: string; subject?: string; body: string }) => {
      const guestId = input.guest_id || null;
      if (isDemoMode) {
        const newMsg: Message = {
          id: `m-${Date.now()}`, property_id: 'demo-property-id',
          booking_id: input.booking_id ?? null, guest_id: guestId,
          channel: input.channel as Message['channel'], direction: 'outbound', template_id: null,
          subject: input.subject ?? null, body: input.body,
          status: 'delivered', sent_at: new Date().toISOString(),
          metadata: {}, created_at: new Date().toISOString(),
        };
        queryClient.setQueryData<Message[]>(['messages', propertyId], (old) => [newMsg, ...(old ?? [])]);
        toast.success('Message sent');
        return;
      }
      const { error } = await supabase.from('messages').insert({
        property_id: propertyId!,
        ...input,
        guest_id: guestId,
        direction: 'outbound',
        status: 'queued',
      });
      if (error) throw error;
      toast.success('Message queued');
    },
    onSuccess: () => { if (!isDemoMode) queryClient.invalidateQueries({ queryKey: ['messages'] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    messages: messagesQuery.data ?? [],
    templates: templatesQuery.data ?? [],
    isLoadingMessages: messagesQuery.isLoading,
    isLoadingTemplates: templatesQuery.isLoading,
    updateTemplate,
    sendMessage,
  };
}
