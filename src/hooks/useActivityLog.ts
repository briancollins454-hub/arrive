import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { supabase, isDemoMode } from '@/lib/supabase';
import { useProperty } from './useProperty';
import type { ActivityLogEntry } from '@/types';
import { subDays, subHours, subMinutes } from 'date-fns';

const today = new Date();
const DEMO_PROPERTY_ID = 'demo-property-id';

// ============================================================
// Utility — push a log entry into the query cache (demo mode only)
// Callable from any hook without needing useActivityLog().
// ============================================================

export function logActivity(
  queryClient: QueryClient,
  propertyId: string | null,
  input: Omit<ActivityLogEntry, 'id' | 'property_id' | 'created_at'>,
) {
  if (!isDemoMode) return; // real mode: server-side triggers handle this
  const propId = propertyId ?? DEMO_PROPERTY_ID;
  const entry: ActivityLogEntry = {
    id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    property_id: propId,
    ...input,
    created_at: new Date().toISOString(),
  };
  queryClient.setQueryData<ActivityLogEntry[]>(
    ['activity-log', propId],
    (old) => [entry, ...(old ?? [])],
  );
}

// ============================================================
// Demo activity log — recent hotel activity
// ============================================================

const demoLog: ActivityLogEntry[] = [
  { id: 'al-1', property_id: DEMO_PROPERTY_ID, action: 'staff_login', entity_type: 'staff', entity_id: null, description: 'Alex Demo signed in', performed_by: 'Alex Demo', created_at: subMinutes(today, 5).toISOString() },
  { id: 'al-2', property_id: DEMO_PROPERTY_ID, action: 'housekeeping_updated', entity_type: 'room', entity_id: 'r4', description: 'Room 106 marked clean — ready to sell', performed_by: 'Maria (HK)', created_at: subMinutes(today, 12).toISOString() },
  { id: 'al-3', property_id: DEMO_PROPERTY_ID, action: 'folio_charge_posted', entity_type: 'folio', entity_id: '4', description: 'Minibar charge £24 posted to Booking #4 (David Chen)', performed_by: 'Housekeeping', created_at: subHours(today, 2).toISOString() },
  { id: 'al-4', property_id: DEMO_PROPERTY_ID, action: 'booking_checked_in', entity_type: 'booking', entity_id: '8', description: 'Oliver Wright checked in — Room 106 (Standard Twin)', performed_by: 'Reception', created_at: subDays(today, 5).toISOString() },
  { id: 'al-5', property_id: DEMO_PROPERTY_ID, action: 'booking_checked_in', entity_type: 'booking', entity_id: '4', description: 'David Chen checked in — Room 202 (Deluxe Double)', performed_by: 'Reception', created_at: subDays(today, 1).toISOString() },
  { id: 'al-6', property_id: DEMO_PROPERTY_ID, action: 'room_assigned', entity_type: 'booking', entity_id: '8', description: 'Room 106 assigned to Booking #8 (Oliver Wright)', performed_by: 'Reception', created_at: subDays(today, 5).toISOString() },
  { id: 'al-7', property_id: DEMO_PROPERTY_ID, action: 'night_audit_run', entity_type: 'system', entity_id: null, description: 'Night audit completed — 4 rooms charged, 0 no-shows', performed_by: 'Night Audit', created_at: subHours(today, 6).toISOString() },
  { id: 'al-8', property_id: DEMO_PROPERTY_ID, action: 'booking_created', entity_type: 'booking', entity_id: '5', description: 'New booking #5 created — Emma Watson, Deluxe Double, 2 nights', performed_by: 'Website', created_at: subDays(today, 1).toISOString() },
  { id: 'al-9', property_id: DEMO_PROPERTY_ID, action: 'folio_payment_received', entity_type: 'folio', entity_id: '3', description: 'Payment £867 received for Booking #3 (Maria Fernandez)', performed_by: 'System', created_at: subDays(today, 3).toISOString() },
  { id: 'al-10', property_id: DEMO_PROPERTY_ID, action: 'booking_confirmed', entity_type: 'booking', entity_id: '1', description: 'Booking #1 confirmed — Sarah Mitchell, Deluxe Double, 3 nights', performed_by: 'Reception', created_at: subDays(today, 5).toISOString() },
  { id: 'al-11', property_id: DEMO_PROPERTY_ID, action: 'guest_created', entity_type: 'guest', entity_id: 'g5', description: 'New guest profile created — Emma Watson', performed_by: 'Website', created_at: subDays(today, 2).toISOString() },
  { id: 'al-12', property_id: DEMO_PROPERTY_ID, action: 'rate_created', entity_type: 'rate', entity_id: 'rp2', description: 'New rate period "Easter Peak" created — £229 Deluxe Double', performed_by: 'Manager', created_at: subDays(today, 5).toISOString() },
  { id: 'al-13', property_id: DEMO_PROPERTY_ID, action: 'housekeeping_updated', entity_type: 'room', entity_id: 'r6', description: 'Room 303 marked inspected — ready to sell', performed_by: 'Supervisor', created_at: subDays(today, 1).toISOString() },
  { id: 'al-14', property_id: DEMO_PROPERTY_ID, action: 'settings_updated', entity_type: 'system', entity_id: null, description: 'Cancellation policy updated — 48hr window', performed_by: 'Manager', created_at: subDays(today, 7).toISOString() },
  { id: 'al-15', property_id: DEMO_PROPERTY_ID, action: 'message_sent', entity_type: 'booking', entity_id: '1', description: 'Pre-arrival email sent to Sarah Mitchell', performed_by: 'System', created_at: subDays(today, 1).toISOString() },
  { id: 'al-16', property_id: DEMO_PROPERTY_ID, action: 'room_status_changed', entity_type: 'room', entity_id: 'r8', description: 'Room 205 marked out of order — plumbing issue', performed_by: 'Maintenance', created_at: subDays(today, 2).toISOString() },
  { id: 'al-17', property_id: DEMO_PROPERTY_ID, action: 'booking_modified', entity_type: 'booking', entity_id: '4', description: 'Booking #4 extended — check-out moved to +5 days', performed_by: 'Reception', created_at: subDays(today, 2).toISOString() },
  { id: 'al-18', property_id: DEMO_PROPERTY_ID, action: 'folio_charge_posted', entity_type: 'folio', entity_id: '3', description: 'Spa charge £120 posted to Booking #3 (Maria Fernandez)', performed_by: 'Spa', created_at: subDays(today, 2).toISOString() },
  { id: 'al-19', property_id: DEMO_PROPERTY_ID, action: 'booking_created', entity_type: 'booking', entity_id: '7', description: 'New booking #7 — Sophie Laurent, Garden Suite, 4 nights', performed_by: 'Airbnb', created_at: subDays(today, 10).toISOString() },
  { id: 'al-20', property_id: DEMO_PROPERTY_ID, action: 'booking_checked_in', entity_type: 'booking', entity_id: '3', description: 'Maria Fernandez checked in — Room 302 (Garden Suite)', performed_by: 'Reception', created_at: subDays(today, 3).toISOString() },
];

// ============================================================
// Hook
// ============================================================

export function useActivityLog() {
  const queryClient = useQueryClient();
  const { propertyId } = useProperty();
  const queryKeyPropId = propertyId ?? DEMO_PROPERTY_ID;

  const logQuery = useQuery({
    queryKey: ['activity-log', queryKeyPropId],
    queryFn: async () => {
      if (isDemoMode) return demoLog;
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('property_id', queryKeyPropId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as ActivityLogEntry[];
    },
  });

  // Add a log entry (called internally by other mutations)
  const addEntry = useMutation({
    mutationFn: async (input: Omit<ActivityLogEntry, 'id' | 'property_id' | 'created_at'>) => {
      const entry: ActivityLogEntry = {
        id: `al-${Date.now()}`,
        property_id: queryKeyPropId,
        ...input,
        created_at: new Date().toISOString(),
      };

      if (isDemoMode) {
        queryClient.setQueryData<ActivityLogEntry[]>(['activity-log', queryKeyPropId], (old) => [entry, ...(old ?? [])]);
        return entry;
      }

      const { data, error } = await supabase.from('activity_log').insert(entry).select().single();
      if (error) throw error;
      return data as ActivityLogEntry;
    },
    onSuccess: () => { if (!isDemoMode) queryClient.invalidateQueries({ queryKey: ['activity-log'] }); },
  });

  return {
    entries: logQuery.data ?? [],
    isLoading: logQuery.isLoading,
    addEntry,
  };
}
