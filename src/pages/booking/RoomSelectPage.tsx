import { useParams, useSearchParams } from 'react-router-dom';
import { useAvailability } from '@/hooks/useAvailability';
import { useProperty } from '@/hooks/useProperty';
import { RoomTypeCard } from '@/components/booking/RoomTypeCard';
import { BookingBar } from '@/components/booking/BookingBar';
import { DirectBookingBadge } from '@/components/booking/DirectBookingBadge';
import { PageSpinner } from '@/components/shared/LoadingSpinner';
import { addDays, format } from 'date-fns';

export function RoomSelectPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { property } = useProperty();

  const checkIn = searchParams.get('check_in') || format(new Date(), 'yyyy-MM-dd');
  const checkOut = searchParams.get('check_out') || format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const guests = Number(searchParams.get('guests') || 2);

  const result = useAvailability({
    property_slug: slug || property?.slug || '',
    check_in: checkIn,
    check_out: checkOut,
    guests,
  });

  const availableRoomTypes = result.data ?? [];
  const isLoading = result.isLoading;

  return (
    <div>
      {/* Booking Bar */}
      <div className="bg-cream border-b border-stone/20">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <BookingBar slug={slug || property?.slug || ''} />
        </div>
      </div>

      {/* Room Listing */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display text-midnight mb-1">Choose Your Room</h1>
            <p className="text-sm text-charcoal/60 font-body">
              {format(new Date(checkIn), 'MMM d')} – {format(new Date(checkOut), 'MMM d, yyyy')} · {guests} guest{guests !== 1 ? 's' : ''}
            </p>
          </div>
          <DirectBookingBadge />
        </div>

        {isLoading ? (
          <PageSpinner />
        ) : availableRoomTypes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-charcoal/60 font-body text-lg mb-2">No rooms available</p>
            <p className="text-charcoal/40 font-body text-sm">
              Try different dates or reduce the number of guests
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {availableRoomTypes.map((rt) => (
              <RoomTypeCard
                key={rt.room_type_id}
                room={rt}
                slug={slug || property?.slug || ''}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
