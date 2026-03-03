import { useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar, Users, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface BookingBarProps {
  slug: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
  className?: string;
}

export const BookingBar: FC<BookingBarProps> = ({
  slug,
  initialCheckIn,
  initialCheckOut,
  initialGuests = 2,
  className,
}) => {
  const navigate = useNavigate();
  const [checkIn, setCheckIn] = useState(initialCheckIn ?? format(new Date(), 'yyyy-MM-dd'));
  const [checkOut, setCheckOut] = useState(initialCheckOut ?? '');
  const [guests, setGuests] = useState(initialGuests);

  const handleSearch = () => {
    if (!checkIn || !checkOut) return;
    if (new Date(checkOut) <= new Date(checkIn)) {
      toast.error('Check-out must be after check-in');
      return;
    }
    const params = new URLSearchParams({
      check_in: checkIn,
      check_out: checkOut,
      guests: guests.toString(),
    });
    navigate(`/book/${slug}/rooms?${params.toString()}`);
  };

  return (
    <div className={cn(
      'bg-white rounded-xl shadow-booking border border-cloud p-4 sm:p-6',
      className
    )}>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-end">
        {/* Check-in */}
        <div className="flex-1 w-full">
          <label htmlFor="booking-check-in" className="flex items-center gap-1.5 text-xs font-semibold text-steel font-body uppercase tracking-wider mb-1.5">
            <Calendar size={12} />
            Check-in
          </label>
          <input
            id="booking-check-in"
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="input"
          />
        </div>

        {/* Check-out */}
        <div className="flex-1 w-full">
          <label htmlFor="booking-check-out" className="flex items-center gap-1.5 text-xs font-semibold text-steel font-body uppercase tracking-wider mb-1.5">
            <Calendar size={12} />
            Check-out
          </label>
          <input
            id="booking-check-out"
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            min={checkIn}
            className="input"
          />
        </div>

        {/* Guests */}
        <div className="w-full sm:w-28">
          <label htmlFor="booking-guests" className="flex items-center gap-1.5 text-xs font-semibold text-steel font-body uppercase tracking-wider mb-1.5">
            <Users size={12} />
            Guests
          </label>
          <input
            id="booking-guests"
            type="number"
            min={1}
            max={10}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="input"
          />
        </div>

        {/* Search */}
        <Button
          onClick={handleSearch}
          className="w-full sm:w-auto"
          disabled={!checkIn || !checkOut}
        >
          <Search size={16} className="mr-2" />
          Search
        </Button>
      </div>
    </div>
  );
};
