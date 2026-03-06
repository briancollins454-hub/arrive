import { useState, useRef, useEffect, type FC } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfQuarter,
  endOfQuarter,
  addDays,
  isSameDay,
  isSameMonth,
  isBefore,
  isAfter,
} from 'date-fns';
import { cn } from '@/lib/utils';

// ============================================================
// Types
// ============================================================

export type PresetPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
  period: PresetPeriod;
}

interface DashboardDatePickerProps {
  /** Available preset periods to show (default: all) */
  presets?: PresetPeriod[];
  /** Currently selected range */
  value: DateRange;
  /** Called when user selects a new range */
  onChange: (range: DateRange) => void;
  /** Visual variant */
  variant?: 'dark' | 'light';
  /** Additional className */
  className?: string;
}

// ============================================================
// Helpers
// ============================================================

export function getPresetRange(period: Exclude<PresetPeriod, 'custom'>): DateRange {
  const now = new Date();
  switch (period) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now), label: 'Today', period };
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }), label: 'This Week', period };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now), label: 'This Month', period };
    case 'quarter':
      return { start: startOfQuarter(now), end: endOfQuarter(now), label: 'This Quarter', period };
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now), label: 'This Year', period };
  }
}

const PRESET_LABELS: Record<PresetPeriod, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  quarter: 'This Quarter',
  year: 'This Year',
  custom: 'Custom',
};

const DEFAULT_PRESETS: PresetPeriod[] = ['today', 'week', 'month', 'year'];

// ============================================================
// Component
// ============================================================

export const DashboardDatePicker: FC<DashboardDatePickerProps> = ({
  presets = DEFAULT_PRESETS,
  value,
  onChange,
  variant = 'dark',
  className,
}) => {
  const isDark = variant === 'dark';
  const [showCalendar, setShowCalendar] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date());
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');
  const [tempStart, setTempStart] = useState<Date | null>(null);
  const calRef = useRef<HTMLDivElement>(null);

  // Close calendar on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) {
        setShowCalendar(false);
      }
    };
    if (showCalendar) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCalendar]);

  // Build calendar grid
  const monthStart = startOfMonth(calMonth);
  const monthEnd = endOfMonth(calMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) { days.push(d); d = addDays(d, 1); }

  const handlePreset = (p: PresetPeriod) => {
    if (p === 'custom') {
      setTempStart(null);
      setSelecting('start');
      setCalMonth(value.start);
      setShowCalendar(true);
    } else {
      onChange(getPresetRange(p));
      setShowCalendar(false);
    }
  };

  const handleDayClick = (day: Date) => {
    if (selecting === 'start') {
      setTempStart(day);
      setSelecting('end');
    } else {
      if (tempStart && isBefore(day, tempStart)) {
        // Clicked before start — reset start
        setTempStart(day);
        setSelecting('end');
      } else {
        const s = tempStart ?? day;
        onChange({
          start: startOfDay(s),
          end: endOfDay(day),
          label: `${format(s, 'dd MMM')} — ${format(day, 'dd MMM yyyy')}`,
          period: 'custom',
        });
        setSelecting('start');
        setTempStart(null);
        setShowCalendar(false);
      }
    }
  };

  const isInRange = (day: Date) => {
    if (tempStart && selecting === 'end') return false; // selecting second date
    return isAfter(day, value.start) && isBefore(day, value.end);
  };

  const isSelected = (day: Date) => {
    if (tempStart && selecting === 'end') return isSameDay(day, tempStart);
    return isSameDay(day, value.start) || isSameDay(day, value.end);
  };

  // Ensure "custom" is always in the list if not already
  const allPresets = presets.includes('custom') ? presets : [...presets, 'custom'] as PresetPeriod[];

  return (
    <div className={cn('flex items-center gap-1.5 flex-wrap', className)} ref={calRef}>
      {/* Preset buttons */}
      {allPresets.map(p => (
        <button
          key={p}
          onClick={() => handlePreset(p)}
          className={cn(
            'px-2.5 py-1.5 rounded-lg text-[11px] font-body font-semibold border transition-all',
            p === value.period
              ? isDark
                ? 'bg-gold/15 border-gold/25 text-gold'
                : 'bg-teal/10 border-teal/25 text-teal-dark'
              : isDark
                ? 'text-steel hover:text-silver bg-white/[0.03] border-white/[0.06] hover:border-white/15'
                : 'text-charcoal/60 hover:text-charcoal bg-white border-charcoal/10 hover:border-charcoal/20',
          )}
        >
          {p === 'custom' ? (
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {value.period === 'custom' ? value.label : 'Custom'}
            </span>
          ) : (
            PRESET_LABELS[p]
          )}
        </button>
      ))}

      {/* Calendar dropdown */}
      {showCalendar && (
        <div className={cn(
          'absolute top-full mt-2 z-50 p-4 rounded-xl shadow-xl animate-fade-in w-[300px]',
          isDark
            ? 'bg-[#0f1724] border border-white/10'
            : 'bg-white border border-charcoal/10 shadow-lg',
        )} style={{ right: 0 }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setCalMonth(subMonths(calMonth, 1))}
              className={cn('p-1 rounded-lg transition-all', isDark ? 'hover:bg-white/10 text-steel' : 'hover:bg-charcoal/5 text-charcoal/50')}
            >
              <ChevronLeft size={16} />
            </button>
            <span className={cn('text-sm font-body font-semibold', isDark ? 'text-white' : 'text-midnight')}>
              {format(calMonth, 'MMMM yyyy')}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCalMonth(addMonths(calMonth, 1))}
                className={cn('p-1 rounded-lg transition-all', isDark ? 'hover:bg-white/10 text-steel' : 'hover:bg-charcoal/5 text-charcoal/50')}
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setShowCalendar(false)}
                className={cn('p-1 rounded-lg transition-all', isDark ? 'hover:bg-white/10 text-steel' : 'hover:bg-charcoal/5 text-charcoal/50')}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Selection hint */}
          <p className={cn('text-[10px] font-body mb-2', isDark ? 'text-steel' : 'text-charcoal/50')}>
            {selecting === 'start'
              ? 'Select start date'
              : `Start: ${tempStart ? format(tempStart, 'dd MMM') : '—'} · Select end date`}
          </p>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0 mb-1">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(dh => (
              <div key={dh} className={cn('text-center text-[10px] font-semibold py-1 font-body', isDark ? 'text-steel' : 'text-charcoal/40')}>
                {dh}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0">
            {days.map((day, i) => {
              const outsideMonth = !isSameMonth(day, calMonth);
              const selected = isSelected(day);
              const inRange = isInRange(day);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={i}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    'h-8 text-xs font-body rounded-md transition-all relative',
                    outsideMonth && 'opacity-30',
                    !selected && !inRange && (isDark ? 'hover:bg-white/10 text-silver' : 'hover:bg-charcoal/5 text-midnight'),
                    inRange && 'bg-gold/10 text-gold',
                    selected && 'bg-gold text-midnight font-bold',
                    isToday && !selected && !inRange && 'ring-1 ring-gold/40',
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
            <button
              onClick={() => {
                const today = new Date();
                onChange({
                  start: startOfDay(today),
                  end: endOfDay(today),
                  label: 'Today',
                  period: 'today',
                });
                setShowCalendar(false);
              }}
              className={cn('px-2 py-1 rounded text-[10px] font-body', isDark ? 'text-steel hover:text-silver hover:bg-white/5' : 'text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5')}
            >
              Today
            </button>
            <button
              onClick={() => {
                onChange(getPresetRange('week'));
                setShowCalendar(false);
              }}
              className={cn('px-2 py-1 rounded text-[10px] font-body', isDark ? 'text-steel hover:text-silver hover:bg-white/5' : 'text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5')}
            >
              This Week
            </button>
            <button
              onClick={() => {
                onChange(getPresetRange('month'));
                setShowCalendar(false);
              }}
              className={cn('px-2 py-1 rounded text-[10px] font-body', isDark ? 'text-steel hover:text-silver hover:bg-white/5' : 'text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5')}
            >
              This Month
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
