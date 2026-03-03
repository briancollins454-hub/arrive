import { useState, type FC } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isBefore,
  isAfter,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onRangeChange: (start: Date | null, end: Date | null) => void;
  minDate?: Date;
  variant?: 'light' | 'dark';
  className?: string;
}

export const DateRangePicker: FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onRangeChange,
  minDate = new Date(),
  variant = 'light',
  className,
}) => {
  const [currentMonth, setCurrentMonth] = useState(startDate ?? new Date());
  const [isOpen, setIsOpen] = useState(false);
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');

  const isDark = variant === 'dark';

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

  const handleDayClick = (d: Date) => {
    if (isBefore(d, minDate)) return;

    if (selecting === 'start') {
      onRangeChange(d, null);
      setSelecting('end');
    } else {
      if (startDate && isBefore(d, startDate)) {
        onRangeChange(d, null);
        setSelecting('end');
      } else {
        onRangeChange(startDate, d);
        setSelecting('start');
        setIsOpen(false);
      }
    }
  };

  const isInRange = (d: Date) => {
    if (!startDate || !endDate) return false;
    return isAfter(d, startDate) && isBefore(d, endDate);
  };

  const displayValue = startDate
    ? `${format(startDate, 'dd MMM yyyy')}${endDate ? ` → ${format(endDate, 'dd MMM yyyy')}` : ' → Select'}`
    : 'Select dates';

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-body transition-all',
          isDark
            ? 'border border-slate bg-midnight text-silver hover:border-steel'
            : 'border border-cloud bg-white text-midnight hover:border-mist'
        )}
      >
        <Calendar size={14} className="text-gold" />
        <span>{displayValue}</span>
      </button>

      {isOpen && (
        <div className={cn(
          'absolute top-full mt-2 left-0 z-50 p-4 rounded-xl shadow-booking animate-fade-in w-[320px]',
          isDark ? 'bg-charcoal border border-slate' : 'bg-white border border-cloud'
        )}>
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost-dark"
              size="icon-sm"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className={cn('text-sm font-semibold font-body', isDark ? 'text-white' : 'text-midnight')}>
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button
              variant="ghost-dark"
              size="icon-sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight size={16} />
            </Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0 mb-1">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-steel font-body py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-0">
            {days.map((d, i) => {
              const disabled = isBefore(d, minDate);
              const isStart = startDate && isSameDay(d, startDate);
              const isEnd = endDate && isSameDay(d, endDate);
              const inRange = isInRange(d);
              const outsideMonth = !isSameMonth(d, currentMonth);

              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleDayClick(d)}
                  className={cn(
                    'h-9 text-xs font-body rounded-md transition-all',
                    disabled && 'opacity-30 cursor-not-allowed',
                    outsideMonth && 'opacity-30',
                    !disabled && !isStart && !isEnd && !inRange && (isDark ? 'hover:bg-slate text-silver' : 'hover:bg-snow text-midnight'),
                    inRange && 'bg-gold/10 text-gold',
                    (isStart || isEnd) && 'bg-gold text-midnight font-bold',
                  )}
                >
                  {format(d, 'd')}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
