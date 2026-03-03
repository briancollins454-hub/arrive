import { useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays, subDays, startOfWeek, differenceInDays, isSameDay, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, ArrowRightLeft, AlertCircle, Inbox, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useBookings } from '@/hooks/useBookings';
import { useRooms } from '@/hooks/useRooms';
import type { Booking, Room } from '@/types';

type ViewSpan = 7 | 14 | 28;

// Drag-and-drop state for room moves
interface DragState {
  booking: Booking;
  sourceRoomId: string | null; // null = from unassigned shelf
}

interface PendingMove {
  booking: Booking;
  sourceRoom: Room | null; // null = from unassigned shelf
  targetRoom: Room | null; // null = unassign to shelf
}

function getBookingColor(status: Booking['status'], _source: Booking['source']): string {
  switch (status) {
    case 'checked_in': return 'bg-emerald-500/80 border-emerald-400';
    case 'confirmed': return 'bg-blue-500/80 border-blue-400';
    case 'pending': return 'bg-amber-500/80 border-amber-400';
    case 'checked_out': return 'bg-slate-500/60 border-slate-400';
    case 'cancelled': return 'bg-red-500/40 border-red-400 line-through opacity-50';
    case 'no_show': return 'bg-red-500/60 border-red-400';
    default: return 'bg-slate-500/60 border-slate-400';
  }
}

function getStatusLabel(status: Booking['status']): string {
  switch (status) {
    case 'checked_in': return 'In-House';
    case 'confirmed': return 'Confirmed';
    case 'pending': return 'Pending';
    case 'checked_out': return 'Departed';
    case 'cancelled': return 'Cancelled';
    case 'no_show': return 'No-Show';
    default: return status;
  }
}

export function TapeChartPage() {
  const navigate = useNavigate();
  const { bookings, assignRoom } = useBookings();
  const { rooms, roomTypes } = useRooms();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [startDate, setStartDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [viewSpan, setViewSpan] = useState<ViewSpan>(14);
  const [hoveredBooking, setHoveredBooking] = useState<string | null>(null);

  // Drag-and-drop state
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTargetRoom, setDropTargetRoom] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);

  const allBookings = bookings ?? [];
  const allRooms = (rooms ?? []).sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }));
  const allRoomTypes = roomTypes ?? [];

  // Generate date columns
  const dates = useMemo(() => {
    return Array.from({ length: viewSpan }, (_, i) => addDays(startDate, i));
  }, [startDate, viewSpan]);

  // Group rooms by type
  const roomsByType = useMemo(() => {
    const map = new Map<string, Room[]>();
    for (const rt of allRoomTypes) {
      map.set(rt.id, allRooms.filter(r => r.room_type_id === rt.id));
    }
    return map;
  }, [allRooms, allRoomTypes]);

  // Find bookings for a room that overlap the visible date range — sorted by check-in
  const getBookingsForRoom = (roomId: string): Booking[] => {
    return allBookings
      .filter(b => {
        if (b.room_id !== roomId) return false;
        if (b.status === 'cancelled' || b.status === 'no_show') return false;
        const bIn = parseISO(b.check_in);
        const bOut = parseISO(b.check_out);
        const viewEnd = addDays(startDate, viewSpan);
        return bIn < viewEnd && bOut > startDate;
      })
      .sort((a, b) => parseISO(a.check_in).getTime() - parseISO(b.check_in).getTime());
  };

  // Calculate position for a booking block, clipped to not overlap the next booking on the same room
  const getBookingPosition = (booking: Booking, roomBookings: Booking[]) => {
    const bIn = parseISO(booking.check_in);
    const bOut = parseISO(booking.check_out);
    const viewStart = startDate;

    const startOffset = Math.max(0, differenceInDays(bIn, viewStart));
    let endOffset = Math.min(viewSpan, differenceInDays(bOut, viewStart));

    // Find the next booking on this room (by check-in order) and clip this block so it doesn't overlap
    const idx = roomBookings.findIndex(b => b.id === booking.id);
    if (idx >= 0) {
      for (let i = idx + 1; i < roomBookings.length; i++) {
        const next = roomBookings[i];
        if (!next) break;
        const nextIn = parseISO(next.check_in);
        const nextOffset = differenceInDays(nextIn, viewStart);
        if (nextOffset < endOffset) {
          endOffset = Math.max(startOffset, nextOffset);
        }
        break;
      }
    }

    const span = endOffset - startOffset;
    return { startOffset, span };
  };

  // Navigation
  const goToday = () => setStartDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const goPrev = () => setStartDate(s => subDays(s, viewSpan === 7 ? 7 : viewSpan === 14 ? 7 : 14));
  const goNext = () => setStartDate(s => addDays(s, viewSpan === 7 ? 7 : viewSpan === 14 ? 7 : 14));

  // Cell width based on view span
  const cellW = viewSpan === 7 ? 'w-24' : viewSpan === 14 ? 'w-16' : 'w-10';
  const cellPx = viewSpan === 7 ? 96 : viewSpan === 14 ? 64 : 40;

  const today = new Date();

  // ── Drag & Drop helpers ────────────────────────────────────────
  const isDraggable = (b: Booking) =>
    b.status === 'checked_in' || b.status === 'confirmed' || b.status === 'pending';

  const handleDragStart = useCallback((e: React.DragEvent, booking: Booking) => {
    if (!isDraggable(booking)) { e.preventDefault(); return; }
    setDragState({ booking, sourceRoomId: booking.room_id ?? null });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', booking.id);
    // Shrink the ghost image
    const el = e.currentTarget as HTMLElement;
    e.dataTransfer.setDragImage(el, 20, 16);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, roomId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetRoom(roomId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropTargetRoom(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetRoomId: string) => {
    e.preventDefault();
    setDropTargetRoom(null);
    if (!dragState) return;
    if (targetRoomId === dragState.sourceRoomId) { setDragState(null); return; }

    const srcRoom = dragState.sourceRoomId ? allRooms.find(r => r.id === dragState.sourceRoomId) ?? null : null;
    const tgtRoom = allRooms.find(r => r.id === targetRoomId);

    // Only block maintenance/blocked rooms — reserved/occupied rooms may be free for the booking dates
    if (tgtRoom && (tgtRoom.status === 'maintenance' || tgtRoom.status === 'blocked')) {
      setDragState(null);
      return;
    }

    // Check for conflicting bookings on target room for the dragged booking dates
    const bIn = parseISO(dragState.booking.check_in);
    const bOut = parseISO(dragState.booking.check_out);
    const conflict = allBookings.some(b => {
      if (b.room_id !== targetRoomId || b.status === 'cancelled' || b.status === 'no_show') return false;
      if (b.id === dragState.booking.id) return false;
      const oIn = parseISO(b.check_in);
      const oOut = parseISO(b.check_out);
      return oIn < bOut && oOut > bIn;
    });
    if (conflict) { setDragState(null); return; }

    if (tgtRoom) {
      setPendingMove({ booking: dragState.booking, sourceRoom: srcRoom, targetRoom: tgtRoom });
    }
    setDragState(null);
  }, [dragState, allRooms, allBookings]);

  // Drop onto the unassigned shelf (unassign room)
  const handleShelfDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropTargetRoom(null);
    if (!dragState) return;
    if (!dragState.sourceRoomId) { setDragState(null); return; } // already unassigned

    const srcRoom = allRooms.find(r => r.id === dragState.sourceRoomId) ?? null;
    setPendingMove({ booking: dragState.booking, sourceRoom: srcRoom, targetRoom: null });
    setDragState(null);
  }, [dragState, allRooms]);

  const handleShelfDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetRoom('__shelf__');
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragState(null);
    setDropTargetRoom(null);
  }, []);

  // Unassigned bookings for the shelf
  const unassignedBookings = useMemo(() => {
    return allBookings.filter(b =>
      !b.room_id && b.status !== 'cancelled' && b.status !== 'no_show' && b.status !== 'checked_out'
    ).sort((a, b) => parseISO(a.check_in).getTime() - parseISO(b.check_in).getTime());
  }, [allBookings]);

  const confirmMove = useCallback(() => {
    if (!pendingMove) return;

    // Unassigning to shelf
    if (!pendingMove.targetRoom) {
      assignRoom.mutate({
        bookingId: pendingMove.booking.id,
        newRoomId: '', // empty = unassign
        oldRoomId: pendingMove.sourceRoom?.id ?? '',
      });
      setPendingMove(null);
      return;
    }

    const tgtRoomType = allRoomTypes.find(rt => rt.id === pendingMove.targetRoom!.room_type_id);
    const srcRoomTypeId = pendingMove.sourceRoom?.room_type_id;
    const isTypeChange = srcRoomTypeId ? pendingMove.targetRoom.room_type_id !== srcRoomTypeId : true;
    assignRoom.mutate({
      bookingId: pendingMove.booking.id,
      newRoomId: pendingMove.targetRoom.id,
      oldRoomId: pendingMove.sourceRoom?.id ?? '',
      newRoomTypeId: isTypeChange ? pendingMove.targetRoom.room_type_id : undefined,
      newNightlyRate: tgtRoomType && isTypeChange ? tgtRoomType.base_rate : undefined,
    });
    setPendingMove(null);
  }, [pendingMove, allRoomTypes, assignRoom]);

  return (
    <div className="p-6 lg:p-8 space-y-4 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Tape Chart</h1>
          <p className="text-silver text-sm mt-1">
            Visual room availability — {format(startDate, 'MMM d')} to {format(addDays(startDate, viewSpan - 1), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline-dark" size="sm" onClick={goPrev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline-dark" size="sm" onClick={goToday}>
            <CalendarDays className="w-4 h-4 mr-1" /> Today
          </Button>
          <Button variant="outline-dark" size="sm" onClick={goNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>

          <div className="ml-4 flex items-center gap-1 glass-panel px-1 py-1 rounded-lg">
            <button
              onClick={() => setViewSpan(7)}
              className={cn('px-2 py-1 text-xs rounded transition-colors', viewSpan === 7 ? 'bg-teal/20 text-teal' : 'text-silver hover:text-white')}
            >
              7d
            </button>
            <button
              onClick={() => setViewSpan(14)}
              className={cn('px-2 py-1 text-xs rounded transition-colors', viewSpan === 14 ? 'bg-teal/20 text-teal' : 'text-silver hover:text-white')}
            >
              14d
            </button>
            <button
              onClick={() => setViewSpan(28)}
              className={cn('px-2 py-1 text-xs rounded transition-colors', viewSpan === 28 ? 'bg-teal/20 text-teal' : 'text-silver hover:text-white')}
            >
              28d
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/80 border border-emerald-400" /> In-House</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500/80 border border-blue-400" /> Confirmed</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500/80 border border-amber-400" /> Pending</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-500/60 border border-slate-400" /> Departed</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/60 border border-red-400" /> No-Show</span>
        <span className="text-silver/50 ml-2 italic flex items-center gap-1">
          <ArrowRightLeft size={11} className="text-silver/40" /> Drag booking blocks to move rooms
        </span>
      </div>

      {/* ── Unassigned / Overbookings Shelf ─────────────────────── */}
      <div
        className={cn(
          'glass-panel rounded-xl p-5 transition-all duration-300',
          dropTargetRoom === '__shelf__' && 'ring-2 ring-amber-400/40 bg-amber-500/[0.05]'
        )}
        onDragOver={handleShelfDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleShelfDrop}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <Inbox size={15} className="text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-display font-semibold text-white tracking-tight">
              Unassigned Bookings
            </h3>
            <p className="text-[10px] text-steel font-body">
              {unassignedBookings.length === 0
                ? 'All bookings assigned — drag here to unassign'
                : `${unassignedBookings.length} booking${unassignedBookings.length !== 1 ? 's' : ''} awaiting room assignment — drag to a room row below`}
            </p>
          </div>
        </div>

        {unassignedBookings.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {unassignedBookings.map(b => {
              const rtName = allRoomTypes.find(rt => rt.id === b.room_type_id)?.name ?? 'Any';
              const nights = Math.max(1, differenceInDays(parseISO(b.check_out), parseISO(b.check_in)));
              return (
                <div
                  key={b.id}
                  draggable={isDraggable(b)}
                  onDragStart={(e) => handleDragStart(e, b)}
                  onDragEnd={handleDragEnd}
                  onClick={() => navigate(`/dashboard/bookings/${b.id}`)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all duration-200',
                    'bg-white/[0.03] border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.06]',
                    isDraggable(b) && 'cursor-grab active:cursor-grabbing',
                    dragState?.booking.id === b.id && 'opacity-40 scale-95',
                    hoveredBooking === b.id && 'ring-1 ring-amber-400/30 bg-amber-500/[0.04]'
                  )}
                  onMouseEnter={() => setHoveredBooking(b.id)}
                  onMouseLeave={() => setHoveredBooking(null)}
                  title={`${b.guest?.first_name ?? ''} ${b.guest?.last_name ?? ''} — ${getStatusLabel(b.status)}\n${format(parseISO(b.check_in), 'dd MMM')} → ${format(parseISO(b.check_out), 'dd MMM')} (${nights}N)\nDrag to assign room`}
                >
                  <GripVertical size={12} className="text-silver/40 flex-shrink-0" />
                  <div className={cn(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    b.status === 'confirmed' ? 'bg-blue-400' : b.status === 'pending' ? 'bg-amber-400' : 'bg-emerald-400'
                  )} />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-white truncate">
                      {b.guest?.last_name ?? b.confirmation_code}
                      {b.guest?.first_name ? `, ${b.guest.first_name.charAt(0)}.` : ''}
                    </div>
                    <div className="text-[10px] text-steel truncate">
                      {format(parseISO(b.check_in), 'dd MMM')} — {nights}N · {rtName}
                    </div>
                  </div>
                  <span className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ml-1',
                    b.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                    b.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  )}>
                    {getStatusLabel(b.status)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center py-3 rounded-lg border border-dashed border-white/[0.06] text-steel/50 text-xs font-body">
            {dragState ? (
              <span className="text-amber-400 animate-pulse flex items-center gap-1.5">
                <Inbox size={14} /> Drop here to unassign room
              </span>
            ) : (
              'No unassigned bookings'
            )}
          </div>
        )}
      </div>

      {/* Tape Chart Grid */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="overflow-x-auto" ref={scrollRef}>
          <table className="w-full border-collapse" style={{ minWidth: `${160 + viewSpan * cellPx}px` }}>
            {/* Date Headers */}
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-midnight/95 backdrop-blur border-b border-r border-white/[0.06] px-3 py-2 text-left text-xs font-medium text-silver w-40 min-w-[160px]">
                  Room
                </th>
                {dates.map((d, i) => {
                  const isToday = isSameDay(d, today);
                  const isSun = d.getDay() === 0;
                  const isSat = d.getDay() === 6;
                  return (
                    <th
                      key={i}
                      className={cn(
                        'border-b border-r border-white/[0.06] px-1 py-2 text-center text-xs font-medium min-w-0',
                        cellW,
                        isToday ? 'bg-teal/10 text-teal' : (isSat || isSun) ? 'bg-white/[0.02] text-silver/70' : 'text-silver'
                      )}
                    >
                      <div className="leading-tight">
                        <div className={cn('text-[10px] uppercase', isToday && 'text-teal')}>
                          {format(d, 'EEE')}
                        </div>
                        <div className={cn('font-semibold', isToday && 'text-teal')}>
                          {format(d, 'd')}
                        </div>
                        {(i === 0 || d.getDate() === 1) && (
                          <div className="text-[9px] text-silver/60">{format(d, 'MMM')}</div>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
              {allRoomTypes.map(rt => {
                const typedRooms = roomsByType.get(rt.id) ?? [];
                if (typedRooms.length === 0) return null;
                return (
                  <tbody key={rt.id}>
                    {/* Room type header row */}
                    <tr>
                      <td
                        colSpan={viewSpan + 1}
                        className="sticky left-0 z-10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-teal border-b border-white/[0.06] uppercase tracking-wider"
                      >
                        {rt.name} — £{rt.base_rate}/night
                      </td>
                    </tr>
                    {/* Room rows */}
                    {typedRooms.map(room => {
                      const roomBookings = getBookingsForRoom(room.id);
                      const isDropTarget = dropTargetRoom === room.id && dragState && dragState.sourceRoomId !== room.id;
                      return (
                        <tr
                          key={room.id}
                          className={cn(
                            'group transition-colors',
                            isDropTarget ? 'bg-teal/10' : 'hover:bg-white/[0.02]'
                          )}
                          onDragOver={(e) => handleDragOver(e, room.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, room.id)}
                        >
                          {/* Room label */}
                          <td className={cn(
                            'sticky left-0 z-10 bg-midnight/95 backdrop-blur border-b border-r border-white/[0.06] px-3 py-2 transition-colors',
                            isDropTarget && 'bg-teal/15'
                          )}>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">{room.room_number}</span>
                              {isDropTarget ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal/20 text-teal animate-pulse">
                                  Drop here
                                </span>
                              ) : (
                                <span className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded-full',
                                (room.status === 'maintenance' || room.status === 'blocked' || room.housekeeping_status === 'out_of_order') ? 'bg-amber-500/20 text-amber-400' :
                                room.status === 'available' ? 'bg-emerald-500/20 text-emerald-400' :
                                room.status === 'occupied' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-red-500/20 text-red-400'
                              )}>
                                {room.housekeeping_status === 'clean' ? 'C' : room.housekeeping_status === 'dirty' ? 'D' : room.housekeeping_status === 'inspected' ? 'I' : room.housekeeping_status === 'out_of_order' ? 'OOO' : 'S'}
                              </span>
                              )}
                            </div>
                          </td>
                          {/* Date cells — single spanning cell with overlay for booking blocks */}
                          <td
                            colSpan={viewSpan}
                            className="border-b border-white/[0.06] p-0 h-10 relative"
                          >
                            {/* Background grid lines & shading */}
                            <div className="absolute inset-0 flex">
                              {dates.map((d, i) => {
                                const isToday = isSameDay(d, today);
                                const isSun = d.getDay() === 0;
                                const isSat = d.getDay() === 6;
                                return (
                                  <div
                                    key={i}
                                    style={{ width: `${cellPx}px`, minWidth: `${cellPx}px` }}
                                    className={cn(
                                      'h-full border-r border-white/[0.06]',
                                      isToday && 'bg-teal/[0.04]',
                                      (isSat || isSun) && 'bg-white/[0.01]',
                                      room.status === 'maintenance' && 'bg-amber-500/[0.05]'
                                    )}
                                  />
                                );
                              })}
                            </div>
                            {/* Booking blocks — absolutely positioned within this single container */}
                            {roomBookings.map(b => {
                              const { startOffset, span } = getBookingPosition(b, roomBookings);
                              if (span <= 0) return null;
                              const leftPx = startOffset * cellPx + 2;
                              const widthPx = span * cellPx - 4;
                              return (
                                <div
                                  key={b.id}
                                  draggable={isDraggable(b)}
                                  onDragStart={(e) => handleDragStart(e, b)}
                                  onDragEnd={handleDragEnd}
                                  className={cn(
                                    'absolute top-1 h-8 rounded-md border cursor-pointer flex items-center px-1.5 overflow-hidden whitespace-nowrap transition-all',
                                    getBookingColor(b.status, b.source),
                                    hoveredBooking === b.id && 'ring-2 ring-white/40 scale-[1.02] z-20',
                                    hoveredBooking !== b.id && 'z-10',
                                    isDraggable(b) && 'cursor-grab active:cursor-grabbing',
                                    dragState?.booking.id === b.id && 'opacity-40 scale-95'
                                  )}
                                  style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                                  onClick={() => navigate(`/dashboard/bookings/${b.id}`)}
                                  onMouseEnter={() => setHoveredBooking(b.id)}
                                  onMouseLeave={() => setHoveredBooking(null)}
                                  title={`${b.guest?.first_name ?? ''} ${b.guest?.last_name ?? ''} — ${getStatusLabel(b.status)} — ${b.confirmation_code}${isDraggable(b) ? '\nDrag to move room' : ''}`}
                                >
                                  {isDraggable(b) && viewSpan <= 14 && (
                                    <ArrowRightLeft size={10} className="text-white/60 mr-1 flex-shrink-0" />
                                  )}
                                  <span className="text-[10px] font-medium text-white truncate">
                                    {viewSpan <= 14
                                      ? `${b.guest?.last_name ?? b.confirmation_code}`
                                      : ''
                                    }
                                  </span>
                                </div>
                              );
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                );
              })}
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(() => {
          const todayStr = format(today, 'yyyy-MM-dd');
          const occ = allBookings.filter(b =>
            b.status === 'checked_in' && b.room_id
          ).length;
          const arrivals = allBookings.filter(b =>
            b.check_in === todayStr && (b.status === 'confirmed' || b.status === 'pending')
          ).length;
          const departures = allBookings.filter(b =>
            b.check_out === todayStr && b.status === 'checked_in'
          ).length;
          const totalRooms = allRooms.filter(r => r.status !== 'maintenance').length;
          const occRate = totalRooms > 0 ? Math.round((occ / totalRooms) * 100) : 0;

          return [
            { label: 'Occupied', value: occ, sub: `of ${totalRooms} rooms` },
            { label: 'Occupancy', value: `${occRate}%`, sub: 'today' },
            { label: 'Arrivals', value: arrivals, sub: 'today' },
            { label: 'Departures', value: departures, sub: 'today' },
          ].map(s => (
            <div key={s.label} className="glass-panel rounded-xl p-4 text-center">
              <div className="text-xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-silver">{s.label}</div>
              <div className="text-[10px] text-silver/60">{s.sub}</div>
            </div>
          ));
        })()}
      </div>

      {/* ── Confirm Room Move Dialog ─────────────────────────────── */}
      {pendingMove && (() => {
        const srcType = pendingMove.sourceRoom ? allRoomTypes.find(rt => rt.id === pendingMove.sourceRoom!.room_type_id) : null;
        const tgtType = pendingMove.targetRoom ? allRoomTypes.find(rt => rt.id === pendingMove.targetRoom!.room_type_id) : null;
        const isTypeChange = pendingMove.sourceRoom && pendingMove.targetRoom
          ? pendingMove.sourceRoom.room_type_id !== pendingMove.targetRoom.room_type_id
          : false;
        const isAssignFromShelf = !pendingMove.sourceRoom && !!pendingMove.targetRoom;
        const isUnassignToShelf = !!pendingMove.sourceRoom && !pendingMove.targetRoom;
        const nights = Math.max(1, Math.ceil(
          (new Date(pendingMove.booking.check_out).getTime() - new Date(pendingMove.booking.check_in).getTime()) / 86400000
        ));
        const oldTotal = nights * (pendingMove.booking.nightly_rate ?? srcType?.base_rate ?? 0);
        const newTotal = isTypeChange && tgtType ? nights * tgtType.base_rate : oldTotal;
        const diff = newTotal - oldTotal;

        const dialogTitle = isUnassignToShelf ? 'Unassign Room' : isAssignFromShelf ? 'Assign Room' : 'Confirm Room Move';
        const dialogIcon = isUnassignToShelf ? <Inbox size={20} className="text-amber-400" /> : <ArrowRightLeft size={20} className="text-teal" />;
        const dialogIconBg = isUnassignToShelf ? 'bg-amber-500/15' : 'bg-teal/15';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setPendingMove(null)}>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-md rounded-2xl bg-[#0f1724] border border-white/[0.1] shadow-2xl p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', dialogIconBg)}>
                  {dialogIcon}
                </div>
                <div>
                  <h3 className="text-base font-display font-semibold text-white">{dialogTitle}</h3>
                  <p className="text-xs text-steel font-body mt-0.5">
                    {pendingMove.booking.guest?.first_name} {pendingMove.booking.guest?.last_name} — {pendingMove.booking.confirmation_code}
                  </p>
                </div>
              </div>

              {/* Move details */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    {pendingMove.sourceRoom ? (
                      <>
                        <div className="text-lg font-bold text-white">{pendingMove.sourceRoom.room_number}</div>
                        <div className="text-[10px] text-silver">{srcType?.name ?? 'Room'}</div>
                      </>
                    ) : (
                      <>
                        <div className="text-base font-bold text-amber-400 flex items-center gap-1"><Inbox size={14} /> Unassigned</div>
                        <div className="text-[10px] text-silver">No room</div>
                      </>
                    )}
                  </div>
                  <ArrowRightLeft size={16} className="text-teal mx-4" />
                  <div className="text-center">
                    {pendingMove.targetRoom ? (
                      <>
                        <div className="text-lg font-bold text-teal">{pendingMove.targetRoom.room_number}</div>
                        <div className="text-[10px] text-silver">{tgtType?.name ?? 'Room'}</div>
                      </>
                    ) : (
                      <>
                        <div className="text-base font-bold text-amber-400 flex items-center gap-1"><Inbox size={14} /> Unassigned</div>
                        <div className="text-[10px] text-silver">Remove room</div>
                      </>
                    )}
                  </div>
                </div>

                <div className="border-t border-white/[0.06] pt-3 space-y-1.5 text-sm font-body">
                  <div className="flex justify-between">
                    <span className="text-steel">Dates</span>
                    <span className="text-white">
                      {format(parseISO(pendingMove.booking.check_in), 'dd MMM')} — {format(parseISO(pendingMove.booking.check_out), 'dd MMM yyyy')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-steel">Nights</span>
                    <span className="text-white">{nights}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-steel">Status</span>
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-semibold',
                      pendingMove.booking.status === 'checked_in' ? 'bg-emerald-500/20 text-emerald-400' :
                      pendingMove.booking.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-amber-500/20 text-amber-400'
                    )}>
                      {getStatusLabel(pendingMove.booking.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rate change warning */}
              {isTypeChange && (
                <div className={cn(
                  'rounded-xl p-3 border',
                  diff > 0 ? 'bg-amber-500/5 border-amber-500/10' : 'bg-emerald-500/5 border-emerald-500/10'
                )}>
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className={diff > 0 ? 'text-amber-400' : 'text-emerald-400'} />
                    <p className="text-xs font-body">
                      <span className={diff > 0 ? 'text-amber-300' : 'text-emerald-300'}>
                        {diff > 0 ? 'Upgrade' : 'Downgrade'}: 
                      </span>
                      <span className="text-steel ml-1">
                        £{(srcType?.base_rate ?? 0).toFixed(0)}/night → £{(tgtType?.base_rate ?? 0).toFixed(0)}/night
                      </span>
                      <span className={cn('ml-1 font-semibold', diff > 0 ? 'text-amber-300' : 'text-emerald-300')}>
                        ({diff > 0 ? '+' : ''}£{diff.toFixed(2)} total)
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setPendingMove(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-body text-steel border border-white/[0.08] hover:bg-white/[0.04] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmMove}
                  disabled={assignRoom.isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-body font-semibold text-charcoal bg-teal hover:bg-teal/80 transition-all disabled:opacity-50"
                >
                  {assignRoom.isPending ? 'Processing…' : isUnassignToShelf ? 'Unassign Room' : isAssignFromShelf ? 'Assign Room' : 'Confirm Move'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Dragging overlay hint */}
      {dragState && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-panel rounded-full px-5 py-2.5 shadow-xl border border-teal/20 pointer-events-none animate-pulse">
          <p className="text-xs font-body text-teal flex items-center gap-2">
            <ArrowRightLeft size={14} />
            Dragging <span className="font-semibold text-white">{dragState.booking.guest?.last_name ?? dragState.booking.confirmation_code}</span> — {dragState.sourceRoomId ? 'drop on another room row or unassigned shelf' : 'drop on a room row to assign'}
          </p>
        </div>
      )}
    </div>
  );
}
