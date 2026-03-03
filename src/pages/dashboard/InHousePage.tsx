import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookings } from '@/hooks/useBookings';
import { useRooms } from '@/hooks/useRooms';
import { getFolioBalance } from '@/hooks/useFolios';
import { PageSpinner } from '@/components/shared/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  BedDouble, User, Calendar, Search,
  Phone, Mail, LogOut,
  Star, AlertTriangle, MoreVertical, XCircle, ExternalLink,
} from 'lucide-react';
import { format, differenceInDays, isSameDay } from 'date-fns';
import { cn, formatCurrency } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export function InHousePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { bookings, isLoading, updateStatus } = useBookings();
  const { rooms, roomTypes, isLoadingRooms } = useRooms();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'room' | 'guest' | 'checkout'>('room');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Build lookup maps (must be before early return — Rules of Hooks)
  const roomMap = useMemo(() => {
    const m: Record<string, (typeof rooms)[number]> = {};
    for (const r of rooms) m[r.id] = r;
    return m;
  }, [rooms]);

  const roomTypeMap = useMemo(() => {
    const m: Record<string, (typeof roomTypes)[number]> = {};
    for (const rt of roomTypes) m[rt.id] = rt;
    return m;
  }, [roomTypes]);

  if (isLoading || isLoadingRooms) return <PageSpinner />;

  const today = new Date();

  // All in-house bookings (checked_in status)
  const inHouse = bookings.filter((b) => b.status === 'checked_in');

  // Filter by search
  const filtered = inHouse.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const guestName = `${b.guest?.first_name ?? ''} ${b.guest?.last_name ?? ''}`.toLowerCase();
    const roomNum = b.room_id ? roomMap[b.room_id]?.room_number ?? '' : '';
    return (
      guestName.includes(q) ||
      roomNum.includes(q) ||
      b.confirmation_code.toLowerCase().includes(q)
    );
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'room') {
      const rA = a.room_id ? roomMap[a.room_id]?.room_number ?? '' : '';
      const rB = b.room_id ? roomMap[b.room_id]?.room_number ?? '' : '';
      return rA.localeCompare(rB, undefined, { numeric: true });
    }
    if (sortBy === 'guest') {
      const nA = `${a.guest?.last_name ?? ''} ${a.guest?.first_name ?? ''}`;
      const nB = `${b.guest?.last_name ?? ''} ${b.guest?.first_name ?? ''}`;
      return nA.localeCompare(nB);
    }
    // checkout
    return new Date(a.check_out).getTime() - new Date(b.check_out).getTime();
  });

  // Stats
  const departingToday = inHouse.filter((b) => isSameDay(new Date(b.check_out), today)).length;
  const totalGuests = inHouse.reduce((sum, b) => sum + b.num_guests, 0);
  const occupiedRooms = new Set(inHouse.map((b) => b.room_id).filter(Boolean)).size;
  const totalRooms = rooms.filter(r => r.status !== 'maintenance' && r.status !== 'blocked').length;
  const occupancyPct = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-white mb-1.5 tracking-tight">In-House</h1>
          <p className="text-sm text-steel font-body">
            Currently occupied rooms & guests in residence
          </p>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card variant="dark">
          <CardContent className="p-4">
            <p className="text-xs text-steel font-body mb-1">Rooms Occupied</p>
            <p className="text-2xl font-display text-white">{occupiedRooms}<span className="text-sm text-steel">/{totalRooms}</span></p>
          </CardContent>
        </Card>
        <Card variant="dark">
          <CardContent className="p-4">
            <p className="text-xs text-steel font-body mb-1">Occupancy</p>
            <p className="text-2xl font-display text-teal">{occupancyPct}%</p>
          </CardContent>
        </Card>
        <Card variant="dark">
          <CardContent className="p-4">
            <p className="text-xs text-steel font-body mb-1">Guests In-House</p>
            <p className="text-2xl font-display text-white">{totalGuests}</p>
          </CardContent>
        </Card>
        <Card variant="dark">
          <CardContent className="p-4">
            <p className="text-xs text-steel font-body mb-1">Departing Today</p>
            <p className={cn('text-2xl font-display', departingToday > 0 ? 'text-orange-400' : 'text-emerald-400')}>{departingToday}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & sort bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel" />
          <input
            type="text"
            placeholder="Search by guest, room, or booking ref…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-charcoal border border-white/[0.06] placeholder:text-white/20 placeholder:italic"
          />
        </div>
        <div className="flex bg-white/[0.04] border border-white/[0.08] rounded-lg p-0.5">
          {(
            [
              { key: 'room', label: 'Room №' },
              { key: 'guest', label: 'Guest' },
              { key: 'checkout', label: 'Check-Out' },
            ] as const
          ).map((s) => (
            <button
              key={s.key}
              onClick={() => setSortBy(s.key)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-body transition-all duration-200',
                sortBy === s.key ? 'bg-white/[0.1] text-white font-semibold' : 'text-steel hover:text-silver'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-steel font-body ml-auto">
          {sorted.length} room{sorted.length !== 1 ? 's' : ''} occupied
        </span>
      </div>

      {/* In-house list */}
      {sorted.length === 0 ? (
        <Card variant="dark">
          <CardContent className="p-12 text-center">
            <BedDouble size={40} className="mx-auto mb-3 text-steel/30" />
            <p className="text-white font-display mb-1">No guests in-house</p>
            <p className="text-sm text-steel font-body">All rooms are currently vacant</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sorted.map((booking) => {
            const room = booking.room_id ? roomMap[booking.room_id] : null;
            const rt = roomTypeMap[booking.room_type_id];
            const guest = booking.guest;
            const nights = differenceInDays(new Date(booking.check_out), new Date(booking.check_in));
            const nightsStayed = differenceInDays(today, new Date(booking.check_in));
            const nightsLeft = Math.max(0, differenceInDays(new Date(booking.check_out), today));
            const isDepartingToday = isSameDay(new Date(booking.check_out), today);
            const isOverdue = !isDepartingToday && differenceInDays(new Date(booking.check_out), today) < 0;
            const isVIP = guest?.tags?.includes('VIP');

            return (
              <Card
                key={booking.id}
                variant="dark"
                className={cn(
                  'cursor-pointer transition-all duration-200 hover:border-white/[0.12]',
                  isDepartingToday && 'border-orange-400/20',
                  isOverdue && 'border-red-400/20'
                )}
                onClick={() => navigate(`/dashboard/bookings/${booking.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Room badge */}
                    <div className={cn(
                      'w-16 h-16 rounded-xl flex flex-col items-center justify-center shrink-0 border',
                      isDepartingToday
                        ? 'bg-orange-400/10 border-orange-400/20'
                        : 'bg-teal/10 border-teal/20'
                    )}>
                      <span className={cn(
                        'text-lg font-display font-bold',
                        isDepartingToday ? 'text-orange-400' : 'text-teal'
                      )}>
                        {room?.room_number ?? '—'}
                      </span>
                      <span className="text-[10px] text-steel font-body">
                        {room ? `Floor ${room.floor ?? '—'}` : 'Unassigned'}
                      </span>
                    </div>

                    {/* Guest info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-display font-semibold text-white truncate">
                          {guest?.first_name} {guest?.last_name}
                        </h3>
                        {isVIP && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-gold bg-gold/10 px-1.5 py-0.5 rounded-full">
                            <Star size={9} /> VIP
                          </span>
                        )}
                        {isDepartingToday && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded-full">
                            <AlertTriangle size={9} /> Departing
                          </span>
                        )}
                        {isOverdue && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-full">
                            <AlertTriangle size={9} /> OVERDUE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-steel font-body">
                        <span className="flex items-center gap-1">
                          <BedDouble size={11} />
                          {rt?.name ?? 'Room'}
                        </span>
                        <span className="flex items-center gap-1">
                          <User size={11} />
                          {booking.num_guests} guest{booking.num_guests !== 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          Night {nightsStayed}/{nights}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-steel/70 font-body">
                        <span>
                          {format(new Date(booking.check_in), 'dd MMM')} → {format(new Date(booking.check_out), 'dd MMM')}
                        </span>
                        {nightsLeft > 0 && !isDepartingToday && (
                          <span className="text-teal/70">{nightsLeft} night{nightsLeft !== 1 ? 's' : ''} remaining</span>
                        )}
                        {isDepartingToday && (
                          <span className="text-orange-400/80">Check-out today</span>
                        )}
                        {isOverdue && (
                          <span className="text-red-400/80">Overdue — was due {format(new Date(booking.check_out), 'dd MMM')}</span>
                        )}
                      </div>
                    </div>

                    {/* Contact shortcuts & actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {guest?.phone && (
                        <button
                          onClick={(e) => { e.stopPropagation(); window.open(`tel:${guest.phone}`); }}
                          className="p-2 rounded-lg hover:bg-white/[0.06] text-steel hover:text-silver transition-colors"
                          title={guest.phone}
                        >
                          <Phone size={14} />
                        </button>
                      )}
                      {guest?.email && (
                        <button
                          onClick={(e) => { e.stopPropagation(); window.open(`mailto:${guest.email}`); }}
                          className="p-2 rounded-lg hover:bg-white/[0.06] text-steel hover:text-silver transition-colors"
                          title={guest.email}
                        >
                          <Mail size={14} />
                        </button>
                      )}
                      {isDepartingToday && (
                        <Button
                          variant="ghost-dark"
                          size="sm"
                          className="text-orange-400 hover:bg-orange-400/10 border border-orange-400/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            const bal = getFolioBalance(queryClient, booking.id);
                            if (bal > 0.01) {
                              toast.error(`Outstanding balance of £${bal.toFixed(2)} — settle folio before checkout`);
                              navigate(`/dashboard/bookings/${booking.id}`);
                              return;
                            }
                            updateStatus.mutate({ bookingId: booking.id, status: 'checked_out' });
                          }}
                        >
                          <LogOut size={13} className="mr-1.5" />
                          Check Out
                        </Button>
                      )}
                      <div className="text-right ml-2">
                        <p className="text-sm font-display font-bold text-gold">{formatCurrency(booking.nightly_rate)}</p>
                        <p className="text-[10px] text-steel font-body">/night</p>
                      </div>

                      {/* Actions menu */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === booking.id ? null : booking.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-white/[0.06] text-steel hover:text-silver transition-colors"
                        >
                          <MoreVertical size={15} />
                        </button>

                        {openMenuId === booking.id && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }} />
                            <div className="absolute right-0 top-full mt-1 z-40 w-44 rounded-xl bg-[#0f1724] border border-white/[0.1] shadow-2xl py-1.5 animate-in fade-in slide-in-from-top-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  navigate(`/dashboard/bookings/${booking.id}`);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-body text-silver hover:bg-white/[0.05] hover:text-white transition-colors"
                              >
                                <ExternalLink size={12} />
                                View Booking
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  const bal = getFolioBalance(queryClient, booking.id);
                                  if (bal > 0.01) {
                                    toast.error(`Outstanding balance of £${bal.toFixed(2)} — settle folio before checkout`);
                                    navigate(`/dashboard/bookings/${booking.id}`);
                                    return;
                                  }
                                  updateStatus.mutate({ bookingId: booking.id, status: 'checked_out' });
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-body text-orange-400 hover:bg-orange-400/5 transition-colors"
                              >
                                <LogOut size={12} />
                                Check Out
                              </button>
                              <div className="border-t border-white/[0.06] my-1" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  if (confirm('Cancel this booking? This cannot be undone.')) {
                                    updateStatus.mutate({ bookingId: booking.id, status: 'cancelled' });
                                  }
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-body text-rose-400 hover:bg-rose-400/5 transition-colors"
                              >
                                <XCircle size={12} />
                                Cancel Booking
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
