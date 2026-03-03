import { useState, useCallback, useMemo, type DragEvent } from 'react';
import {
  BedDouble, User, GripVertical, Check, X, ArrowRight,
  AlertCircle, Calendar, Sparkles,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { Booking, Room, RoomType } from '@/types';

// ============================================================
// Types
// ============================================================

interface PendingMove {
  bookingId: string;
  fromRoomId: string | null;
  toRoomId: string;
}

interface RoomAssignmentBoardProps {
  bookings: Booking[];
  rooms: Room[];
  roomTypes: RoomType[];
  onConfirmMoves: (moves: PendingMove[]) => void;
  isPending: boolean;
}

// ============================================================
// Board
// ============================================================

export function RoomAssignmentBoard({ bookings, rooms, roomTypes, onConfirmMoves, isPending }: RoomAssignmentBoardProps) {
  const [pendingMoves, setPendingMoves] = useState<PendingMove[]>([]);
  const [draggedBookingId, setDraggedBookingId] = useState<string | null>(null);
  const [dragOverRoomId, setDragOverRoomId] = useState<string | null>(null);

  // Only show active bookings that matter for room assignment
  const activeBookings = useMemo(() =>
    bookings.filter((b) =>
      b.status === 'confirmed' || b.status === 'checked_in' || b.status === 'pending'
    ), [bookings]
  );

  // Room type lookup
  const rtMap = useMemo(() => {
    const m: Record<string, RoomType> = {};
    for (const rt of roomTypes) m[rt.id] = rt;
    return m;
  }, [roomTypes]);

  // Build effective assignment: apply pending moves on top of current data
  const effectiveAssignment = useMemo(() => {
    // Start with current room_id from bookings
    const assignment: Record<string, string | null> = {};
    for (const b of activeBookings) {
      assignment[b.id] = b.room_id;
    }
    // Apply pending moves
    for (const move of pendingMoves) {
      assignment[move.bookingId] = move.toRoomId;
    }
    return assignment;
  }, [activeBookings, pendingMoves]);

  // Reverse: room_id → booking
  const roomToBooking = useMemo(() => {
    const m: Record<string, Booking> = {};
    for (const b of activeBookings) {
      const rid = effectiveAssignment[b.id];
      if (rid) m[rid] = b;
    }
    return m;
  }, [activeBookings, effectiveAssignment]);

  // Unassigned bookings
  const unassigned = useMemo(() =>
    activeBookings.filter((b) => !effectiveAssignment[b.id]),
    [activeBookings, effectiveAssignment]
  );

  // Group rooms by type
  const roomsByType = useMemo(() => {
    const grouped: Record<string, Room[]> = {};
    for (const r of rooms) {
      if (!grouped[r.room_type_id]) grouped[r.room_type_id] = [];
      grouped[r.room_type_id]!.push(r);
    }
    // Sort rooms within groups by room number
    for (const key of Object.keys(grouped)) {
      grouped[key]!.sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }));
    }
    return grouped;
  }, [rooms]);

  // Order room types by sort_order
  const orderedTypeIds = useMemo(() =>
    roomTypes.filter((rt) => roomsByType[rt.id]?.length).sort((a, b) => a.sort_order - b.sort_order).map((rt) => rt.id),
    [roomTypes, roomsByType]
  );

  // Has pending changes?
  const hasChanges = pendingMoves.length > 0;

  // ---- Drag handlers ----

  const handleDragStart = useCallback((e: DragEvent, bookingId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', bookingId);
    setDraggedBookingId(bookingId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedBookingId(null);
    setDragOverRoomId(null);
  }, []);

  const handleDragOver = useCallback((e: DragEvent, roomId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverRoomId(roomId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverRoomId(null);
  }, []);

  const handleDrop = useCallback((e: DragEvent, targetRoomId: string) => {
    e.preventDefault();
    const bookingId = e.dataTransfer.getData('text/plain');
    setDragOverRoomId(null);
    setDraggedBookingId(null);

    if (!bookingId) return;

    const booking = activeBookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const targetRoom = rooms.find((r) => r.id === targetRoomId);
    if (!targetRoom) return;

    // Don't drop on maintenance/blocked rooms
    if (targetRoom.status === 'maintenance' || targetRoom.status === 'blocked') return;

    // Check if there's already a booking in the target room
    const currentOccupant = roomToBooking[targetRoomId];

    // Don't drop onto a room that holds a different booking (swap not supported for simplicity)
    if (currentOccupant && currentOccupant.id !== bookingId) return;

    // No-op if already in this room
    const currentRoomId = effectiveAssignment[bookingId];
    if (currentRoomId === targetRoomId) return;

    // Check room type compatibility
    if (targetRoom.room_type_id !== booking.room_type_id) {
      // Allow cross-type moves (upgrades/downgrades) — just let it happen
    }

    // Remove any existing pending move for this booking
    const fromRoomId = booking.room_id; // original room
    setPendingMoves((prev) => {
      const filtered = prev.filter((m) => m.bookingId !== bookingId);
      // If moving back to original room, just remove the pending move
      if (fromRoomId === targetRoomId) return filtered;
      return [...filtered, { bookingId, fromRoomId, toRoomId: targetRoomId }];
    });
  }, [activeBookings, rooms, roomToBooking, effectiveAssignment]);

  // Confirm all pending moves
  const handleConfirm = () => {
    onConfirmMoves(pendingMoves);
    setPendingMoves([]);
  };

  // Discard pending moves
  const handleDiscard = () => {
    setPendingMoves([]);
  };

  // Check if a room has a pending change
  const roomHasPendingChange = (roomId: string) =>
    pendingMoves.some((m) => m.toRoomId === roomId || m.fromRoomId === roomId);

  return (
    <div className="space-y-6">
      {/* Pending changes bar */}
      {hasChanges && (
        <div className="sticky top-0 z-20 glass-panel rounded-xl p-5 border border-gold/20 bg-gold/[0.04] animate-slide-up flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gold/10">
              <Sparkles size={18} className="text-gold" />
            </div>
            <div>
              <p className="text-sm font-body font-semibold text-white">
                {pendingMoves.length} room change{pendingMoves.length !== 1 ? 's' : ''} pending
              </p>
              <p className="text-xs text-steel font-body">Review and confirm to apply changes</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Change summary chips */}
            <div className="hidden md:flex items-center gap-2 flex-wrap">
              {pendingMoves.map((move) => {
                const booking = activeBookings.find((b) => b.id === move.bookingId);
                const fromRoom = rooms.find((r) => r.id === move.fromRoomId);
                const toRoom = rooms.find((r) => r.id === move.toRoomId);
                if (!booking) return null;
                return (
                  <div key={move.bookingId} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[11px] font-body">
                    <span className="text-silver">{booking.guest?.first_name}</span>
                    <span className="text-steel">{fromRoom ? fromRoom.room_number : '—'}</span>
                    <ArrowRight size={10} className="text-gold" />
                    <span className="text-teal font-semibold">{toRoom?.room_number}</span>
                  </div>
                );
              })}
            </div>

            <Button variant="ghost-dark" size="sm" onClick={handleDiscard}>
              <X size={14} className="mr-1" /> Discard
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={isPending}>
              <Check size={14} className="mr-1" /> Confirm Changes
            </Button>
          </div>
        </div>
      )}

      {/* Unassigned bookings */}
      {unassigned.length > 0 && (
        <div className="glass-panel rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={16} className="text-amber-400" />
            <h3 className="text-sm font-body font-semibold text-white">
              Unassigned Bookings
            </h3>
            <span className="text-xs text-steel font-body">— drag to a room below</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((booking) => (
              <DraggableBookingChip
                key={booking.id}
                booking={booking}
                roomTypeName={rtMap[booking.room_type_id]?.name ?? ''}
                isDragging={draggedBookingId === booking.id}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        </div>
      )}

      {/* Room grid by type */}
      {orderedTypeIds.map((typeId) => {
        const rt = rtMap[typeId];
        const typeRooms = roomsByType[typeId] ?? [];
        if (!rt) return null;

        return (
          <div key={typeId} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-display font-semibold text-white">{rt.name}</h3>
              <span className="text-xs text-steel font-body">
                {typeRooms.length} room{typeRooms.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {typeRooms.map((room) => {
                const occupant = roomToBooking[room.id];
                const isUnavailable = room.status === 'maintenance' || room.status === 'blocked';
                const isDragOver = dragOverRoomId === room.id;
                const hasPending = roomHasPendingChange(room.id);
                const moveTarget = pendingMoves.find((m) => m.toRoomId === room.id);
                const isUpgrade = occupant && room.room_type_id !== occupant.room_type_id;

                return (
                  <div
                    key={room.id}
                    onDragOver={isUnavailable ? undefined : (e) => handleDragOver(e, room.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={isUnavailable ? undefined : (e) => handleDrop(e, room.id)}
                    className={cn(
                      'rounded-xl border transition-all duration-200 relative min-h-[120px]',
                      isUnavailable
                        ? 'bg-white/[0.02] border-white/[0.04] opacity-50 cursor-not-allowed'
                        : isDragOver
                          ? 'bg-teal/[0.08] border-teal/30 shadow-glow-teal scale-[1.02]'
                          : hasPending
                            ? 'bg-gold/[0.04] border-gold/20'
                            : occupant
                              ? 'bg-white/[0.04] border-white/[0.08] hover:border-white/[0.12]'
                              : 'bg-white/[0.02] border-dashed border-white/[0.08] hover:border-teal/20 hover:bg-teal/[0.03]',
                    )}
                  >
                    {/* Room header */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-display font-bold',
                          isUnavailable
                            ? 'bg-steel/10 text-steel'
                            : occupant
                              ? 'bg-teal/10 text-teal border border-teal/20'
                              : 'bg-white/[0.06] text-steel border border-white/[0.08]'
                        )}>
                          {room.room_number}
                        </div>
                        <span className="text-[10px] text-steel font-body">F{room.floor ?? '?'}</span>
                      </div>
                      {hasPending && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gold/10 text-gold border border-gold/20">
                          CHANGED
                        </span>
                      )}
                      {isUnavailable && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-steel/10 text-steel border border-steel/20 uppercase">
                          {room.status}
                        </span>
                      )}
                      {isUpgrade && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          UPGRADE
                        </span>
                      )}
                    </div>

                    {/* Content: occupant or empty */}
                    {occupant ? (
                      <DraggableBookingInRoom
                        booking={occupant}
                        isDragging={draggedBookingId === occupant.id}
                        hasPendingMove={!!moveTarget}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      />
                    ) : (
                      <div className={cn(
                        'flex items-center justify-center h-[72px] transition-all duration-200',
                        isDragOver ? 'text-teal' : 'text-steel/30'
                      )}>
                        {isDragOver ? (
                          <div className="flex items-center gap-2 text-xs font-body text-teal animate-pulse-soft">
                            <BedDouble size={16} />
                            Drop here
                          </div>
                        ) : (
                          <BedDouble size={20} className="opacity-30" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Draggable Booking Chip (unassigned sidebar)
// ============================================================

interface DraggableBookingChipProps {
  booking: Booking;
  roomTypeName: string;
  isDragging: boolean;
  onDragStart: (e: DragEvent, id: string) => void;
  onDragEnd: () => void;
}

function DraggableBookingChip({ booking, roomTypeName, isDragging, onDragStart, onDragEnd }: DraggableBookingChipProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, booking.id)}
      onDragEnd={onDragEnd}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-grab active:cursor-grabbing transition-all duration-200 select-none',
        isDragging
          ? 'opacity-40 bg-teal/5 border-teal/20'
          : 'bg-white/[0.04] border-white/[0.08] hover:border-gold/20 hover:bg-white/[0.06]'
      )}
    >
      <GripVertical size={14} className="text-steel/50 shrink-0" />
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold/30 to-teal/20 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
        {booking.guest?.first_name?.[0]}{booking.guest?.last_name?.[0]}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-body font-medium text-white truncate">
          {booking.guest?.first_name} {booking.guest?.last_name}
        </p>
        <p className="text-[10px] text-steel font-body truncate">
          {roomTypeName} · {formatDate(booking.check_in, 'dd MMM')} – {formatDate(booking.check_out, 'dd MMM')}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Draggable Booking inside Room Card
// ============================================================

interface DraggableBookingInRoomProps {
  booking: Booking;
  isDragging: boolean;
  hasPendingMove: boolean;
  onDragStart: (e: DragEvent, id: string) => void;
  onDragEnd: () => void;
}

function DraggableBookingInRoom({ booking, isDragging, hasPendingMove, onDragStart, onDragEnd }: DraggableBookingInRoomProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, booking.id)}
      onDragEnd={onDragEnd}
      className={cn(
        'px-3 py-2.5 cursor-grab active:cursor-grabbing select-none transition-all duration-200',
        isDragging ? 'opacity-30' : hasPendingMove ? 'bg-gold/[0.03]' : ''
      )}
    >
      <div className="flex items-center gap-2.5">
        <GripVertical size={12} className="text-steel/40 shrink-0" />
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold/30 to-teal/20 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
          {booking.guest?.first_name?.[0]}{booking.guest?.last_name?.[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-body font-medium text-white truncate">
            {booking.guest?.first_name} {booking.guest?.last_name}
          </p>
          <div className="flex items-center gap-1 text-[10px] text-steel font-body">
            <Calendar size={9} />
            <span className="truncate">
              {formatDate(booking.check_in, 'dd MMM')} – {formatDate(booking.check_out, 'dd MMM')}
            </span>
          </div>
        </div>
        <User size={12} className="text-steel/40 shrink-0" />
      </div>
    </div>
  );
}
