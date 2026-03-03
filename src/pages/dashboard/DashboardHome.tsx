import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BedDouble, CalendarCheck, LogIn, LogOut as LogOutIcon, Plus,
  TrendingUp, Clock, ArrowRight, Users, Sparkles,
  AlertTriangle, Brain, Globe, Wrench, Hash, Loader2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useBookings } from '@/hooks/useBookings';
import { useRooms } from '@/hooks/useRooms';
import { getFolioBalance, useAllFolios } from '@/hooks/useFolios';
import { useGuests } from '@/hooks/useGuests';
import { useProperty } from '@/hooks/useProperty';
import { useKeyCard } from '@/hooks/useKeyCard';
import { KeyCardModal } from '@/components/dashboard/KeyCardModal';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/Button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/Dialog';
import { BookingForm } from '@/components/dashboard/BookingForm';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { isSameDay, subDays, format, differenceInDays } from 'date-fns';
import type { BookingFormData } from '@/lib/validators';

// Mini bar chart for weekly revenue
function RevenueChart({ data }: { data: { label: string; value: number; max: number }[] }) {
  return (
    <div className="flex items-end gap-2 h-20">
      {data.map((d, i) => {
        const pct = d.max > 0 ? (d.value / d.max) * 100 : 0;
        const isToday = i === data.length - 1;
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="w-full relative rounded-md" style={{ height: '56px' }}>
              <div
                className={`absolute bottom-0 w-full rounded-md origin-bottom transition-all ${
                  isToday
                    ? 'bg-gradient-to-t from-gold via-gold/80 to-gold-light/50 shadow-[0_0_16px_rgba(201,168,76,0.35)]'
                    : 'bg-gradient-to-t from-teal via-teal/70 to-teal-light/30 shadow-[0_0_8px_rgba(14,165,160,0.15)]'
                }`}
                style={{
                  height: `${Math.max(pct, 6)}%`,
                  animation: `barGrow 0.8s cubic-bezier(0.16,1,0.3,1) ${0.1 * i}s forwards`,
                  transform: 'scaleY(0)',
                }}
              />
            </div>
            <span className={`text-[9px] font-body ${isToday ? 'text-gold font-semibold' : 'text-steel'}`}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// Room status visual grid
function RoomGrid({ rooms }: { rooms: { id: string; room_number: string; status: string; roomTypeName?: string }[] }) {
  const statusColors: Record<string, string> = {
    occupied: 'bg-gradient-to-br from-teal/30 to-teal/10 border-teal/30 shadow-[inset_0_1px_0_rgba(14,165,160,0.15),0_0_12px_rgba(14,165,160,0.1)]',
    available: 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.14] hover:shadow-[0_0_8px_rgba(255,255,255,0.04)]',
    reserved: 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/25 shadow-[0_0_8px_rgba(59,130,246,0.08)]',
    maintenance: 'bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/25 shadow-[0_0_8px_rgba(245,158,11,0.08)]',
    blocked: 'bg-gradient-to-br from-rose-500/20 to-rose-500/5 border-rose-500/25 shadow-[0_0_8px_rgba(244,63,94,0.08)]',
  };
  const statusTextColors: Record<string, string> = {
    occupied: 'text-teal',
    available: 'text-white/50',
    reserved: 'text-blue-400/80',
    maintenance: 'text-amber-400/80',
    blocked: 'text-rose-400/80',
  };

  return (
    <div className="grid grid-cols-5 gap-2">
      {rooms.map((r) => (
        <div
          key={r.id}
          title={`${r.room_number} · ${r.status}`}
          className={`h-10 rounded-xl border flex items-center justify-center text-[10px] font-bold font-body transition-all duration-300 cursor-default ${statusColors[r.status] ?? statusColors.available} ${statusTextColors[r.status] ?? statusTextColors.available}`}
        >
          {r.room_number}
        </div>
      ))}
    </div>
  );
}

// Live clock
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="text-xs text-steel font-body tabular-nums">
      {format(time, 'HH:mm:ss')}
    </span>
  );
}

export function DashboardHome() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { bookings, createBooking, updateStatus, isLoading: isLoadingBookings } = useBookings();
  const { rooms, roomTypes, isLoadingRooms } = useRooms();
  const { guests, isLoading: isLoadingGuests } = useGuests();
  const { allEntries: folioEntries } = useAllFolios(bookings.map(b => b.id));
  useProperty();
  const keyCard = useKeyCard();
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [showKeyCardModal, setShowKeyCardModal] = useState(false);
  const [keyCardBookingId, setKeyCardBookingId] = useState<string | null>(null);
  const [encodedCards, setEncodedCards] = useState<import('@/hooks/useKeyCard').KeyCard[]>([]);

  // All hooks (useMemo) MUST be called before any early return to satisfy React's rules of hooks
  const today = new Date();
  const todayKey = format(today, 'yyyy-MM-dd');
  const yesterday = subDays(today, 1);

  const todayRevenue = useMemo(() => {
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    return folioEntries
      .filter(e => e.type === 'charge' && !e.is_voided && new Date(e.posted_at) >= todayDate && new Date(e.posted_at) < tomorrowDate)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [folioEntries, todayKey]);

  const yesterdayRevenue = useMemo(() => {
    const yDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return folioEntries
      .filter(e => e.type === 'charge' && !e.is_voided && new Date(e.posted_at) >= yDate && new Date(e.posted_at) < todayDate)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [folioEntries, todayKey]);

  const weeklyRevenue = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(today, 6 - i);
      const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dEnd = new Date(dStart);
      dEnd.setDate(dEnd.getDate() + 1);
      const rev = folioEntries
        .filter(e => e.type === 'charge' && !e.is_voided && new Date(e.posted_at) >= dStart && new Date(e.posted_at) < dEnd)
        .reduce((sum, e) => sum + e.amount, 0);
      return { label: format(d, 'EEE')[0] ?? '', value: rev, date: d };
    });
    const max = Math.max(...days.map((d) => d.value), 1);
    return days.map((d) => ({ ...d, max }));
  }, [folioEntries, todayKey]);

  if (isLoadingBookings || isLoadingRooms || isLoadingGuests) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gold mx-auto mb-2" />
          <p className="text-steel text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const todayStr = today.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // Stats
  const totalRooms = rooms.filter((r) => r.status !== 'maintenance' && r.status !== 'blocked').length;
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length;
  const occupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const todayArrivals = bookings.filter(
    (b) => isSameDay(new Date(b.check_in), today) && b.status !== 'cancelled' && b.status !== 'no_show'
  );
  const todayDepartures = bookings.filter(
    (b) => isSameDay(new Date(b.check_out), today) && (b.status === 'checked_in' || b.status === 'checked_out')
  );

  const revenueChange = yesterdayRevenue > 0
    ? `${((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100) >= 0 ? '+' : ''}${Math.round((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100)}%`
    : todayRevenue > 0 ? '+100%' : '—';

  // Room grid with type names — compute effective status so OOO rooms show as maintenance
  const roomGrid = rooms.map((r) => {
    const effectiveStatus =
      r.housekeeping_status === 'out_of_order' && r.status !== 'maintenance' && r.status !== 'blocked'
        ? 'maintenance'
        : r.status;
    return {
      ...r,
      status: effectiveStatus,
      roomTypeName: roomTypes.find((rt) => rt.id === r.room_type_id)?.name,
    };
  });

  const stats = [
    { label: 'Occupancy', value: `${occupancy}%`, icon: BedDouble, color: 'text-teal' as const, accent: 'bg-teal/10', ringValue: occupancy },
    { label: 'Revenue Today', value: formatCurrency(todayRevenue), icon: TrendingUp, color: 'text-gold' as const, accent: 'bg-gold/10', change: revenueChange },
    { label: 'Arrivals', value: String(todayArrivals.length), icon: LogIn, color: 'text-teal-light' as const, accent: 'bg-teal/10' },
    { label: 'Departures', value: String(todayDepartures.length), icon: LogOutIcon, color: 'text-silver' as const, accent: 'bg-white/5' },
  ];

  const handleCreateBooking = (data: BookingFormData) => {
    createBooking.mutate({
      ...data,
      guest: {
        first_name: data.guest.first_name,
        last_name: data.guest.last_name,
        email: data.guest.email || '',
        phone: data.guest.phone,
      },
    }, {
      onSuccess: () => setShowNewBooking(false),
    });
  };

  const getGreeting = () => {
    const h = today.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="p-6 lg:p-8 mesh-gradient min-h-full relative overflow-hidden">
      {/* Cinematic ambient background orbs — layered for depth */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-[700px] h-[700px] rounded-full bg-gradient-radial from-teal/[0.06] via-teal/[0.02] to-transparent blur-[120px] animate-aurora-float-2" />
      <div className="pointer-events-none absolute -bottom-48 -left-24 w-[600px] h-[600px] rounded-full bg-gradient-radial from-gold/[0.05] via-gold/[0.015] to-transparent blur-[100px] animate-aurora-float-1" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-gradient-radial from-purple/[0.03] to-transparent blur-[120px] animate-aurora-float-3" />
      {/* Noise texture overlay for film grain effect */}
      <div className="pointer-events-none absolute inset-0 noise-texture" />

      {/* Hero Header — cinematic welcome */}
      <div className="opacity-0 animate-fade-in mb-10 relative z-10">
        <div className="flex items-start justify-between">
          <div className="hero-glow">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-4xl lg:text-5xl font-display text-white tracking-tight leading-none">{getGreeting()}</h1>
              <Sparkles size={24} className="text-gold animate-pulse-soft drop-shadow-[0_0_12px_rgba(201,168,76,0.5)]" />
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm text-silver/70 font-body tracking-wide">{todayStr}</p>
              <span className="w-1 h-1 rounded-full bg-gold/40" />
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-gold/40" />
                <LiveClock />
              </div>
            </div>
          </div>
          <Button onClick={() => setShowNewBooking(true)} className="shadow-[0_4px_24px_rgba(201,168,76,0.3)] hover:shadow-[0_8px_40px_rgba(201,168,76,0.4)] transition-all duration-500">
            <Plus size={16} className="mr-2" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8">
        <DashboardStats stats={stats} />
      </div>

      {/* Attention Required + AI Quick Links */}
      {(() => {
        const maintenanceRooms = rooms.filter((r) => r.status === 'maintenance' || r.status === 'blocked');
        const unassignedBookings = bookings.filter((b) => !b.room_id && (b.status === 'confirmed' || b.status === 'checked_in'));
        const hasIssues = maintenanceRooms.length > 0 || unassignedBookings.length > 0 || todayArrivals.filter((b) => b.status === 'confirmed').length > 0;
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 opacity-0 animate-stagger-4">
            {/* Attention cards */}
            {hasIssues && (
              <div className="lg:col-span-2 glass-panel rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} className="text-amber-400" />
                  <h3 className="text-xs font-body font-semibold text-white uppercase tracking-wider">Needs Attention</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {todayArrivals.filter((b) => b.status === 'confirmed').length > 0 && (
                    <button
                      onClick={() => navigate('/dashboard/bookings')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body font-semibold bg-teal/10 border border-teal/20 text-teal hover:bg-teal/20 transition-all"
                    >
                      <LogIn size={12} />
                      {todayArrivals.filter((b) => b.status === 'confirmed').length} guest{todayArrivals.filter((b) => b.status === 'confirmed').length !== 1 ? 's' : ''} awaiting check-in
                    </button>
                  )}
                  {unassignedBookings.length > 0 && (
                    <button
                      onClick={() => navigate('/dashboard/bookings')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body font-semibold bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-all"
                    >
                      <Hash size={12} />
                      {unassignedBookings.length} booking{unassignedBookings.length !== 1 ? 's' : ''} need room assignment
                    </button>
                  )}
                  {maintenanceRooms.length > 0 && (
                    <button
                      onClick={() => navigate('/dashboard/rooms')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all"
                    >
                      <Wrench size={12} />
                      {maintenanceRooms.length} room{maintenanceRooms.length !== 1 ? 's' : ''} out of service
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* AI & Rate quick links */}
            <div className={hasIssues ? '' : 'lg:col-span-3'}>
              <div className={`grid ${hasIssues ? 'grid-cols-1' : 'grid-cols-2'} gap-3 h-full`}>
                <button
                  onClick={() => navigate('/dashboard/insights')}
                  className="glass-panel rounded-xl p-5 text-left hover:bg-white/[0.04] transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Brain size={14} className="text-purple-400" />
                    <h3 className="text-xs font-body font-semibold text-white">AI Insights</h3>
                    <ArrowRight size={10} className="text-steel ml-auto group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-[10px] text-steel font-body">Occupancy forecasts & AI suggestions</p>
                </button>
                <button
                  onClick={() => navigate('/dashboard/rate-intelligence')}
                  className="glass-panel rounded-xl p-5 text-left hover:bg-white/[0.04] transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Globe size={14} className="text-gold" />
                    <h3 className="text-xs font-body font-semibold text-white">Rate Intel</h3>
                    <ArrowRight size={10} className="text-steel ml-auto group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-[10px] text-steel font-body">Competitor rates & pricing suggestions</p>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Arrivals & Departures — stacked */}
        <div className="lg:col-span-2 space-y-5 opacity-0 animate-stagger-5">

          {/* ── Arrivals ──────────────────────────── */}
          <div className="glass-panel overflow-hidden group/arrivals">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] relative">
              {/* Subtle header glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-teal/[0.04] via-transparent to-transparent pointer-events-none" />
              <div className="flex items-center gap-2 relative">
                <div className="w-2 h-2 rounded-full bg-teal shadow-[0_0_8px_rgba(14,165,160,0.5)] animate-pulse-soft" />
                <LogIn size={14} className="text-teal" />
                <h2 className="text-sm font-semibold text-white font-body">Arrivals</h2>
                <span className="text-[11px] text-steel font-body ml-1">
                  {todayArrivals.length} today
                </span>
              </div>
              <button
                onClick={() => navigate('/dashboard/bookings')}
                className="flex items-center gap-1 text-xs text-teal hover:text-teal-light font-body transition-colors group"
              >
                View all
                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {todayArrivals.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <LogIn size={24} className="mx-auto mb-2 text-steel/30" />
                <p className="text-xs text-steel font-body">No arrivals today</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {todayArrivals.map((booking) => (
                  <div
                    key={booking.id}
                    onClick={() => navigate(`/dashboard/bookings/${booking.id}`)}
                    className="group flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-all duration-200 cursor-pointer"
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal/20 to-teal-light/10 flex items-center justify-center text-[11px] font-bold text-teal/80 font-body shrink-0">
                      {booking.guest?.first_name?.[0]}{booking.guest?.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium font-body truncate">
                        {booking.guest?.first_name} {booking.guest?.last_name}
                      </p>
                      <p className="text-[11px] text-steel font-body truncate">
                        {booking.room_type?.name ?? 'Room'} · {booking.confirmation_code}
                      </p>
                    </div>
                    <span className="text-xs text-steel font-body tabular-nums shrink-0">
                      {differenceInDays(new Date(booking.check_out), new Date(booking.check_in))} night{differenceInDays(new Date(booking.check_out), new Date(booking.check_in)) !== 1 ? 's' : ''}
                    </span>
                    <StatusBadge status={booking.status} />
                    {booking.status === 'confirmed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!booking.room_id) {
                            toast.error('Please assign a room before checking in');
                            return;
                          }
                          if (keyCard.config.auto_encode_on_checkin) {
                            setKeyCardBookingId(booking.id);
                            setEncodedCards([]);
                            keyCard.resetEncoding();
                            setShowKeyCardModal(true);
                          } else {
                            updateStatus.mutate({ bookingId: booking.id, status: 'checked_in' });
                          }
                        }}
                        className="shrink-0 text-[11px] font-semibold text-teal hover:text-teal-light font-body transition-colors px-2.5 py-1.5 rounded-lg bg-teal/10 hover:bg-teal/20 border border-teal/20"
                      >
                        Check In
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Departures ────────────────────────── */}
          <div className="glass-panel overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] relative">
              <div className="absolute inset-0 bg-gradient-to-r from-silver/[0.03] via-transparent to-transparent pointer-events-none" />
              <div className="flex items-center gap-2 relative">
                <LogOutIcon size={14} className="text-silver" />
                <h2 className="text-sm font-semibold text-white font-body">Departures</h2>
                <span className="text-[11px] text-steel font-body ml-1">
                  {todayDepartures.length} today
                </span>
              </div>
            </div>

            {todayDepartures.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <LogOutIcon size={24} className="mx-auto mb-2 text-steel/30" />
                <p className="text-xs text-steel font-body">No departures today</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {todayDepartures.map((booking) => (
                  <div
                    key={booking.id}
                    onClick={() => navigate(`/dashboard/bookings/${booking.id}`)}
                    className="group flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-all duration-200 cursor-pointer"
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-silver/10 to-white/5 flex items-center justify-center text-[11px] font-bold text-silver/60 font-body shrink-0">
                      {booking.guest?.first_name?.[0]}{booking.guest?.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium font-body truncate">
                        {booking.guest?.first_name} {booking.guest?.last_name}
                      </p>
                      <p className="text-[11px] text-steel font-body truncate">
                        {booking.room_type?.name ?? 'Room'} · {booking.confirmation_code}
                      </p>
                    </div>
                    <StatusBadge status={booking.status} />
                    {booking.status === 'checked_in' && (
                      <button
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
                        className="shrink-0 text-[11px] font-semibold text-silver hover:text-white font-body transition-colors px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1]"
                      >
                        Check Out
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5 opacity-0 animate-stagger-6">
          {/* Revenue chart card */}
          <div className="glass-panel p-5 group hover:border-teal/20 transition-all duration-500">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal/20 to-teal/5 flex items-center justify-center">
                  <TrendingUp size={14} className="text-teal" />
                </div>
                <h3 className="text-xs font-semibold text-white font-body uppercase tracking-wider">Revenue · 7 Days</h3>
              </div>
            </div>
            <RevenueChart data={weeklyRevenue} />
            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-[11px] text-steel font-body">Total this week</span>
              <span className="text-sm font-bold text-white font-body tracking-wide">
                {formatCurrency(weeklyRevenue.reduce((s, d) => s + d.value, 0))}
              </span>
            </div>
          </div>

          {/* Room grid */}
          <div className="glass-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BedDouble size={14} className="text-gold" />
                <h3 className="text-xs font-semibold text-white font-body uppercase tracking-wider">Room Status</h3>
              </div>
              <button
                onClick={() => navigate('/dashboard/rooms')}
                className="text-[11px] text-gold hover:text-gold-light font-body transition-colors"
              >
                Manage →
              </button>
            </div>
            <RoomGrid rooms={roomGrid} />

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.06]">
              {[
                { label: 'Occupied', color: 'bg-teal/80' },
                { label: 'Available', color: 'bg-white/10' },
                { label: 'Maintenance', color: 'bg-warning/40' },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded ${l.color}`} />
                  <span className="text-[10px] text-steel font-body">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div className="glass-panel p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users size={14} className="text-silver" />
              <h3 className="text-xs font-semibold text-white font-body uppercase tracking-wider">Quick Stats</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Total Guests', value: guests.length, icon: Users },
                { label: 'Room Types', value: roomTypes.length, icon: BedDouble },
                { label: 'Active Bookings', value: bookings.filter((b) => b.status === 'confirmed' || b.status === 'checked_in').length, icon: CalendarCheck },
                { label: 'Revenue (All)', value: formatCurrency(folioEntries.filter(e => e.type === 'charge' && !e.is_voided).reduce((s, e) => s + e.amount, 0)), icon: TrendingUp },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <item.icon size={12} className="text-steel" />
                    <span className="text-xs text-steel font-body">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-white font-body">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* New Booking Dialog */}
      <Dialog open={showNewBooking} onOpenChange={setShowNewBooking}>
        <DialogContent variant="dark" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Booking</DialogTitle>
          </DialogHeader>
          <BookingForm
            onSubmit={handleCreateBooking}
            isLoading={createBooking.isPending}
            onCancel={() => setShowNewBooking(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Key Card Encoding Modal */}
      {(() => {
        const kcBooking = keyCardBookingId ? bookings.find(b => b.id === keyCardBookingId) : undefined;
        const roomMap = Object.fromEntries(rooms.map(r => [r.id, r]));
        const kcRoom = kcBooking?.room_id ? roomMap[kcBooking.room_id] : undefined;
        if (!kcBooking || !kcRoom) return null;
        return (
          <KeyCardModal
            open={showKeyCardModal}
            onClose={() => { setShowKeyCardModal(false); keyCard.resetEncoding(); }}
            encodingProgress={keyCard.encodingProgress}
            encodedCards={encodedCards}
            guestName={`${kcBooking.guest?.first_name ?? ''} ${kcBooking.guest?.last_name ?? ''}`.trim()}
            roomNumber={kcRoom.room_number}
            cardType={keyCard.config.default_card_type}
            numCards={keyCard.config.cards_per_booking}
            providerName={keyCard.providers.find(p => p.id === keyCard.config.provider)?.name ?? 'Key System'}
            onEncode={async () => {
              try {
                const cards = await keyCard.encodeKeyCard(kcBooking, kcRoom);
                setEncodedCards(cards);
              } catch { /* error shown in modal */ }
            }}
            onDone={() => {
              setShowKeyCardModal(false);
              keyCard.resetEncoding();
              updateStatus.mutate({ bookingId: kcBooking.id, status: 'checked_in' });
            }}
            autoStart
          />
        );
      })()}
    </div>
  );
}
