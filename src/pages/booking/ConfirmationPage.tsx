import { useSearchParams } from 'react-router-dom';
import { useBookingProperty } from '@/hooks/useBookingProperty';
import { BookingConfirmation } from '@/components/booking/BookingConfirmation';

export function ConfirmationPage() {
  const [searchParams] = useSearchParams();
  const { property } = useBookingProperty();

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <BookingConfirmation
        confirmationCode={searchParams.get('code') || 'PENDING'}
        guestName={searchParams.get('name') || 'Guest'}
        roomType={searchParams.get('roomType') || 'Room'}
        checkIn={searchParams.get('check_in') || ''}
        checkOut={searchParams.get('check_out') || ''}
        numGuests={Number(searchParams.get('guests') || 2)}
        totalAmount={Number(searchParams.get('total') || 0)}
        propertyName={property?.name || 'Hotel'}
        propertyPhone={property?.contact.phone}
      />
    </div>
  );
}
