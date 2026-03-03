import type { FC } from 'react';
import { CheckCircle2, Calendar, BedDouble, User, CreditCard } from 'lucide-react';
import { formatCurrency, formatDate, calculateNights } from '@/lib/utils';

interface BookingConfirmationProps {
  confirmationCode: string;
  guestName: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  numGuests: number;
  totalAmount: number;
  propertyName: string;
  propertyPhone?: string;
}

export const BookingConfirmation: FC<BookingConfirmationProps> = ({
  confirmationCode,
  guestName,
  roomType,
  checkIn,
  checkOut,
  numGuests,
  totalAmount,
  propertyName,
  propertyPhone,
}) => {
  const nights = calculateNights(checkIn, checkOut);

  return (
    <div className="max-w-lg mx-auto text-center">
      {/* Success icon */}
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
          <CheckCircle2 size={40} className="text-success" />
        </div>
      </div>

      <h1 className="text-2xl sm:text-3xl font-display text-midnight mb-2">
        Booking Confirmed!
      </h1>
      <p className="text-steel font-body mb-6">
        Thank you, {guestName}. Your reservation at {propertyName} is confirmed.
      </p>

      {/* Confirmation code */}
      <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gold/10 border border-gold/20 mb-6">
        <span className="text-sm text-steel font-body">Confirmation Code:</span>
        <span className="text-xl font-bold text-gold font-body tracking-wider">
          {confirmationCode}
        </span>
      </div>

      {/* Booking details card */}
      <div className="card-light text-left space-y-4 mb-6">
        <div className="flex items-start gap-3">
          <Calendar size={18} className="text-gold mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-midnight font-body">Dates</p>
            <p className="text-sm text-steel font-body">
              {formatDate(checkIn, 'EEEE, dd MMMM yyyy')} → {formatDate(checkOut, 'EEEE, dd MMMM yyyy')}
            </p>
            <p className="text-xs text-steel font-body">{nights} night{nights !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <BedDouble size={18} className="text-gold mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-midnight font-body">Room</p>
            <p className="text-sm text-steel font-body">{roomType}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <User size={18} className="text-gold mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-midnight font-body">Guests</p>
            <p className="text-sm text-steel font-body">{numGuests} guest{numGuests !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="border-t border-cloud pt-3 flex items-start gap-3">
          <CreditCard size={18} className="text-gold mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-midnight font-body">Total Paid</p>
            <p className="text-lg font-bold text-midnight font-body">{formatCurrency(totalAmount)}</p>
          </div>
        </div>
      </div>

      <p className="text-sm text-steel font-body">
        A confirmation email has been sent to your email address.
        {propertyPhone && (
          <>
            {' '}If you have any questions, contact us at{' '}
            <a href={`tel:${propertyPhone}`} className="text-gold hover:text-gold-dark">
              {propertyPhone}
            </a>
          </>
        )}
      </p>
    </div>
  );
};
