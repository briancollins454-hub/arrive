import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isDemoMode } from '@/lib/supabase';
import { useProperty } from './useProperty';
import type { Notification } from '@/types';
import { subMinutes, subHours, subDays } from 'date-fns';

const today = new Date();
const DEMO_PROPERTY_ID = 'demo-property-id';

// ============================================================
// Demo notifications
// ============================================================

const demoNotifications: Notification[] = [
  { id: 'n1', property_id: DEMO_PROPERTY_ID, type: 'vip_arrival', title: 'VIP Arrival Today', message: 'Sarah Mitchell (VIP) arriving today — Deluxe Double, Room 201, 3 nights. Late check-in requested.', link: '/dashboard/bookings/1', is_read: false, created_at: subMinutes(today, 15).toISOString() },
  { id: 'n2', property_id: DEMO_PROPERTY_ID, type: 'check_in_due', title: '2 Arrivals Pending', message: "Sarah Mitchell and James O'Brien are expected today and haven't checked in yet.", link: '/dashboard/bookings?view=arrivals', is_read: false, created_at: subMinutes(today, 30).toISOString() },
  { id: 'n3', property_id: DEMO_PROPERTY_ID, type: 'check_out_overdue', title: '3 Departures Today', message: 'Maria Fernandez (Room 302), Liam Murphy (Room 204), and Anna Kowalski (Room 107) are due to check out.', link: '/dashboard/bookings?view=departures', is_read: false, created_at: subHours(today, 1).toISOString() },
  { id: 'n4', property_id: DEMO_PROPERTY_ID, type: 'maintenance_alert', title: 'Room 205 Out of Order', message: 'Room 205 (Sea View Double) remains out of order — bathroom renovation in progress.', link: '/dashboard/rooms', is_read: false, created_at: subHours(today, 3).toISOString() },
  { id: 'n5', property_id: DEMO_PROPERTY_ID, type: 'night_audit_reminder', title: 'Night Audit Complete', message: 'Night audit ran at 02:00 — 4 rooms charged (B3, B4, B9, B10), daily revenue £826.', link: '/dashboard/night-audit', is_read: true, created_at: subHours(today, 6).toISOString() },
  { id: 'n6', property_id: DEMO_PROPERTY_ID, type: 'payment_received', title: 'Payment Received', message: 'Card payment £1,134 received for Booking #4 (David Chen).', link: '/dashboard/bookings/4', is_read: true, created_at: subDays(today, 1).toISOString() },
  { id: 'n7', property_id: DEMO_PROPERTY_ID, type: 'new_booking', title: 'New Booking', message: 'Emma Watson booked Deluxe Double for 2 nights (arriving tomorrow).', link: '/dashboard/bookings/5', is_read: true, created_at: subDays(today, 1).toISOString() },
  { id: 'n8', property_id: DEMO_PROPERTY_ID, type: 'housekeeping_complete', title: 'Housekeeping Complete', message: 'Room 106 cleaned and inspected — ready to sell.', link: '/dashboard/housekeeping', is_read: true, created_at: subDays(today, 1).toISOString() },
  { id: 'n9', property_id: DEMO_PROPERTY_ID, type: 'cancellation', title: 'Booking Cancelled', message: 'A test booking was cancelled (no charge).', link: '/dashboard/bookings', is_read: true, created_at: subDays(today, 3).toISOString() },
  { id: 'n10', property_id: DEMO_PROPERTY_ID, type: 'system', title: 'System Update', message: 'Arrivé PMS updated to latest version. See changelog for details.', is_read: true, created_at: subDays(today, 5).toISOString() },
];

// ============================================================
// Hook
// ============================================================

export function useNotifications() {
  const queryClient = useQueryClient();
  const { propertyId } = useProperty();
  const queryKeyPropId = propertyId ?? DEMO_PROPERTY_ID;

  const notifQuery = useQuery({
    queryKey: ['notifications', queryKeyPropId],
    queryFn: async () => {
      if (isDemoMode) return demoNotifications;
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('property_id', queryKeyPropId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Notification[];
    },
  });

  const markRead = useMutation({
    mutationFn: async (notifId: string) => {
      if (isDemoMode) {
        queryClient.setQueryData<Notification[]>(['notifications', queryKeyPropId], (old) =>
          (old ?? []).map((n) => n.id === notifId ? { ...n, is_read: true } : n)
        );
        return;
      }
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
      if (error) throw error;
    },
    onSuccess: () => { if (!isDemoMode) queryClient.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (isDemoMode) {
        queryClient.setQueryData<Notification[]>(['notifications', queryKeyPropId], (old) =>
          (old ?? []).map((n) => ({ ...n, is_read: true }))
        );
        return;
      }
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('property_id', queryKeyPropId).eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => { if (!isDemoMode) queryClient.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  const notifications = notifQuery.data ?? [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    isLoading: notifQuery.isLoading,
    markRead,
    markAllRead,
  };
}
