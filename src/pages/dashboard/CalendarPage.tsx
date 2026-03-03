import { useNavigate } from 'react-router-dom';
import { BookingCalendar } from '@/components/dashboard/BookingCalendar';
import { useBookings } from '@/hooks/useBookings';
import { PageSpinner } from '@/components/shared/LoadingSpinner';
import type { Booking } from '@/types';

export function CalendarPage() {
  const navigate = useNavigate();
  const { bookings, isLoading } = useBookings();

  if (isLoading) return <PageSpinner />;

  const handleBookingClick = (booking: Booking) => {
    navigate(`/dashboard/bookings/${booking.id}`);
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-display text-white mb-1.5 tracking-tight">Calendar</h1>
        <p className="text-sm text-steel font-body">Visual overview of all bookings</p>
      </div>

      <BookingCalendar
        bookings={bookings}
        onBookingClick={handleBookingClick}
      />
    </div>
  );
}
