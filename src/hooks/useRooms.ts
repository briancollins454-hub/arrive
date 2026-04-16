import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isDemoMode } from '@/lib/supabase';
import { useProperty } from './useProperty';
import { logActivity } from './useActivityLog';
import { getDemoRoomTypes, getDemoRooms } from './demoData';
import type { RoomType, Room, RoomStatus, HousekeepingStatus } from '@/types';
import type { RoomFormData, RoomTypeFormData } from '@/lib/validators';
import toast from 'react-hot-toast';

// ============================================================
// Hook
// ============================================================

export function useRooms() {
  const { propertyId } = useProperty();
  const queryClient = useQueryClient();

  // Room Types
  const roomTypesQuery = useQuery({
    queryKey: ['room-types', propertyId],
    queryFn: async (): Promise<RoomType[]> => {
      if (isDemoMode) return getDemoRoomTypes(propertyId!);
      const { data, error } = await supabase
        .from('room_types')
        .select('*')
        .eq('property_id', propertyId!)
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!propertyId,
  });

  // Rooms
  const roomsQuery = useQuery({
    queryKey: ['rooms', propertyId],
    queryFn: async (): Promise<Room[]> => {
      if (isDemoMode) return getDemoRooms(propertyId!);
      const { data, error } = await supabase
        .from('rooms')
        .select('*, room_type:room_types(*)')
        .eq('property_id', propertyId!)
        .order('room_number');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!propertyId,
  });

  // Create Room Type
  const createRoomType = useMutation({
    mutationFn: async (input: RoomTypeFormData) => {
      if (isDemoMode) {
        const id = `rt-${Date.now()}`;
        const newRT: RoomType = {
          id, property_id: propertyId!, name: input.name,
          description: input.description ?? '', base_rate: input.base_rate,
          max_occupancy: input.max_occupancy, amenities: input.amenities ?? [],
          images: [], bed_config: input.bed_config ?? [],
          sort_order: (queryClient.getQueryData<RoomType[]>(['room-types', propertyId])?.length ?? 0) + 1,
          is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        };
        queryClient.setQueryData<RoomType[]>(['room-types', propertyId], (old) => [...(old ?? []), newRT]);
        toast.success('Room type created');
        return;
      }
      const { error } = await supabase
        .from('room_types')
        .insert({ ...input, property_id: propertyId! });
      if (error) throw error;
      toast.success('Room type created');
    },
    onSuccess: () => { if (!isDemoMode) queryClient.invalidateQueries({ queryKey: ['room-types'] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  // Update Room Type
  const updateRoomType = useMutation({
    mutationFn: async ({ id, ...input }: RoomTypeFormData & { id: string }) => {
      if (isDemoMode) {
        queryClient.setQueryData<RoomType[]>(['room-types', propertyId], (old) =>
          (old ?? []).map((rt) => rt.id === id ? { ...rt, ...input, updated_at: new Date().toISOString() } : rt)
        );
        toast.success('Room type updated');
        return;
      }
      const { error } = await supabase.from('room_types').update(input).eq('id', id);
      if (error) throw error;
      toast.success('Room type updated');
    },
    onSuccess: () => { if (!isDemoMode) queryClient.invalidateQueries({ queryKey: ['room-types'] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete Room Type
  const deleteRoomType = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        // Check for rooms assigned to this type
        const existingRooms = (queryClient.getQueryData<Room[]>(['rooms', propertyId]) ?? [])
          .filter((r) => r.room_type_id === id);
        if (existingRooms.length > 0) {
          throw new Error(`Cannot delete — ${existingRooms.length} room(s) still assigned to this type. Remove or reassign them first.`);
        }
        queryClient.setQueryData<RoomType[]>(['room-types', propertyId], (old) =>
          (old ?? []).filter((rt) => rt.id !== id)
        );
        toast.success('Room type deleted');
        return;
      }
      // Check for rooms in real mode
      const { count } = await supabase
        .from('rooms')
        .select('id', { count: 'exact', head: true })
        .eq('room_type_id', id);
      if (count && count > 0) {
        throw new Error(`Cannot delete — ${count} room(s) still assigned to this type. Remove or reassign them first.`);
      }
      const { error } = await supabase.from('room_types').delete().eq('id', id);
      if (error) throw error;
      toast.success('Room type deleted');
    },
    onSuccess: () => { if (!isDemoMode) queryClient.invalidateQueries({ queryKey: ['room-types'] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  // Create Room
  const createRoom = useMutation({
    mutationFn: async (input: RoomFormData) => {
      if (isDemoMode) {
        const id = `r-${Date.now()}`;
        const newRoom: Room = {
          id, property_id: propertyId!, room_type_id: input.room_type_id,
          room_number: input.room_number, floor: input.floor ?? 1,
          status: input.status ?? 'available', housekeeping_status: 'clean', notes: input.notes ?? null,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        };
        queryClient.setQueryData<Room[]>(['rooms', propertyId], (old) => [...(old ?? []), newRoom]);
        toast.success('Room created');
        return;
      }
      const { error } = await supabase
        .from('rooms')
        .insert({ ...input, property_id: propertyId! });
      if (error) throw error;
      toast.success('Room created');
    },
    onSuccess: () => { if (!isDemoMode) queryClient.invalidateQueries({ queryKey: ['rooms'] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  // Update Room — cascades housekeeping_status to stay in sync
  const updateRoom = useMutation({
    mutationFn: async ({ id, ...input }: RoomFormData & { id: string }) => {
      if (isDemoMode) {
        queryClient.setQueryData<Room[]>(['rooms', propertyId], (old) =>
          (old ?? []).map((r) => {
            if (r.id !== id) return r;
            const updated: Room = { ...r, ...input, updated_at: new Date().toISOString() } as Room;

            // Cascade housekeeping_status based on room status changes
            const newStatus = input.status;
            const oldStatus = r.status;
            if (newStatus && newStatus !== oldStatus) {
              if (newStatus === 'maintenance' || newStatus === 'blocked') {
                // Going to maintenance/blocked → housekeeping becomes out_of_order
                updated.housekeeping_status = 'out_of_order';
              } else if ((oldStatus === 'maintenance' || oldStatus === 'blocked') && (newStatus === 'available' || newStatus === 'reserved')) {
                // Returning from maintenance/blocked → mark clean (needs inspection)
                updated.housekeeping_status = 'clean';
                if (!input.notes) updated.notes = null;
              }
            }
            return updated;
          })
        );
        const room = (queryClient.getQueryData<Room[]>(['rooms', propertyId]) ?? []).find(r => r.id === id);
        const statusLabels: Record<string, string> = {
          maintenance: 'set to Maintenance',
          blocked: 'marked Out of Service',
          available: 'returned to service',
        };
        const label = input.status ? (statusLabels[input.status] ?? 'updated') : 'updated';
        toast.success(`Room ${room?.room_number ?? id} ${label}`);
        logActivity(queryClient, propertyId, {
          action: 'room_status_changed', entity_type: 'room', entity_id: id,
          description: `Room ${room?.room_number ?? id} ${label}`,
          performed_by: 'Front Desk',
        });
        return;
      }

      // Real mode — get current state for cascading
      const updates: Record<string, unknown> = { ...input };
      const { data: current } = await supabase.from('rooms').select('status, housekeeping_status').eq('id', id).single();
      if (current && input.status && input.status !== current.status) {
        if (input.status === 'maintenance' || input.status === 'blocked') {
          updates.housekeeping_status = 'out_of_order';
        } else if ((current.status === 'maintenance' || current.status === 'blocked') && (input.status === 'available' || input.status === 'reserved')) {
          updates.housekeeping_status = 'clean';
        }
      }

      const { error } = await supabase.from('rooms').update(updates).eq('id', id);
      if (error) throw error;
      toast.success('Room updated');
    },
    onSuccess: () => { if (!isDemoMode) queryClient.invalidateQueries({ queryKey: ['rooms'] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  // Update Housekeeping Status — cascades room status automatically
  const updateHousekeepingStatus = useMutation({
    mutationFn: async ({ roomId, status, notes }: { roomId: string; status: HousekeepingStatus; notes?: string }) => {
      if (isDemoMode) {
        queryClient.setQueryData<Room[]>(['rooms', propertyId], (old) =>
          (old ?? []).map((r) => {
            if (r.id !== roomId) return r;
            const updated = { ...r, housekeeping_status: status, notes: notes ?? r.notes, updated_at: new Date().toISOString() };

            // Cascade room status based on housekeeping action
            if (status === 'out_of_order') {
              // Out of order → room goes to maintenance
              updated.status = 'maintenance';
            } else if ((r.housekeeping_status as string) === 'out_of_order') {
              // Coming back from OOO → room becomes available
              updated.status = 'available';
            } else if ((status === 'clean' || status === 'inspected') && r.status !== 'occupied') {
              // Cleaned/inspected and not occupied → available (ready to sell)
              updated.status = 'available';
              if (status === 'clean') updated.notes = null; // Clear departed notes
            }
            return updated;
          })
        );
        const labels: Record<HousekeepingStatus, string> = {
          clean: 'marked clean — ready to sell',
          dirty: 'marked dirty',
          inspected: 'inspected — ready to sell',
          serviced: 'marked as serviced',
          service_refused: 'service refused recorded',
          out_of_order: 'marked out of order',
        };
        const room = (queryClient.getQueryData<Room[]>(['rooms', propertyId]) ?? []).find(r => r.id === roomId);
        logActivity(queryClient, propertyId, {
          action: 'housekeeping_updated', entity_type: 'room', entity_id: roomId,
          description: `Room ${room?.room_number ?? roomId} ${labels[status]}`,
          performed_by: 'Housekeeping',
        });
        toast.success(`Room ${labels[status]}`);
        return;
      }

      // Real mode — update housekeeping + cascade room status
      const updates: Record<string, unknown> = { housekeeping_status: status };
      if (notes !== undefined) updates.notes = notes;

      // Get current room to decide cascades
      const { data: room } = await supabase.from('rooms').select('status, housekeeping_status').eq('id', roomId).single();

      if (status === 'out_of_order') {
        updates.status = 'maintenance';
      } else if ((room?.housekeeping_status as string) === 'out_of_order') {
        updates.status = 'available';
      } else if ((status === 'clean' || status === 'inspected') && room?.status !== 'occupied') {
        updates.status = 'available';
      }

      const { error } = await supabase.from('rooms').update(updates).eq('id', roomId);
      if (error) throw error;
      toast.success('Housekeeping status updated');
    },
    onSuccess: () => { if (!isDemoMode) queryClient.invalidateQueries({ queryKey: ['rooms'] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  // Bulk create rooms (for floor setup)
  const createRoomsBulk = useMutation({
    mutationFn: async (inputs: RoomFormData[]) => {
      if (inputs.length === 0) return;
      if (isDemoMode) {
        const newRooms: Room[] = inputs.map((input, i) => ({
          id: `r-${Date.now()}-${i}`,
          property_id: propertyId!,
          room_type_id: input.room_type_id,
          room_number: input.room_number,
          floor: input.floor ?? 1,
          status: input.status ?? 'available' as RoomStatus,
          housekeeping_status: 'clean' as const,
          notes: input.notes ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        queryClient.setQueryData<Room[]>(['rooms', propertyId], (old) => [...(old ?? []), ...newRooms]);
        toast.success(`${inputs.length} rooms created`);
        return;
      }
      const rows = inputs.map((input) => ({ ...input, property_id: propertyId! }));
      const { error } = await supabase.from('rooms').insert(rows);
      if (error) throw error;
      toast.success(`${inputs.length} rooms created`);
    },
    onSuccess: () => { if (!isDemoMode) queryClient.invalidateQueries({ queryKey: ['rooms'] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    roomTypes: roomTypesQuery.data ?? [],
    rooms: roomsQuery.data ?? [],
    isLoadingTypes: roomTypesQuery.isLoading,
    isLoadingRooms: roomsQuery.isLoading,
    createRoomType,
    updateRoomType,
    deleteRoomType,
    createRoom,
    createRoomsBulk,
    updateRoom,
    updateHousekeepingStatus,
  };
}
