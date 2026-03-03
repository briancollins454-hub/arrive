import { useState, type FC } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addDays,
  isSameMonth,
  isSameDay,
  isWithinInterval,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { Booking } from '@/types';

interface BookingCalendarProps {
  bookings: Booking[];
  onDateClick?: (date: Date) => void;
  onBookingClick?: (booking: Booking) => void;
}

export const BookingCalendar: FC<BookingCalendarProps> = ({
  bookings,
  onDateClick,
  onBookingClick,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getBookingsForDate = (date: Date) =>
    bookings.filter((b) => {
      const checkIn = new Date(b.check_in);
      const checkOut = new Date(b.check_out);
      return isWithinInterval(date, { start: checkIn, end: addDays(checkOut, -1) })
        && b.status !== 'cancelled' && b.status !== 'no_show';
    });

  const statusColor: Record<string, string> = {
    confirmed: 'bg-teal/20 border-teal text-teal',
    checked_in: 'bg-success/20 border-success text-success',
    pending: 'bg-gold/20 border-gold text-gold',
  };

  return (
    <div className="card-dark">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display text-white">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-1">
          <Button
            variant="ghost-dark"
            size="icon-sm"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="ghost-dark"
            size="icon-sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            <span className="text-xs">Today</span>
          </Button>
          <Button
            variant="ghost-dark"
            size="icon-sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-slate mb-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-steel font-body">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const isToday = isSameDay(d, new Date());
          const outsideMonth = !isSameMonth(d, currentMonth);
          const dayBookings = getBookingsForDate(d);

          return (
            <div
              key={i}
              onClick={() => onDateClick?.(d)}
              className={cn(
                'min-h-[80px] border-b border-r border-slate/50 p-1 cursor-pointer transition-colors hover:bg-slate/30',
                outsideMonth && 'opacity-30',
              )}
            >
              <span className={cn(
                'inline-flex items-center justify-center w-6 h-6 text-xs font-body rounded-full',
                isToday ? 'bg-gold text-midnight font-bold' : 'text-silver'
              )}>
                {format(d, 'd')}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {dayBookings.slice(0, 3).map((b) => (
                  <button
                    key={b.id}
                    onClick={(e) => { e.stopPropagation(); onBookingClick?.(b); }}
                    className={cn(
                      'w-full text-left text-[10px] px-1 py-0.5 rounded border-l-2 truncate font-body',
                      statusColor[b.status] ?? 'bg-slate/20 border-steel text-silver'
                    )}
                  >
                    {b.guest?.first_name ?? 'Guest'} {b.guest?.last_name?.charAt(0) ?? ''}.
                  </button>
                ))}
                {dayBookings.length > 3 && (
                  <span className="text-[10px] text-steel font-body pl-1">
                    +{dayBookings.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
