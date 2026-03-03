import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isPast } from 'date-fns';
import {
  Users, Plus, Phone, Mail, X, BedDouble, UserPlus, ExternalLink,
  ChevronDown, ChevronUp, Clock, CheckCircle, AlertTriangle, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useGroupBookings } from '@/hooks/useGroupBookings';
import { useBookings } from '@/hooks/useBookings';
import { useRooms } from '@/hooks/useRooms';
import type { GroupStatus, GroupBooking, Booking, Room } from '@/types';
import toast from 'react-hot-toast';

const statusConfig: Record<GroupStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  tentative: { label: 'Tentative', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Clock },
  definite: { label: 'Definite', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertTriangle },
};

// ──────────────────────────────────────────────────────
// Room Assignment sub-component
// ──────────────────────────────────────────────────────
interface RoomAssignmentPanelProps {
  group: GroupBooking;
  allBookings: Booking[];
  allRooms: Room[];
  roomTypes: { id: string; name: string; base_rate: number }[];
  nights: number;
  onAssignRoom: (guestRow: GuestRow) => void;
  onRemoveBooking: (bookingId: string) => void;
  onUpdateRate: (bookingId: string, newRate: number) => void;
}

interface GuestRow {
  firstName: string;
  lastName: string;
  email: string;
  roomTypeId: string;
  roomId: string;
  rate: number;
}

const emptyGuestRow: GuestRow = { firstName: '', lastName: '', email: '', roomTypeId: '', roomId: '', rate: 0 };

function RoomAssignmentPanel({ group, allBookings, allRooms, roomTypes, nights, onAssignRoom, onRemoveBooking, onUpdateRate }: RoomAssignmentPanelProps) {
  const navigate = useNavigate();
  const [showAddRow, setShowAddRow] = useState(false);
  const [guestRow, setGuestRow] = useState<GuestRow>({ ...emptyGuestRow });
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [editRateValue, setEditRateValue] = useState<number>(0);

  // Find bookings linked to this group
  const linkedBookings = useMemo(() => {
    return allBookings.filter(b => group.booking_ids.includes(b.id));
  }, [allBookings, group.booking_ids]);

  // Find available rooms for the selected room type that don't conflict with group dates
  const availableRooms = useMemo(() => {
    if (!guestRow.roomTypeId) return [];
    const gIn = parseISO(group.check_in);
    const gOut = parseISO(group.check_out);

    return allRooms
      .filter(r => r.room_type_id === guestRow.roomTypeId && r.status !== 'maintenance')
      .filter(r => {
        // Check no conflicting booking on these dates
        const conflict = allBookings.some(b => {
          if (b.room_id !== r.id) return false;
          if (b.status === 'cancelled' || b.status === 'no_show' || b.status === 'checked_out') return false;
          const bIn = parseISO(b.check_in);
          const bOut = parseISO(b.check_out);
          return bIn < gOut && bOut > gIn;
        });
        return !conflict;
      })
      .sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }));
  }, [guestRow.roomTypeId, allRooms, allBookings, group.check_in, group.check_out]);

  const canAdd = guestRow.firstName.trim() && guestRow.lastName.trim() && guestRow.roomTypeId && guestRow.roomId;
  const slotsRemaining = group.rooms_blocked - group.booking_ids.length;

  const handleAdd = () => {
    if (!canAdd) return;
    onAssignRoom(guestRow);
    setGuestRow({ ...emptyGuestRow });
    setShowAddRow(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs text-silver uppercase tracking-wider flex items-center gap-1.5">
          <BedDouble className="w-3.5 h-3.5" /> Room Assignments
          <span className="text-teal">({linkedBookings.length}/{group.rooms_blocked})</span>
        </h4>
        {slotsRemaining > 0 && group.status !== 'cancelled' && (
          <Button variant="outline-dark" size="sm" onClick={() => setShowAddRow(true)}>
            <UserPlus className="w-3 h-3 mr-1" /> Add Guest
          </Button>
        )}
      </div>

      {/* Linked bookings table */}
      {linkedBookings.length > 0 && (
        <div className="rounded-lg border border-white/[0.06] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.03]">
                <th className="text-left px-3 py-2 text-xs text-silver font-medium">#</th>
                <th className="text-left px-3 py-2 text-xs text-silver font-medium">Guest</th>
                <th className="text-left px-3 py-2 text-xs text-silver font-medium">Room</th>
                <th className="text-left px-3 py-2 text-xs text-silver font-medium">Type</th>
                <th className="text-left px-3 py-2 text-xs text-silver font-medium">Status</th>
                <th className="text-left px-3 py-2 text-xs text-silver font-medium">Rate</th>
                <th className="text-right px-3 py-2 text-xs text-silver font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {linkedBookings.map((b, i) => {
                const room = allRooms.find(r => r.id === b.room_id);
                const rt = roomTypes.find(t => t.id === b.room_type_id);
                return (
                  <tr key={b.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-2 text-silver">{i + 1}</td>
                    <td className="px-3 py-2 text-white">
                      {b.guest ? `${b.guest.first_name} ${b.guest.last_name}` : 'Guest'}
                    </td>
                    <td className="px-3 py-2">
                      {room ? (
                        <span className="text-teal font-medium">{room.room_number}</span>
                      ) : (
                        <span className="text-amber-400 text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-silver text-xs">{rt?.name ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                        b.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                        b.status === 'checked_in' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-slate-500/20 text-slate-400'
                      )}>
                        {b.status === 'checked_in' ? 'In-House' : b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {editingRateId === b.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-teal text-xs">£</span>
                          <input
                            type="number"
                            min={0}
                            className="input-dark w-16 text-xs py-0.5 px-1"
                            value={editRateValue}
                            onChange={e => setEditRateValue(Number(e.target.value))}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                onUpdateRate(b.id, editRateValue);
                                setEditingRateId(null);
                              }
                              if (e.key === 'Escape') setEditingRateId(null);
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => { onUpdateRate(b.id, editRateValue); setEditingRateId(null); }}
                            className="text-emerald-400 hover:text-emerald-300 text-xs"
                            title="Save"
                          >✓</button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingRateId(b.id); setEditRateValue(b.nightly_rate); }}
                          className="text-teal text-xs hover:underline cursor-pointer"
                          title="Click to edit rate"
                        >
                          £{b.nightly_rate}/n
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/dashboard/bookings/${b.id}`)}
                          className="p-1 rounded hover:bg-white/[0.06] text-silver hover:text-white transition-colors"
                          title="View booking"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        {b.status === 'confirmed' && (
                          <button
                            onClick={() => onRemoveBooking(b.id)}
                            className="p-1 rounded hover:bg-red-500/10 text-silver hover:text-red-400 transition-colors"
                            title="Remove from group"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {linkedBookings.length === 0 && !showAddRow && (
        <div className="rounded-lg border border-dashed border-white/10 p-4 text-center">
          <BedDouble className="w-5 h-5 mx-auto mb-1.5 text-silver/40" />
          <p className="text-xs text-silver">No rooms assigned yet</p>
          <p className="text-[10px] text-silver/60 mt-0.5">Add guests and assign rooms to create individual bookings</p>
        </div>
      )}

      {/* Add Guest + Assign Room Row */}
      {showAddRow && (
        <div className="rounded-lg border border-teal/20 bg-teal/[0.03] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-medium text-teal">Add Guest & Assign Room</h5>
            <button onClick={() => { setShowAddRow(false); setGuestRow({ ...emptyGuestRow }); }} className="text-silver hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] text-silver mb-0.5">First Name *</label>
              <input
                className="input-dark w-full text-sm"
                placeholder="First name"
                value={guestRow.firstName}
                onChange={e => setGuestRow(g => ({ ...g, firstName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[10px] text-silver mb-0.5">Last Name *</label>
              <input
                className="input-dark w-full text-sm"
                placeholder="Last name"
                value={guestRow.lastName}
                onChange={e => setGuestRow(g => ({ ...g, lastName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[10px] text-silver mb-0.5">Email</label>
              <input
                className="input-dark w-full text-sm"
                type="email"
                placeholder="guest@email.com"
                value={guestRow.email}
                onChange={e => setGuestRow(g => ({ ...g, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[10px] text-silver mb-0.5">Room Type *</label>
              <select
                className="input-dark w-full text-sm"
                value={guestRow.roomTypeId}
                onChange={e => {
                  const rtId = e.target.value;
                  const selectedRt = roomTypes.find(rt => rt.id === rtId);
                  setGuestRow(g => ({ ...g, roomTypeId: rtId, roomId: '', rate: selectedRt?.base_rate ?? 0 }));
                }}
              >
                <option value="">Select type…</option>
                {roomTypes.map(rt => (
                  <option key={rt.id} value={rt.id}>{rt.name} — £{rt.base_rate}/n</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-silver mb-0.5">Room *</label>
              <select
                className="input-dark w-full text-sm"
                value={guestRow.roomId}
                onChange={e => setGuestRow(g => ({ ...g, roomId: e.target.value }))}
                disabled={!guestRow.roomTypeId}
              >
                <option value="">{guestRow.roomTypeId ? `${availableRooms.length} available…` : 'Pick type first'}</option>
                {availableRooms.map(r => (
                  <option key={r.id} value={r.id}>Room {r.room_number}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-silver mb-0.5">Nightly Rate (£) *</label>
              <input
                className="input-dark w-full text-sm"
                type="number"
                min={0}
                value={guestRow.rate}
                onChange={e => setGuestRow(g => ({ ...g, rate: Number(e.target.value) }))}
              />
            </div>
            <div className="flex items-end">
              <Button variant="teal" size="sm" onClick={handleAdd} disabled={!canAdd} className="w-full">
                <Plus className="w-3 h-3 mr-1" /> Assign Room
              </Button>
            </div>
          </div>
          <p className="text-[10px] text-silver/60">
            Dates: {format(parseISO(group.check_in), 'MMM d')} – {format(parseISO(group.check_out), 'MMM d')} ({nights} night{nights !== 1 ? 's' : ''}) · Rate defaults to room type base rate (editable) · {slotsRemaining - 1} slot{slotsRemaining - 1 !== 1 ? 's' : ''} remaining after this
          </p>
        </div>
      )}

      {slotsRemaining <= 0 && linkedBookings.length > 0 && (
        <p className="text-[10px] text-emerald-400 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> All rooms assigned — bookings will appear on the Tape Chart
        </p>
      )}
    </div>
  );
}

export function GroupBookingsPage() {
  const { groups, createGroup, updateGroup, deleteGroup } = useGroupBookings();
  const { bookings, createBooking, updateStatus, modifyBooking } = useBookings();
  const { rooms, roomTypes } = useRooms();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<GroupStatus | 'all'>('all');

  const allGroups = groups ?? [];
  const allBookings = bookings ?? [];
  const allRooms = rooms ?? [];
  const allRoomTypes = (roomTypes ?? []).map(rt => ({ id: rt.id, name: rt.name, base_rate: rt.base_rate }));
  const filtered = filter === 'all' ? allGroups : allGroups.filter(g => g.status === filter);

  // Assign a room within a group — creates a booking and links it
  const handleAssignRoom = (group: GroupBooking, guestRow: GuestRow) => {
    const rate = guestRow.rate > 0 ? guestRow.rate : group.rate_agreed;

    // Create the booking with the correct rate AND room from the start
    createBooking.mutate({
      property_id: 'demo-property-id',
      room_type_id: guestRow.roomTypeId,
      check_in: group.check_in,
      check_out: group.check_out,
      num_guests: 1,
      guest: {
        first_name: guestRow.firstName,
        last_name: guestRow.lastName,
        email: guestRow.email || `${guestRow.firstName.toLowerCase()}.${guestRow.lastName.toLowerCase()}@group.local`,
      },
      source: 'direct',
      special_requests: `Group: ${group.name}`,
      nightly_rate: rate,         // pass custom/group rate — no more rt.base_rate override
      room_id: guestRow.roomId,   // assign room at creation
    }, {
      onSuccess: (createdBooking) => {
        if (createdBooking?.id) {
          // Link the newly created booking to the group directly
          updateGroup.mutate({
            id: group.id,
            booking_ids: [...group.booking_ids, createdBooking.id],
          });
        } else {
          toast.error('Could not link booking — please try again');
        }
      },
    });
  };

  // Remove a booking from a group
  const handleRemoveBooking = (group: GroupBooking, bookingId: string) => {
    if (!confirm('Remove this guest from the group? The booking will be cancelled.')) return;
    updateStatus.mutate({ bookingId, status: 'cancelled' });
    updateGroup.mutate({
      id: group.id,
      booking_ids: group.booking_ids.filter(id => id !== bookingId),
    });
  };

  // Update the nightly rate on an individual group booking
  const handleUpdateRate = (bookingId: string, newRate: number) => {
    if (newRate <= 0) return;
    // Find booking to recalculate total
    const booking = allBookings.find(b => b.id === bookingId);
    if (!booking) return;
    const nights = Math.max(1, Math.ceil((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86400000));
    modifyBooking.mutate({
      bookingId,
      updates: { nightly_rate: newRate, total_amount: newRate * nights },
    });
  };

  // Form state
  const [formData, setFormData] = useState({
    name: '', organiser_name: '', organiser_email: '', organiser_phone: '',
    check_in: '', check_out: '', rooms_blocked: 3, rate_agreed: 0,
    cutoff_date: '', notes: '',
  });

  const resetForm = () => {
    setFormData({ name: '', organiser_name: '', organiser_email: '', organiser_phone: '', check_in: '', check_out: '', rooms_blocked: 3, rate_agreed: 0, cutoff_date: '', notes: '' });
    setShowForm(false);
  };

  const handleCreate = () => {
    if (!formData.name || !formData.organiser_name || !formData.check_in || !formData.check_out) return;
    createGroup.mutate({
      name: formData.name,
      organiser_name: formData.organiser_name,
      organiser_email: formData.organiser_email || null,
      organiser_phone: formData.organiser_phone || null,
      status: 'tentative',
      check_in: formData.check_in,
      check_out: formData.check_out,
      rooms_blocked: formData.rooms_blocked,
      rate_agreed: formData.rate_agreed,
      cutoff_date: formData.cutoff_date || formData.check_in,
      booking_ids: [],
      notes: formData.notes || null,
    });
    resetForm();
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Group Bookings</h1>
          <p className="text-silver text-sm mt-1">
            Manage block bookings for weddings, conferences & corporate events
          </p>
        </div>
        <Button variant="teal" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> New Group
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {(['all', 'tentative', 'definite', 'cancelled'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-lg border transition-colors',
              filter === s
                ? 'bg-teal/20 text-teal border-teal/30'
                : 'text-silver border-white/10 hover:border-white/20 hover:text-white'
            )}
          >
            {s === 'all' ? 'All' : statusConfig[s].label} {s !== 'all' && `(${allGroups.filter(g => g.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="glass-panel rounded-xl p-6 space-y-4 border border-teal/20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">New Group Booking</h2>
            <button onClick={resetForm} className="text-silver hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-silver mb-1">Group Name *</label>
              <input className="input-dark w-full" placeholder="e.g. Smith Wedding" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-silver mb-1">Organiser Name *</label>
              <input className="input-dark w-full" placeholder="Contact name" value={formData.organiser_name} onChange={e => setFormData(f => ({ ...f, organiser_name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-silver mb-1">Email</label>
              <input className="input-dark w-full" type="email" placeholder="organiser@email.com" value={formData.organiser_email} onChange={e => setFormData(f => ({ ...f, organiser_email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-silver mb-1">Phone</label>
              <input className="input-dark w-full" placeholder="+44 ..." value={formData.organiser_phone} onChange={e => setFormData(f => ({ ...f, organiser_phone: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-silver mb-1">Check-in *</label>
              <input className="input-dark w-full" type="date" value={formData.check_in} onChange={e => setFormData(f => ({ ...f, check_in: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-silver mb-1">Check-out *</label>
              <input className="input-dark w-full" type="date" value={formData.check_out} onChange={e => setFormData(f => ({ ...f, check_out: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-silver mb-1">Rooms Blocked</label>
              <input className="input-dark w-full" type="number" min={1} value={formData.rooms_blocked} onChange={e => setFormData(f => ({ ...f, rooms_blocked: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-xs text-silver mb-1">Agreed Rate (£/night)</label>
              <input className="input-dark w-full" type="number" min={0} value={formData.rate_agreed} onChange={e => setFormData(f => ({ ...f, rate_agreed: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-xs text-silver mb-1">Cutoff Date</label>
              <input className="input-dark w-full" type="date" value={formData.cutoff_date} onChange={e => setFormData(f => ({ ...f, cutoff_date: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-silver mb-1">Notes</label>
              <textarea className="input-dark w-full" rows={2} placeholder="Internal notes..." value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost-dark" onClick={resetForm}>Cancel</Button>
            <Button variant="teal" onClick={handleCreate}>Create Group</Button>
          </div>
        </div>
      )}

      {/* Groups List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="glass-panel rounded-xl p-8 text-center text-silver">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No group bookings found</p>
          </div>
        )}

        {filtered.map(group => {
          const cfg = statusConfig[group.status];
          const StatusIcon = cfg.icon;
          const isExpanded = expandedId === group.id;
          const cutoffPast = isPast(parseISO(group.cutoff_date));
          const nights = Math.max(1, Math.round((parseISO(group.check_out).getTime() - parseISO(group.check_in).getTime()) / 86400000));

          // Compute total: sum actual assigned-booking rates when available, otherwise use estimate
          const linkedBookings = (allBookings ?? []).filter(b => group.booking_ids.includes(b.id) && b.status !== 'cancelled' && b.status !== 'no_show');
          const assignedTotal = linkedBookings.reduce((sum, b) => sum + b.nightly_rate * nights, 0);
          const unassignedRooms = Math.max(0, group.rooms_blocked - linkedBookings.length);
          const totalValue = assignedTotal + unassignedRooms * group.rate_agreed * nights;

          return (
            <div key={group.id} className="glass-panel rounded-xl overflow-hidden">
              {/* Header */}
              <button
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : group.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={cn('px-2.5 py-1 rounded-full text-[11px] font-medium border', cfg.color)}>
                    <StatusIcon className="w-3 h-3 inline mr-1" />
                    {cfg.label}
                  </div>
                  <div>
                    <span className="text-white font-semibold">{group.name}</span>
                    <span className="text-silver text-sm ml-3">
                      {format(parseISO(group.check_in), 'MMM d')} – {format(parseISO(group.check_out), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-silver text-sm">{group.rooms_blocked} rooms</span>
                  <span className="text-teal font-medium text-sm">£{totalValue.toLocaleString()}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-silver" /> : <ChevronDown className="w-4 h-4 text-silver" />}
                </div>
              </button>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="border-t border-white/[0.06] px-5 py-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="text-xs text-silver uppercase tracking-wider mb-2">Organiser</h4>
                      <p className="text-white text-sm">{group.organiser_name}</p>
                      {group.organiser_email && (
                        <p className="text-silver text-xs flex items-center gap-1 mt-1"><Mail className="w-3 h-3" />{group.organiser_email}</p>
                      )}
                      {group.organiser_phone && (
                        <p className="text-silver text-xs flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{group.organiser_phone}</p>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs text-silver uppercase tracking-wider mb-2">Booking Details</h4>
                      <div className="space-y-1 text-sm">
                        <p className="text-silver">Rate: <span className="text-white">£{group.rate_agreed}/night</span></p>
                        <p className="text-silver">Nights: <span className="text-white">{nights}</span></p>
                        <p className="text-silver">Total Value: <span className="text-teal font-medium">£{totalValue.toLocaleString()}</span></p>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs text-silver uppercase tracking-wider mb-2">Cutoff Date</h4>
                      <p className={cn('text-sm', cutoffPast ? 'text-red-400' : 'text-white')}>
                        {format(parseISO(group.cutoff_date), 'MMM d, yyyy')}
                        {cutoffPast && <span className="text-xs ml-2">(Passed)</span>}
                      </p>
                      <p className="text-silver text-xs mt-1">
                        Rooms linked: {group.booking_ids.length} of {group.rooms_blocked}
                      </p>
                    </div>
                  </div>

                  {group.notes && (
                    <div>
                      <h4 className="text-xs text-silver uppercase tracking-wider mb-1">Notes</h4>
                      <p className="text-silver text-sm">{group.notes}</p>
                    </div>
                  )}

                  {/* Room Assignment Panel */}
                  <div className="pt-2 border-t border-white/[0.06]">
                    <RoomAssignmentPanel
                      group={group}
                      allBookings={allBookings}
                      allRooms={allRooms}
                      roomTypes={allRoomTypes}
                      nights={nights}
                      onAssignRoom={(guestRow) => handleAssignRoom(group, guestRow)}
                      onRemoveBooking={(bookingId) => handleRemoveBooking(group, bookingId)}
                      onUpdateRate={handleUpdateRate}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                    {group.status === 'tentative' && (
                      <Button variant="teal" size="sm" onClick={() => updateGroup.mutate({ id: group.id, status: 'definite' })}>
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Confirm
                      </Button>
                    )}
                    {group.status !== 'cancelled' && (
                      <Button variant="danger" size="sm" onClick={() => updateGroup.mutate({ id: group.id, status: 'cancelled' })}>
                        <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Cancel
                      </Button>
                    )}
                    <Button variant="ghost-dark" size="sm" onClick={() => { if (window.confirm('Delete this group booking? This action cannot be undone.')) deleteGroup.mutate(group.id); }}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
