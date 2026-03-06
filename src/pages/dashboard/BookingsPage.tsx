import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBookings } from '@/hooks/useBookings';
import { useRooms } from '@/hooks/useRooms';
import { getFolioBalance } from '@/hooks/useFolios';
import { BookingCard } from '@/components/dashboard/BookingCard';
import { RoomAssignmentBoard } from '@/components/dashboard/RoomAssignmentBoard';
import { PageSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/Dialog';
import { BookingForm } from '@/components/dashboard/BookingForm';
import { Plus, Search, List, LayoutGrid, LogIn, LogOut as LogOutIcon, Printer, Download } from 'lucide-react';
import { exportCSV } from '@/lib/exportUtils';
import { format, differenceInDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import type { BookingFormData } from '@/lib/validators';
import type { BookingStatus } from '@/types';
import { useProperty } from '@/hooks/useProperty';
import { useKeyCard } from '@/hooks/useKeyCard';
import { KeyCardModal } from '@/components/dashboard/KeyCardModal';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { DashboardDatePicker, getPresetRange } from '@/components/shared/DashboardDatePicker';
import type { DateRange } from '@/components/shared/DashboardDatePicker';

const STATUS_FILTERS: { label: string; value: BookingStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Checked In', value: 'checked_in' },
  { label: 'Checked Out', value: 'checked_out' },
  { label: 'No-Show', value: 'no_show' },
  { label: 'Cancelled', value: 'cancelled' },
];

export function BookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view') as 'arrivals' | 'departures' | null;
  const { bookings, isLoading, createBooking, assignRoom, updateStatus } = useBookings();
  const { rooms, roomTypes, isLoadingRooms } = useRooms();
  const queryClient = useQueryClient();
  const { property } = useProperty();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'rooms'>('list');
  const [dateRange, setDateRange] = useState<DateRange>(getPresetRange('today'));

  const keyCard = useKeyCard();
  const [showKeyCardModal, setShowKeyCardModal] = useState(false);
  const [keyCardBookingId, setKeyCardBookingId] = useState<string | null>(null);
  const [encodedCards, setEncodedCards] = useState<import('@/hooks/useKeyCard').KeyCard[]>([]);

  // Build room lookup for BookingCard
  const roomMap = useMemo(() => {
    const m: Record<string, typeof rooms[number]> = {};
    for (const r of rooms) m[r.id] = r;
    return m;
  }, [rooms]);

  if (isLoading || isLoadingRooms) return <PageSpinner />;

  const filtered = bookings.filter((b) => {
    // Arrivals / Departures view filter — uses dateRange
    if (viewParam === 'arrivals') {
      const ci = new Date(b.check_in);
      if (!isWithinInterval(ci, { start: startOfDay(dateRange.start), end: endOfDay(dateRange.end) })) return false;
      if (b.status === 'cancelled' || b.status === 'no_show') return false;
    }
    if (viewParam === 'departures') {
      const co = new Date(b.check_out);
      if (!isWithinInterval(co, { start: startOfDay(dateRange.start), end: endOfDay(dateRange.end) })) return false;
      if (b.status !== 'checked_in' && b.status !== 'checked_out') return false;
    }
    // General list view — filter by date range
    if (!viewParam) {
      const ci = new Date(b.check_in);
      const co = new Date(b.check_out);
      const inRange = isWithinInterval(ci, { start: startOfDay(dateRange.start), end: endOfDay(dateRange.end) })
        || isWithinInterval(co, { start: startOfDay(dateRange.start), end: endOfDay(dateRange.end) })
        || (ci <= startOfDay(dateRange.start) && co >= endOfDay(dateRange.end));
      if (!inRange) return false;
    }

    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchesSearch =
      !search ||
      `${b.guest?.first_name} ${b.guest?.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      b.confirmation_code.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

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

  const handlePrintAllRegCards = () => {
    const arrivals = filtered;
    if (arrivals.length === 0) return;

    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) { toast.error('Please allow popups to print'); return; }

    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const propName = property?.name ?? 'Hotel';
    const propAddr = property?.address ? `${property.address.line1}, ${property.address.city}, ${property.address.postcode}` : '';
    const propPhone = property?.contact?.phone ?? '';

    const cards = arrivals.map(booking => {
      const guest = booking.guest;
      const room = booking.room_id ? roomMap[booking.room_id] : null;
      const nights = differenceInDays(new Date(booking.check_out), new Date(booking.check_in));
      return `
      <div class="card page-break">
        <p class="section-title">Registration Card</p>
        <div class="row">
          <div class="field"><label>Confirmation</label><div class="value">${esc(booking.confirmation_code)}</div></div>
          <div class="field"><label>Status</label><div class="value">${esc(booking.status.replace('_', ' ').toUpperCase())}</div></div>
        </div>
        <div class="row">
          <div class="field"><label>Guest Name</label><div class="value">${esc(guest?.first_name ?? '')} ${esc(guest?.last_name ?? '')}</div></div>
          <div class="field"><label>Nationality</label><div class="value">${esc(guest?.nationality ?? '\u2014')}</div></div>
        </div>
        <div class="row">
          <div class="field"><label>Email</label><div class="value">${esc(guest?.email ?? '\u2014')}</div></div>
          <div class="field"><label>Phone</label><div class="value">${esc(guest?.phone ?? '\u2014')}</div></div>
        </div>
      </div>
      <div class="card">
        <p class="section-title">Stay Details</p>
        <div class="row">
          <div class="field"><label>Check-in</label><div class="value">${format(new Date(booking.check_in), 'EEE, MMM d, yyyy')}</div></div>
          <div class="field"><label>Check-out</label><div class="value">${format(new Date(booking.check_out), 'EEE, MMM d, yyyy')}</div></div>
          <div class="field"><label>Nights</label><div class="value">${nights}</div></div>
        </div>
        <div class="row">
          <div class="field"><label>Room Type</label><div class="value">${esc(booking.room_type?.name ?? '\u2014')}</div></div>
          <div class="field"><label>Room Number</label><div class="value">${room ? esc(room.room_number) : 'TBA'}</div></div>
          <div class="field"><label>Guests</label><div class="value">${booking.num_guests}</div></div>
        </div>
        <div class="row">
          <div class="field"><label>Rate</label><div class="value">\u00a3${booking.nightly_rate.toFixed(2)} / night</div></div>
          <div class="field"><label>Total</label><div class="value">\u00a3${booking.total_amount.toFixed(2)}</div></div>
          <div class="field"><label>Paid</label><div class="value">\u00a3${booking.amount_paid.toFixed(2)}</div></div>
        </div>
        ${booking.special_requests ? `<p class="section-title" style="margin-top:16px">Special Requests</p><div class="special">${booking.special_requests.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>` : ''}
      </div>
      <div class="signature-area">
        <div class="sig-line">Guest Signature</div>
        <div class="sig-line">Date</div>
        <div class="sig-line">Staff Initials</div>
      </div>`;
    }).join('<div class="page-divider"></div>');

    w.document.write(`<!DOCTYPE html><html><head><title>Registration Cards \u2014 ${format(new Date(), 'MMM d, yyyy')}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a2e; font-size: 14px; }
        h1 { font-size: 22px; text-align: center; margin-bottom: 4px; }
        .subtitle { text-align: center; color: #64748b; font-size: 12px; margin-bottom: 6px; }
        .batch-info { text-align: center; color: #94a3b8; font-size: 11px; margin-bottom: 30px; }
        .card { border: 2px solid #1a1a2e; border-radius: 8px; padding: 24px; margin-bottom: 20px; }
        .row { display: flex; gap: 20px; margin-bottom: 12px; }
        .field { flex: 1; }
        .field label { display: block; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
        .field .value { font-size: 14px; font-weight: 600; padding: 4px 0; border-bottom: 1px solid #e2e8f0; min-height: 24px; }
        .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
        .signature-area { margin-top: 30px; display: flex; gap: 40px; }
        .sig-line { flex: 1; border-bottom: 1px solid #1a1a2e; padding-top: 50px; text-align: center; font-size: 11px; color: #64748b; }
        .special { background: #f8fafc; border-radius: 6px; padding: 12px; margin-top: 12px; font-size: 13px; min-height: 40px; }
        .page-divider { page-break-after: always; margin: 40px 0; border-top: 1px dashed #cbd5e1; }
        @media print {
          body { padding: 20px; }
          .page-divider { margin: 0; border: none; }
        }
      </style></head><body>
      <h1>${esc(propName)}</h1>
      <p class="subtitle">${esc(propAddr)}${propPhone ? ' \u00b7 ' + esc(propPhone) : ''}</p>
      <p class="batch-info">${arrivals.length} registration card${arrivals.length !== 1 ? 's' : ''} \u00b7 Printed ${format(new Date(), 'PPP p')}</p>
      ${cards}
    </body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); }, 400);
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display text-white mb-1.5 tracking-tight">
            {viewParam === 'arrivals' ? 'Arrivals' : viewParam === 'departures' ? 'Departures' : 'Bookings'}
          </h1>
          <p className="text-sm text-steel font-body tracking-wide">
            {viewParam === 'arrivals'
              ? `${filtered.length} arriving – ${dateRange.label}`
              : viewParam === 'departures'
              ? `${filtered.length} departing – ${dateRange.label}`
              : `${bookings.length} total bookings`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Arrivals / All / Departures toggle */}
          <div className="flex bg-white/[0.03] border border-white/[0.06] rounded-xl p-0.5">
            <button
              onClick={() => setSearchParams({ view: 'arrivals' })}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body transition-all duration-300',
                viewParam === 'arrivals' ? 'bg-teal/15 text-teal font-semibold shadow-[0_0_8px_rgba(14,165,160,0.1)]' : 'text-steel hover:text-silver'
              )}
            >
              <LogIn size={14} />
              Arrivals
            </button>
            <button
              onClick={() => { searchParams.delete('view'); setSearchParams(searchParams); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-body transition-all duration-200',
                !viewParam ? 'bg-white/[0.1] text-white font-semibold' : 'text-steel hover:text-silver'
              )}
            >
              <List size={14} />
              All
            </button>
            <button
              onClick={() => setSearchParams({ view: 'departures' })}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-body transition-all duration-200',
                viewParam === 'departures' ? 'bg-silver/15 text-silver font-semibold' : 'text-steel hover:text-silver'
              )}
            >
              <LogOutIcon size={14} />
              Departures
            </button>
          </div>

          {/* View toggle */}
          {!viewParam && (
            <div className="flex bg-white/[0.04] border border-white/[0.08] rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-body transition-all duration-200',
                  viewMode === 'list' ? 'bg-white/[0.1] text-white font-semibold' : 'text-steel hover:text-silver'
                )}
              >
                <List size={14} />
                List
              </button>
              <button
                onClick={() => setViewMode('rooms')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-body transition-all duration-200',
                  viewMode === 'rooms' ? 'bg-white/[0.1] text-white font-semibold' : 'text-steel hover:text-silver'
              )}
            >
              <LayoutGrid size={14} />
              Room Map
            </button>
          </div>
          )}

          <Button variant="outline-dark" size="sm" onClick={() => {
            const rows = filtered.map(b => ({
              'Confirmation': b.confirmation_code,
              'Guest': b.guest ? `${b.guest.first_name} ${b.guest.last_name}` : '',
              'Check-in': format(new Date(b.check_in), 'dd/MM/yyyy'),
              'Check-out': format(new Date(b.check_out), 'dd/MM/yyyy'),
              'Nights': differenceInDays(new Date(b.check_out), new Date(b.check_in)),
              'Room Type': b.room_type?.name ?? '',
              'Room': roomMap[b.room_id ?? '']?.room_number ?? 'Unassigned',
              'Status': b.status.replace('_', ' '),
              'Source': b.source,
              'Rate': `£${b.nightly_rate.toFixed(2)}`,
              'Total': `£${b.total_amount.toFixed(2)}`,
              'Guests': b.num_guests,
            }));
            exportCSV(rows, `bookings-${format(new Date(), 'yyyy-MM-dd')}`);
          }}>
            <Download size={14} className="mr-1.5" /> Export
          </Button>
          <Button onClick={() => setShowNewBooking(true)}>
            <Plus size={16} className="mr-2" />
            New Booking
          </Button>
          {viewParam === 'arrivals' && filtered.length > 0 && (
            <Button variant="outline-dark" onClick={handlePrintAllRegCards}>
              <Printer size={16} className="mr-2" />
              Print All Reg Cards
            </Button>
          )}
        </div>
      </div>

      {/* Date Picker — always shown */}
      <div className="mb-6">
        <DashboardDatePicker
          value={dateRange}
          onChange={setDateRange}
          presets={['today', 'week', 'month', 'year']}
        />
      </div>

      {/* Room Map View */}
      {viewMode === 'rooms' && !viewParam && (
        <RoomAssignmentBoard
          bookings={bookings}
          rooms={rooms}
          roomTypes={roomTypes}
          onConfirmMoves={(moves) => {
            for (const move of moves) {
              assignRoom.mutate({
                bookingId: move.bookingId,
                newRoomId: move.toRoomId,
                oldRoomId: move.fromRoomId,
              });
            }
          }}
          isPending={assignRoom.isPending}
        />
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel" />
              <Input
                variant="dark"
                placeholder="Search by guest name or confirmation code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-3 py-2 rounded-lg text-xs font-body transition-all ${
                    statusFilter === f.value
                      ? 'bg-gold/20 text-gold font-semibold'
                      : 'text-steel hover:text-white hover:bg-slate/50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bookings Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-steel font-body">No bookings found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  assignedRoom={booking.room_id ? roomMap[booking.room_id] : undefined}
                  onCheckIn={(viewParam === 'arrivals' || viewParam === 'departures') ? (id) => {
                    const bk = bookings.find(b => b.id === id);
                    const rm = bk?.room_id ? roomMap[bk.room_id] : undefined;
                    if (!rm) { toast.error('Please assign a room before checking in'); return; }
                    if (keyCard.config.auto_encode_on_checkin) {
                      setKeyCardBookingId(id);
                      setEncodedCards([]);
                      keyCard.resetEncoding();
                      setShowKeyCardModal(true);
                    } else {
                      updateStatus.mutate({ bookingId: id, status: 'checked_in' });
                    }
                  } : undefined}
                  onCheckOut={viewParam === 'departures' ? (id) => {
                    const bal = getFolioBalance(queryClient, id);
                    if (bal > 0.01) {
                      toast.error(`Outstanding balance of £${bal.toFixed(2)} — settle folio before checkout`);
                      return;
                    }
                    updateStatus.mutate({ bookingId: id, status: 'checked_out' });
                  } : undefined}
                />
              ))}
            </div>
          )}
        </>
      )}

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
