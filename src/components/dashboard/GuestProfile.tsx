import type { FC } from 'react';
import { Mail, Phone, Tag, Calendar, PoundSterling, Clock, BedDouble, Star, TrendingUp } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { differenceInDays } from 'date-fns';
import type { Guest, Booking } from '@/types';

interface GuestProfileProps {
  guest: Guest;
  bookings?: Booking[];
}

export const GuestProfile: FC<GuestProfileProps> = ({ guest, bookings = [] }) => {
  const initials = `${guest.first_name.charAt(0)}${guest.last_name.charAt(0)}`;

  // Sort bookings newest first
  const sortedBookings = [...bookings].sort(
    (a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime(),
  );

  // Calculate lifetime stats
  const totalNights = bookings.reduce(
    (sum, b) => sum + Math.max(1, differenceInDays(new Date(b.check_out), new Date(b.check_in))),
    0,
  );
  const avgRate =
    bookings.length > 0
      ? bookings.reduce((sum, b) => sum + b.nightly_rate, 0) / bookings.length
      : 0;
  const roomTypes = Array.from(new Set(bookings.map((b) => b.room_type?.name).filter(Boolean)));

  const statusColors: Record<string, string> = {
    confirmed: 'text-blue-400 bg-blue-400/10',
    checked_in: 'text-emerald-400 bg-emerald-400/10',
    checked_out: 'text-silver bg-white/[0.05]',
    cancelled: 'text-red-400 bg-red-400/10',
    no_show: 'text-amber-400 bg-amber-400/10',
    pending: 'text-steel bg-white/[0.05]',
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-midnight text-lg font-bold font-display shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-display text-white">
            {guest.first_name} {guest.last_name}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            {guest.nationality && (
              <span className="text-xs text-steel font-body">{guest.nationality}</span>
            )}
            {guest.tags.map((tag) => (
              <Badge key={tag} variant="gold" className="text-[10px]">
                <Tag size={10} className="mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Contact info */}
      <div className="card-dark space-y-3">
        {guest.email && (
          <div className="flex items-center gap-3 text-sm font-body">
            <Mail size={14} className="text-steel" />
            <a href={`mailto:${guest.email}`} className="text-gold hover:text-gold-light transition-colors">
              {guest.email}
            </a>
          </div>
        )}
        {guest.phone && (
          <div className="flex items-center gap-3 text-sm font-body">
            <Phone size={14} className="text-steel" />
            <span className="text-silver">{guest.phone}</span>
          </div>
        )}
      </div>

      {/* Enhanced Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-dark text-center">
          <Calendar size={16} className="text-steel mx-auto mb-1" />
          <p className="text-xl font-bold text-white font-body">{guest.total_stays}</p>
          <p className="text-[11px] text-steel font-body">Total Stays</p>
        </div>
        <div className="card-dark text-center">
          <PoundSterling size={16} className="text-steel mx-auto mb-1" />
          <p className="text-xl font-bold text-gold font-body">{formatCurrency(guest.total_spend)}</p>
          <p className="text-[11px] text-steel font-body">Total Spend</p>
        </div>
        <div className="card-dark text-center">
          <Clock size={16} className="text-steel mx-auto mb-1" />
          <p className="text-xl font-bold text-white font-body">{totalNights}</p>
          <p className="text-[11px] text-steel font-body">Total Nights</p>
        </div>
        <div className="card-dark text-center">
          <TrendingUp size={16} className="text-steel mx-auto mb-1" />
          <p className="text-xl font-bold text-teal font-body">{formatCurrency(avgRate)}</p>
          <p className="text-[11px] text-steel font-body">Avg. Rate</p>
        </div>
      </div>

      {/* Favourite Room Types */}
      {roomTypes.length > 0 && (
        <div className="card-dark">
          <h3 className="text-sm font-semibold text-white font-body mb-2 flex items-center gap-2">
            <Star size={14} className="text-gold" /> Preferred Room Types
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {roomTypes.map((rt) => (
              <span key={rt} className="text-[11px] font-body font-medium px-2 py-1 rounded-lg bg-gold/10 text-gold border border-gold/10">
                {rt}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Preferences */}
      {guest.preferences && Object.keys(guest.preferences).some((k) => guest.preferences[k as keyof typeof guest.preferences]) && (
        <div className="card-dark">
          <h3 className="text-sm font-semibold text-white font-body mb-2">Preferences</h3>
          <div className="space-y-1.5">
            {guest.preferences.dietary && (
              <p className="text-xs text-silver font-body">
                <span className="text-steel">Dietary:</span> {guest.preferences.dietary}
              </p>
            )}
            {guest.preferences.room_pref && (
              <p className="text-xs text-silver font-body">
                <span className="text-steel">Room:</span> {guest.preferences.room_pref}
              </p>
            )}
            {guest.preferences.allergies && (
              <p className="text-xs text-silver font-body">
                <span className="text-steel">Allergies:</span> {guest.preferences.allergies}
              </p>
            )}
            {guest.preferences.notes && (
              <p className="text-xs text-silver font-body">
                <span className="text-steel">Notes:</span> {guest.preferences.notes}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Stay History Timeline */}
      {sortedBookings.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white font-body mb-3 flex items-center gap-2">
            <Clock size={14} className="text-teal" /> Stay History
          </h3>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-gold/40 via-teal/30 to-transparent" />

            <div className="space-y-3">
              {sortedBookings.map((b, i) => {
                const nights = Math.max(
                  1,
                  differenceInDays(new Date(b.check_out), new Date(b.check_in)),
                );
                const statusLabel = b.status.replace('_', ' ');

                return (
                  <div key={b.id} className="relative flex gap-3 pl-1">
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        'w-[10px] h-[10px] rounded-full mt-1.5 shrink-0 ring-2 ring-midnight z-10',
                        i === 0 ? 'bg-gold' : 'bg-steel/50',
                      )}
                    />

                    <div className="card-dark flex-1 !p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <p className="text-sm text-white font-body font-medium truncate">
                            {b.room_type?.name ?? 'Room'}
                          </p>
                          <p className="text-[11px] text-steel font-body">
                            {formatDate(b.check_in, 'dd MMM yyyy')} → {formatDate(b.check_out, 'dd MMM yyyy')}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'text-[10px] font-body font-semibold px-2 py-0.5 rounded-full capitalize shrink-0',
                            statusColors[b.status] ?? 'text-steel bg-white/[0.05]',
                          )}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-steel font-body">
                        <span className="flex items-center gap-1">
                          <BedDouble size={11} /> {nights} night{nights !== 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <PoundSterling size={11} /> {formatCurrency(b.nightly_rate)}/night
                        </span>
                        <span className="text-gold font-semibold ml-auto">
                          {formatCurrency(b.total_amount)}
                        </span>
                      </div>
                      {b.confirmation_code && (
                        <p className="text-[10px] text-steel/60 font-body mt-1">
                          Ref: {b.confirmation_code}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
