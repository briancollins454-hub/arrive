import { useParams, useSearchParams } from 'react-router-dom';
import { useAvailability } from '@/hooks/useAvailability';
import { useBookingProperty } from '@/hooks/useBookingProperty';
import { RoomTypeCard } from '@/components/booking/RoomTypeCard';
import { BookingBar } from '@/components/booking/BookingBar';
import { DirectBookingBadge } from '@/components/booking/DirectBookingBadge';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageLoading } from '@/components/shared/PageLoading';
import { EmptyState } from '@/components/shared/EmptyState';
import { addDays, format } from 'date-fns';
import { BedDouble } from 'lucide-react';

export function RoomSelectPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { property } = useBookingProperty();

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
      <div className="bg-cream border-b border-stone/20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mb-8">
        <BookingBar slug={slug || property?.slug || ''} />
      </div>

      <PageHeader
        variant="light"
        title="Choose Your Room"
        description={`${format(new Date(checkIn), 'MMM d')} – ${format(new Date(checkOut), 'MMM d, yyyy')} · ${guests} guest${guests !== 1 ? 's' : ''}`}
        actions={<DirectBookingBadge />}
      />

      {isLoading ? (
        <PageLoading variant="light" layout="cards" />
      ) : availableRoomTypes.length === 0 ? (
        <EmptyState
          icon={BedDouble}
          title="No rooms available"
          description="Try different dates or reduce the number of guests"
          variant="light"
        />
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
  );
}
