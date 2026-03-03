import { useQuery } from '@tanstack/react-query';
import { supabase, isDemoMode } from '@/lib/supabase';
import type { AvailableRoomType, AvailabilityQuery, Booking, Room, RoomType, RatePeriod } from '@/types';
import { useRooms } from './useRooms';
import { useBookings } from './useBookings';
import { useRatePeriods } from './useRatePeriods';

// ============================================================
// Hook — computes real-time availability from bookings + rooms
// ============================================================

export function useAvailability(query: AvailabilityQuery | null) {
  const { rooms, roomTypes } = useRooms();
  const { bookings } = useBookings();
  const { ratePeriods } = useRatePeriods();

  return useQuery({
    queryKey: ['availability', query, bookings.map(b => `${b.id}:${b.status}:${b.check_in}:${b.check_out}:${b.room_id}`).join(','), rooms.map(r => `${r.id}:${r.status}`).join(',')],
    queryFn: async (): Promise<AvailableRoomType[]> => {
      if (!query) return [];
      if (isDemoMode) {
        return computeAvailability(query, roomTypes, rooms, bookings, ratePeriods);
      }

      // Look up property by slug
      const { data: property } = await supabase
        .from('properties')
        .select('id')
        .eq('slug', query.property_slug)
        .single();
      if (!property) return [];

      const { data, error } = await supabase.rpc('get_availability', {
        p_property_id: property.id,
        p_check_in: query.check_in,
        p_check_out: query.check_out,
        p_guests: query.guests,
      });
      if (error) throw error;
      return (data ?? []) as AvailableRoomType[];
    },
    enabled: !!query,
    staleTime: 30_000,
  });
}

/** Compute available rooms per type for a given date range from actual booking + room data */
function computeAvailability(
  query: AvailabilityQuery,
  roomTypes: RoomType[],
  rooms: Room[],
  bookings: Booking[],
  ratePeriods: RatePeriod[],
): AvailableRoomType[] {
  const qIn = new Date(query.check_in);
  const qOut = new Date(query.check_out);

  return roomTypes
    .filter(rt => rt.max_occupancy >= query.guests)
    .map(rt => {
      const typeRooms = rooms.filter(r => r.room_type_id === rt.id);
      // Exclude maintenance / blocked rooms
      const sellableRooms = typeRooms.filter(r => r.status !== 'maintenance' && r.status !== 'blocked');

      // Count how many rooms are blocked by active bookings overlapping the requested dates
      const bookedRoomIds = new Set<string>();
      bookings.forEach(b => {
        if (b.room_type_id !== rt.id) return;
        if (b.status === 'cancelled' || b.status === 'no_show' || b.status === 'checked_out') return;
        if (!b.room_id) return;
        const ci = new Date(b.check_in);
        const co = new Date(b.check_out);
        // Overlap check: booking overlaps query if ci < qOut AND co > qIn
        if (ci < qOut && co > qIn) {
          bookedRoomIds.add(b.room_id);
        }
      });

      const totalSellable = sellableRooms.length;
      const booked = sellableRooms.filter(r => bookedRoomIds.has(r.id)).length;
      const available = totalSellable - booked;

      // Use seasonal rate if an active rate period covers the check-in date
      const activePeriod = ratePeriods.find(rp =>
        rp.room_type_id === rt.id && rp.is_active &&
        new Date(rp.start_date) <= qIn && new Date(rp.end_date) >= qIn
      );
      const effectiveRate = activePeriod ? activePeriod.rate : rt.base_rate;

      return {
        room_type_id: rt.id,
        room_type_name: rt.name,
        description: rt.description,
        base_rate: rt.base_rate,
        effective_rate: effectiveRate,
        max_occupancy: rt.max_occupancy,
        amenities: rt.amenities,
        images: rt.images,
        bed_config: rt.bed_config,
        total_rooms: totalSellable,
        booked_rooms: booked,
        available_rooms: Math.max(0, available),
      };
    })
    .filter(rt => rt.available_rooms > 0);
}
