import { useNavigate } from 'react-router-dom';
import { BookingCalendar } from '@/components/dashboard/BookingCalendar';
import { useBookings } from '@/hooks/useBookings';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageLoading } from '@/components/shared/PageLoading';
import { PageShell } from '@/components/shared/PageShell';
import type { Booking } from '@/types';

export function CalendarPage() {
  const navigate = useNavigate();
  const { bookings, isLoading } = useBookings();

  if (isLoading) {
    return (
      <PageShell>
        <PageLoading />
      </PageShell>
    );
  }

  const handleBookingClick = (booking: Booking) => {
    navigate(`/dashboard/bookings/${booking.id}`);
  };

  return (
    <PageShell>
      <PageHeader
        title="Calendar"
        description="Visual overview of all bookings"
        variant="dark"
      />

      <BookingCalendar
        bookings={bookings}
        onBookingClick={handleBookingClick}
      />
    </PageShell>
  );
}
