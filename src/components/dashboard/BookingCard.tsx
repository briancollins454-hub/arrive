import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, BedDouble, LogIn, LogOut, Check, RotateCcw } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { getSourceLabel } from '@/lib/constants';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { Booking, Room } from '@/types';

interface BookingCardProps {
  booking: Booking;
  onSelect?: (id: string) => void;
  assignedRoom?: Room;
  /** Quick check-in — shown on arrivals view */
  onCheckIn?: (bookingId: string) => void;
  /** Quick check-out — shown on departures view */
  onCheckOut?: (bookingId: string) => void;
}

export const BookingCard: FC<BookingCardProps> = ({ booking, onSelect, assignedRoom, onCheckIn, onCheckOut }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onSelect) {
      onSelect(booking.id);
    } else {
      navigate(`/dashboard/bookings/${booking.id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'card-dark cursor-pointer transition-all duration-300 group',
        'hover:border-gold/20 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3),0_0_0_1px_rgba(201,168,76,0.1)]',
        'hover:-translate-y-0.5'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white font-body group-hover:text-gold/90 transition-colors duration-300 truncate">
            {booking.guest?.first_name} {booking.guest?.last_name}
          </h3>
          <p className="text-[11px] text-steel font-body mt-0.5 tracking-wide truncate">
            {booking.confirmation_code}
          </p>
        </div>
        <StatusBadge status={booking.status} className="shrink-0" />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-silver font-body">
          <Calendar size={12} className="text-steel" />
          <span>
            {formatDate(booking.check_in, 'dd MMM')} → {formatDate(booking.check_out, 'dd MMM yyyy')}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-silver font-body">
          <User size={12} className="text-steel" />
          <span>
            {booking.room_type?.name ?? 'Room'} · {booking.num_guests} guest{booking.num_guests !== 1 ? 's' : ''}
          </span>
        </div>
        {assignedRoom && (
          <div className="flex items-center gap-2 text-xs text-teal font-body">
            <BedDouble size={12} className="text-teal/70" />
            <span>Room {assignedRoom.room_number} · Floor {assignedRoom.floor ?? '—'}</span>
          </div>
        )}
        {!assignedRoom && booking.room_id && (
          <div className="flex items-center gap-2 text-xs text-steel/60 font-body">
            <BedDouble size={12} className="text-steel/40" />
            <span>Room assigned</span>
          </div>
        )}
        {!assignedRoom && !booking.room_id && (booking.status === 'confirmed' || booking.status === 'pending') && (
          <div className="flex items-center gap-2 text-xs text-amber-400/80 font-body">
            <BedDouble size={12} className="text-amber-400/60" />
            <span>No room assigned</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate">
        <span className="text-xs text-steel font-body">
          {getSourceLabel(booking.source)}
        </span>
        <span className="text-sm font-bold text-gold font-body">
          {formatCurrency(booking.total_amount)}
        </span>
      </div>

      {/* Quick action buttons for Arrivals / Departures views */}
      {onCheckIn && (booking.status === 'confirmed' || booking.status === 'pending') && (
        <button
          onClick={(e) => { e.stopPropagation(); if (booking.status === 'checked_in') return; onCheckIn(booking.id); }}
          className="w-full mt-3 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-body font-semibold transition-all duration-200 bg-teal/15 text-teal hover:bg-teal/25 border border-teal/20 hover:border-teal/40"
        >
          <LogIn size={14} />
          Quick Check-In
        </button>
      )}
      {onCheckIn && booking.status === 'checked_in' && (
        <div className="w-full mt-3 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-body font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Check size={14} />
          Checked In
        </div>
      )}
      {onCheckIn && !onCheckOut && booking.status === 'checked_out' && (
        <button
          onClick={(e) => { e.stopPropagation(); if (!window.confirm('Are you sure you want to undo this check-out and re-check in the guest?')) return; onCheckIn(booking.id); }}
          className="w-full mt-3 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-body font-semibold transition-all duration-200 bg-amber-400/15 text-amber-400 hover:bg-amber-400/25 border border-amber-400/20 hover:border-amber-400/40"
        >
          <RotateCcw size={14} />
          Undo Check-Out · Re-Check In
        </button>
      )}
      {onCheckOut && booking.status === 'checked_in' && (
        <button
          onClick={(e) => { e.stopPropagation(); onCheckOut(booking.id); }}
          className="w-full mt-3 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-body font-semibold transition-all duration-200 bg-orange-400/15 text-orange-400 hover:bg-orange-400/25 border border-orange-400/20 hover:border-orange-400/40"
        >
          <LogOut size={14} />
          Quick Check-Out
        </button>
      )}
      {onCheckOut && booking.status === 'checked_out' && (
        <div className="flex gap-2 mt-3">
          <div className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-body font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Check size={14} />
            Checked Out
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); if (!window.confirm('Are you sure you want to undo this check-out?')) return; onCheckIn?.(booking.id); }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-body font-semibold transition-all duration-200 bg-amber-400/15 text-amber-400 hover:bg-amber-400/25 border border-amber-400/20 hover:border-amber-400/40"
            title="Undo check-out"
          >
            <RotateCcw size={13} />
            Undo
          </button>
        </div>
      )}
    </div>
  );
};
