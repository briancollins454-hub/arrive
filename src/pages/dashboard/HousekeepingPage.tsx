import { useState, useMemo, useCallback } from 'react';
import {
  SprayCan, CheckCircle2, Sparkles, AlertTriangle,
  Eye, Clock, BedDouble, ArrowUpDown, LogOut, Wrench,
  ShieldCheck, Ban, ChevronDown, ChevronUp, MessageSquare,
  Users, AlertCircle, Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRooms } from '@/hooks/useRooms';
import { useBookings } from '@/hooks/useBookings';
import { exportCSV } from '@/lib/exportUtils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import type { Room, HousekeepingStatus } from '@/types';

// ============================================================
// Section definitions
// ============================================================

type SectionKey = 'departed' | 'needs_servicing' | 'serviced' | 'service_refused' | 'clean' | 'out_of_order';

interface SectionConfig {
  label: string;
  sublabel: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ElementType;
}

const sectionConfig: Record<SectionKey, SectionConfig> = {
  departed: {
    label: 'Departed',
    sublabel: 'Checked-out rooms awaiting cleaning',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    icon: LogOut,
  },
  needs_servicing: {
    label: 'Needs Servicing',
    sublabel: 'Occupied rooms due for daily service',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: SprayCan,
  },
  serviced: {
    label: 'Serviced',
    sublabel: 'Occupied rooms already serviced today',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    icon: Sparkles,
  },
  service_refused: {
    label: 'Service Refused',
    sublabel: 'Guest declined housekeeping',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    icon: Ban,
  },
  clean: {
    label: 'Clean & Ready',
    sublabel: 'Vacant rooms ready to sell',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: ShieldCheck,
  },
  out_of_order: {
    label: 'Out of Order',
    sublabel: 'Rooms under maintenance',
    color: 'text-steel',
    bg: 'bg-steel/10',
    border: 'border-steel/20',
    icon: Wrench,
  },
};

const sectionOrder: SectionKey[] = ['departed', 'needs_servicing', 'serviced', 'service_refused', 'clean', 'out_of_order'];

// ============================================================
// Helpers
// ============================================================

function classifyRoom(
  room: Room,
  _bookingInfo?: { guestName: string; checkIn: string; checkOut: string; status: string; isLongStay: boolean }
): SectionKey {
  // Out of order / maintenance / blocked — any of these signals mean room is unavailable
  if (room.housekeeping_status === 'out_of_order' || room.status === 'maintenance' || room.status === 'blocked') {
    return 'out_of_order';
  }

  const isOccupied = room.status === 'occupied';

  // Occupied rooms — split by housekeeping status
  if (isOccupied) {
    if (room.housekeeping_status === 'serviced') return 'serviced';
    if (room.housekeeping_status === 'service_refused') return 'service_refused';
    if (room.housekeeping_status === 'clean' || room.housekeeping_status === 'inspected') return 'serviced';
    // Remaining occupied rooms (dirty) = needs servicing
    return 'needs_servicing';
  }

  // Not occupied + dirty = departed (checked out, needs cleaning)
  if (room.housekeeping_status === 'dirty') return 'departed';

  // Not occupied + clean / inspected = ready
  return 'clean';
}

// ============================================================
// Component
// ============================================================

export function HousekeepingPage() {
  const { rooms, roomTypes, isLoadingRooms, updateHousekeepingStatus } = useRooms();
  const { bookings } = useBookings();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<'room' | 'floor'>('room');

  // Attendant assignment
  const [attendants] = useState([
    { id: 'att-1', name: 'Maria Santos', section: 'Floors 1-2', rooms_assigned: 8, rooms_completed: 5 },
    { id: 'att-2', name: 'Anna Kowalski', section: 'Floors 3-4', rooms_assigned: 7, rooms_completed: 3 },
    { id: 'att-3', name: 'Priya Sharma', section: 'Floors 5-6', rooms_assigned: 6, rooms_completed: 6 },
    { id: 'att-4', name: 'Elena Popov', section: 'Suites', rooms_assigned: 4, rooms_completed: 1 },
  ]);
  const [roomAssignments] = useState<Record<string, string>>({});
  const [showAttendantPanel, setShowAttendantPanel] = useState(false);
  const [showDiscrepancy, setShowDiscrepancy] = useState(false);

  // Refusal dialog state
  const [refusalDialog, setRefusalDialog] = useState<{ open: boolean; roomId: string; roomNumber: string }>({
    open: false, roomId: '', roomNumber: '',
  });
  const [refusalReason, setRefusalReason] = useState('');

  // Build a map of room_id → booking info for context (prioritise checked_in over confirmed)
  const roomBookingMap = useMemo(() => {
    const map: Record<string, { guestName: string; checkIn: string; checkOut: string; status: string; isLongStay: boolean }> = {};
    const statusPriority: Record<string, number> = { checked_in: 3, confirmed: 2, pending: 1 };
    for (const b of bookings) {
      if (!b.room_id) continue;
      if (b.status === 'cancelled' || b.status === 'no_show') continue;
      const existing = map[b.room_id];
      if (existing && (statusPriority[existing.status] ?? 0) >= (statusPriority[b.status] ?? 0)) continue;
      const nights = Math.ceil(
        (new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000
      );
      map[b.room_id] = {
        guestName: b.guest ? `${b.guest.first_name} ${b.guest.last_name}` : 'Unknown',
        checkIn: b.check_in,
        checkOut: b.check_out,
        status: b.status,
        isLongStay: nights >= 3,
      };
    }
    return map;
  }, [bookings]);

  // Room type name lookup
  const rtMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const rt of roomTypes) m[rt.id] = rt.name;
    return m;
  }, [roomTypes]);

  // Group rooms into sections
  const sections = useMemo(() => {
    const grouped: Record<SectionKey, Room[]> = {
      departed: [],
      needs_servicing: [],
      serviced: [],
      service_refused: [],
      clean: [],
      out_of_order: [],
    };

    for (const room of rooms) {
      const section = classifyRoom(room, roomBookingMap[room.id]);
      grouped[section].push(room);
    }

    // Sort within each section
    for (const key of sectionOrder) {
      grouped[key].sort((a, b) => {
        if (sortBy === 'room') return a.room_number.localeCompare(b.room_number, undefined, { numeric: true });
        return (a.floor ?? 0) - (b.floor ?? 0);
      });
    }

    return grouped;
  }, [rooms, roomBookingMap, sortBy]);

  // Section counts
  const counts = useMemo(() => {
    const c: Record<SectionKey, number> = { departed: 0, needs_servicing: 0, serviced: 0, service_refused: 0, clean: 0, out_of_order: 0 };
    for (const key of sectionOrder) c[key] = sections[key].length;
    return c;
  }, [sections]);

  const toggleSection = useCallback((key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleStatusChange = useCallback((roomId: string, status: HousekeepingStatus, notes?: string) => {
    updateHousekeepingStatus.mutate({ roomId, status, notes });
  }, [updateHousekeepingStatus]);

  const openRefusalDialog = useCallback((roomId: string, roomNumber: string) => {
    setRefusalReason('');
    setRefusalDialog({ open: true, roomId, roomNumber });
  }, []);

  const submitRefusal = useCallback(() => {
    if (!refusalDialog.roomId) return;
    const reason = refusalReason.trim() || 'No reason provided';
    handleStatusChange(refusalDialog.roomId, 'service_refused', `Refused: ${reason}`);
    setRefusalDialog({ open: false, roomId: '', roomNumber: '' });
    setRefusalReason('');
  }, [refusalDialog.roomId, refusalReason, handleStatusChange]);

  if (isLoadingRooms) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 mesh-gradient min-h-full">
      <div className="dot-grid absolute inset-0 pointer-events-none" />

      {/* Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-teal/20 to-teal/5 border border-teal/20">
              <SprayCan size={20} className="text-teal sm:w-[22px] sm:h-[22px]" />
            </div>
            Housekeeping
          </h1>
          <p className="text-xs sm:text-sm text-steel mt-1 font-body">Room service board — grouped by priority</p>
        </div>

        <button
          onClick={() => setSortBy((s) => s === 'room' ? 'floor' : 'room')}
          className="flex items-center gap-2 px-3 py-2.5 sm:py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] active:bg-white/[0.1] text-steel hover:text-silver text-xs font-body transition-all duration-200 self-start sm:self-auto touch-manipulation"
        >
          <ArrowUpDown size={14} />
          Sort: {sortBy === 'room' ? 'Room №' : 'Floor'}
        </button>
        <div className="flex gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowAttendantPanel(!showAttendantPanel)}
            className={cn(
              'flex items-center gap-2 px-3 py-2.5 sm:py-2 rounded-xl border text-xs font-body transition-all duration-200 touch-manipulation',
              showAttendantPanel ? 'bg-teal/10 border-teal/20 text-teal' : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-steel hover:text-silver'
            )}
          >
            <Users size={14} />
            Attendants
          </button>
          <button
            onClick={() => setShowDiscrepancy(!showDiscrepancy)}
            className={cn(
              'flex items-center gap-2 px-3 py-2.5 sm:py-2 rounded-xl border text-xs font-body transition-all duration-200 touch-manipulation',
              showDiscrepancy ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-steel hover:text-silver'
            )}
          >
            <AlertCircle size={14} />
            Discrepancy
          </button>
          <button
            onClick={() => {
              const rows = rooms.map(r => ({
                'Room': r.room_number,
                'Floor': r.floor ?? '',
                'Status': r.status,
                'HK Status': r.housekeeping_status,
                'Attendant': roomAssignments[r.id] ?? 'Unassigned',
                'Notes': r.notes ?? '',
              }));
              exportCSV(rows, `housekeeping-${format(new Date(), 'yyyy-MM-dd')}`);
              toast.success('Housekeeping report exported');
            }}
            className="flex items-center gap-2 px-3 py-2.5 sm:py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-steel hover:text-silver text-xs font-body transition-all duration-200 touch-manipulation"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="relative grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {sectionOrder.map((key, i) => {
          const config = sectionConfig[key];
          const SIcon = config.icon;
          return (
            <button
              key={key}
              className={cn(
                'glass-panel p-3 sm:p-5 rounded-xl cursor-pointer transition-all duration-200 text-left touch-manipulation active:scale-[0.97]',
                `animate-stagger-${i + 1}`,
                !collapsedSections[key] && counts[key] > 0 ? `ring-1 ${config.border}` : 'hover:bg-white/[0.06]'
              )}
              onClick={() => {
                // Expand section if collapsed, then scroll to it
                if (collapsedSections[key]) {
                  setCollapsedSections((prev) => ({ ...prev, [key]: false }));
                }
                // Small delay to let React render the expanded section before scrolling
                setTimeout(() => {
                  const el = document.getElementById(`hk-section-${key}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);
              }}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                <SIcon size={14} className={cn(config.color, 'sm:w-4 sm:h-4')} />
                <span className={cn('text-[10px] sm:text-xs font-body font-medium truncate', config.color)}>{config.label}</span>
              </div>
              <p className="text-xl sm:text-2xl font-display font-bold text-white">{counts[key]}</p>
            </button>
          );
        })}
      </div>

      {/* Attendant Assignment Panel */}
      {showAttendantPanel && (
        <div className="relative glass-panel rounded-xl p-4 sm:p-5 border border-teal/20">
          <h3 className="text-sm font-display font-semibold text-white mb-3 flex items-center gap-2">
            <Users size={15} className="text-teal" />
            Attendant Assignments
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {attendants.map(att => {
              const progressPct = att.rooms_assigned > 0 ? (att.rooms_completed / att.rooms_assigned) * 100 : 0;
              return (
                <div key={att.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-teal/10 border border-teal/20 flex items-center justify-center text-[10px] font-display font-bold text-teal">
                      {att.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-xs font-body font-medium text-white">{att.name}</p>
                      <p className="text-[10px] text-steel font-body">{att.section}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-white/[0.06]">
                      <div className={cn('h-full rounded-full transition-all', progressPct === 100 ? 'bg-emerald-400' : 'bg-teal')} style={{ width: `${progressPct}%` }} />
                    </div>
                    <span className="text-[10px] text-steel font-body">{att.rooms_completed}/{att.rooms_assigned}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <select
              className="input-dark text-xs py-1.5 px-3 rounded-xl bg-charcoal border border-white/[0.06] flex-1 max-w-[200px]"
              onChange={(e) => {
                const att = attendants.find(a => a.id === e.target.value);
                if (att) toast.success(`Selected ${att.name} — click rooms to assign`);
              }}
            >
              <option value="">Select attendant to assign</option>
              {attendants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <p className="text-[11px] text-steel font-body">Select attendant, then click rooms to assign</p>
          </div>
        </div>
      )}

      {/* Discrepancy Report */}
      {showDiscrepancy && (
        <div className="relative glass-panel rounded-xl p-4 sm:p-5 border border-amber-500/20">
          <h3 className="text-sm font-display font-semibold text-white mb-3 flex items-center gap-2">
            <AlertCircle size={15} className="text-amber-400" />
            Room Discrepancy Report
          </h3>
          <p className="text-xs text-steel font-body mb-3">
            Rooms where PMS status and housekeeping status don't match — requires investigation.
          </p>
          {(() => {
            const discrepancies = rooms.filter(r => {
              // Occupied in PMS but clean/inspected in HK (should be occupied)
              if (r.status === 'occupied' && (r.housekeeping_status === 'clean' || r.housekeeping_status === 'inspected')) return true;
              // Available in PMS but dirty in HK (should be clean)
              if (r.status === 'available' && r.housekeeping_status === 'dirty') return true;
              return false;
            });
            if (discrepancies.length === 0) {
              return (
                <div className="text-center py-6">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-400 mb-2" />
                  <p className="text-xs text-emerald-400 font-body">No discrepancies found — all rooms match</p>
                </div>
              );
            }
            return (
              <div className="space-y-1.5">
                {discrepancies.map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-500/[0.03] border border-amber-500/10 text-xs font-body">
                    <span className="text-white font-semibold">Room {r.room_number}</span>
                    <span className="text-steel">PMS: <span className="text-amber-400 capitalize">{r.status}</span></span>
                    <span className="text-steel">HK: <span className="text-amber-400 capitalize">{r.housekeeping_status}</span></span>
                    <span className="text-steel/60 ml-auto italic">Needs inspection</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Sections */}
      {sectionOrder.map((key) => {
        const config = sectionConfig[key];
        const sectionRooms = sections[key];
        const isCollapsed = collapsedSections[key];
        const SIcon = config.icon;

        if (sectionRooms.length === 0) return null;

        return (
          <div key={key} id={`hk-section-${key}`} className="relative space-y-3 scroll-mt-6">
            {/* Section header */}
            <button
              onClick={() => toggleSection(key)}
              className="flex items-center gap-3 w-full group"
            >
              <div className={cn('p-2 rounded-lg border', config.bg, config.border)}>
                <SIcon size={16} className={config.color} />
              </div>
              <div className="text-left flex-1">
                <h2 className={cn('text-sm font-display font-bold', config.color)}>
                  {config.label}
                  <span className="ml-2 text-xs font-body font-normal text-steel">
                    ({sectionRooms.length} {sectionRooms.length === 1 ? 'room' : 'rooms'})
                  </span>
                </h2>
                <p className="text-[11px] text-steel font-body">{config.sublabel}</p>
              </div>
              {isCollapsed ? (
                <ChevronDown size={16} className="text-steel group-hover:text-silver transition-colors" />
              ) : (
                <ChevronUp size={16} className="text-steel group-hover:text-silver transition-colors" />
              )}
            </button>

            {/* Section content */}
            {!isCollapsed && (
              <div className="grid gap-2 sm:gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {sectionRooms.map((room, i) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    section={key}
                    roomTypeName={rtMap[room.room_type_id] ?? 'Unknown'}
                    bookingInfo={roomBookingMap[room.id]}
                    onStatusChange={handleStatusChange}
                    onRefuseService={openRefusalDialog}
                    animDelay={i}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Empty state */}
      {rooms.length > 0 && sectionOrder.every((k) => sections[k].length === 0) && (
        <div className="text-center py-16">
          <SprayCan size={48} className="mx-auto text-steel/30 mb-4" />
          <p className="text-steel text-sm font-body">All rooms accounted for</p>
        </div>
      )}

      {/* Refusal Reason Dialog */}
      {refusalDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Service refusal reason">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => setRefusalDialog({ open: false, roomId: '', roomNumber: '' })}
          />
          <div className="relative glass-panel rounded-2xl border border-white/[0.08] p-6 w-full max-w-md mx-4 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <Ban size={20} className="text-orange-400" />
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-white">Service Refused</h3>
                <p className="text-xs text-steel font-body">Room {refusalDialog.roomNumber}</p>
              </div>
            </div>

            <label className="block mb-2">
              <span className="text-xs text-silver font-body font-medium">Reason for refusal</span>
            </label>
            <textarea
              value={refusalReason}
              onChange={(e) => setRefusalReason(e.target.value)}
              placeholder="e.g. Guest requested privacy, Do Not Disturb, Guest sleeping..."
              rows={3}
              autoFocus
              className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 text-sm text-white font-body placeholder:text-white/20 placeholder:italic focus:outline-none focus:ring-1 focus:ring-orange-500/30 focus:border-orange-500/20 transition-all duration-200 resize-none"
            />

            {/* Quick reasons */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {['Do Not Disturb', 'Guest sleeping', 'Guest requested privacy', 'Late check-out'].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setRefusalReason(reason)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-body font-medium border transition-all duration-200',
                    refusalReason === reason
                      ? 'bg-orange-500/15 border-orange-500/25 text-orange-400'
                      : 'bg-white/[0.03] border-white/[0.06] text-steel hover:text-silver hover:bg-white/[0.06]'
                  )}
                >
                  {reason}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setRefusalDialog({ open: false, roomId: '', roomNumber: '' })}
                className="px-4 py-2 rounded-xl text-xs font-body font-medium text-steel hover:text-silver border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={submitRefusal}
                className="px-4 py-2 rounded-xl text-xs font-body font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 transition-all duration-200"
              >
                Record Refusal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Room Card
// ============================================================

interface RoomCardProps {
  room: Room;
  section: SectionKey;
  roomTypeName: string;
  bookingInfo?: { guestName: string; checkIn: string; checkOut: string; status: string; isLongStay: boolean };
  onStatusChange: (roomId: string, status: HousekeepingStatus, notes?: string) => void;
  onRefuseService: (roomId: string, roomNumber: string) => void;
  animDelay: number;
}

function RoomCard({ room, section, roomTypeName, bookingInfo, onStatusChange, onRefuseService, animDelay }: RoomCardProps) {
  const isOccupied = room.status === 'occupied';
  const isLongStay = bookingInfo?.isLongStay ?? false;

  // Section-based styling
  const config = sectionConfig[section];
  const SIcon = config.icon;

  // Context label per section
  let contextLabel = config.label;
  let contextColor = config.color;
  if (section === 'needs_servicing' && isLongStay) {
    contextLabel = 'Long Stay';
    contextColor = 'text-blue-400';
  } else if (section === 'needs_servicing') {
    contextLabel = 'Occupied';
    contextColor = 'text-amber-400';
  }

  // Determine which action buttons to show based on section
  const actions: { label: string; status: HousekeepingStatus; icon: React.ElementType; variant: string; notes?: string; isRefusal?: boolean }[] = [];

  if (section === 'departed') {
    actions.push({ label: 'Mark Clean', status: 'clean', icon: CheckCircle2, variant: 'emerald' });
  }

  if (section === 'needs_servicing') {
    actions.push({ label: 'Mark Serviced', status: 'serviced', icon: Sparkles, variant: 'blue' });
    actions.push({ label: 'Service Refused', status: 'service_refused', icon: Ban, variant: 'orange', isRefusal: true });
  }

  if (section === 'serviced') {
    actions.push({ label: 'Needs Re-service', status: 'dirty', icon: AlertTriangle, variant: 'red' });
  }

  if (section === 'service_refused') {
    actions.push({ label: 'Mark Serviced', status: 'serviced', icon: Sparkles, variant: 'blue' });
  }

  if (section === 'clean') {
    if (room.housekeeping_status === 'clean') {
      actions.push({ label: 'Inspect', status: 'inspected', icon: Eye, variant: 'teal' });
    }
    actions.push({ label: 'Mark Dirty', status: 'dirty', icon: AlertTriangle, variant: 'red' });
  }

  if (section === 'out_of_order') {
    actions.push({ label: 'Mark Clean', status: 'clean', icon: CheckCircle2, variant: 'emerald' });
  }

  const variantStyles: Record<string, string> = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20',
    teal: 'bg-teal/10 border-teal/20 text-teal hover:bg-teal/20',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20',
    orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20',
    red: 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20',
  };

  return (
    <div
      className={cn(
        'glass-panel rounded-xl overflow-hidden transition-all duration-300 hover:shadow-card-hover group',
        animDelay < 8 && `animate-stagger-${animDelay + 1}`
      )}
    >
      {/* Header strip */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-3.5 border-b border-white/[0.06] gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-sm border',
            config.bg, config.border, config.color
          )}>
            {room.room_number}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-body font-semibold text-white">{roomTypeName}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {room.floor && (
                <span className="text-[11px] text-steel font-body">Floor {room.floor}</span>
              )}
              <span className="text-[11px] text-steel font-body">·</span>
              <span className={cn('text-[11px] font-body font-medium', contextColor)}>{contextLabel}</span>
              {isLongStay && section === 'needs_servicing' && (
                <span className="px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-semibold">
                  LONG STAY
                </span>
              )}
            </div>
          </div>
        </div>

        <div className={cn(
          'flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-body font-medium border whitespace-nowrap shrink-0',
          config.bg, config.border, config.color
        )}>
          <SIcon size={10} />
          {config.label}
        </div>
      </div>

      {/* Guest info for occupied / departed */}
      {bookingInfo && (isOccupied || bookingInfo.status === 'checked_out' || section === 'departed') && (
        <div className="px-3 sm:px-5 py-3 border-b border-white/[0.04] bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold/30 to-teal/20 flex items-center justify-center text-[10px] font-bold text-white">
              {bookingInfo.guestName.split(' ').map((n) => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-body font-medium text-silver truncate">{bookingInfo.guestName}</p>
              <div className="flex items-center gap-1 text-[10px] text-steel font-body">
                <Clock size={10} />
                {bookingInfo.checkIn} → {bookingInfo.checkOut}
                {isLongStay && (
                  <span className="ml-1 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-semibold">
                    LONG STAY
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes — especially for service_refused to show reason */}
      {room.notes && (
        <div className={cn(
          'px-3 sm:px-5 py-3 border-b border-white/[0.04]',
          section === 'service_refused' && 'bg-orange-500/[0.03]'
        )}>
          <div className="flex items-start gap-2">
            {section === 'service_refused' && <MessageSquare size={12} className="text-orange-400 mt-0.5 flex-shrink-0" />}
            <p className={cn(
              'text-[11px] italic font-body',
              section === 'service_refused' ? 'text-orange-400/80' : 'text-steel'
            )}>
              {room.notes}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <div className="px-3 sm:px-5 py-3 sm:py-3.5 flex flex-wrap gap-2">
          {actions.map((action) => {
            const ActionIcon = action.icon;

            if (action.isRefusal) {
              return (
                <button
                  key="refuse"
                  onClick={() => onRefuseService(room.id, room.room_number)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2.5 sm:py-1.5 rounded-lg text-[11px] font-body font-semibold border transition-all duration-200 touch-manipulation active:scale-[0.97]',
                    variantStyles[action.variant]
                  )}
                >
                  <ActionIcon size={12} />
                  {action.label}
                </button>
              );
            }

            return (
              <button
                key={action.status}
                onClick={() => onStatusChange(room.id, action.status, action.notes)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2.5 sm:py-1.5 rounded-lg text-[11px] font-body font-semibold border transition-all duration-200 touch-manipulation active:scale-[0.97]',
                  variantStyles[action.variant]
                )}
              >
                <ActionIcon size={12} />
                {action.label}
              </button>
            );
          })}
        </div>
      )}

      {/* No-action fallback */}
      {actions.length === 0 && (
        <div className="px-4 py-3 flex items-center gap-2">
          <BedDouble size={14} className="text-steel/40" />
          <span className="text-[11px] text-steel/60 font-body">No actions available</span>
        </div>
      )}
    </div>
  );
}
