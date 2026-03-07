import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  ClipboardList, Plus, Check, X, Clock, Mail, Phone, User,
  BedDouble, Calendar, AlertTriangle, Send, Trash2,
} from 'lucide-react';
import { format, addDays, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRooms } from '@/hooks/useRooms';
import toast from 'react-hot-toast';
import { isDemoMode } from '@/lib/supabase';
import type { WaitlistStatus } from '@/types';

interface WaitlistItem {
  id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  room_type_id: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  status: WaitlistStatus;
  notes: string;
  created_at: string;
}

const statusConfig: Record<WaitlistStatus, { label: string; color: string; icon: typeof Clock }> = {
  waiting: { label: 'Waiting', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20', icon: Clock },
  offered: { label: 'Offered', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', icon: Send },
  confirmed: { label: 'Confirmed', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: Check },
  expired: { label: 'Expired', color: 'text-steel bg-white/[0.04] border-white/[0.08]', icon: AlertTriangle },
  cancelled: { label: 'Cancelled', color: 'text-red-400 bg-red-400/10 border-red-400/20', icon: X },
};

// Initial demo data
const initialWaitlist: WaitlistItem[] = [
  {
    id: 'wl-1',
    guest_name: 'Oliver Bennett',
    guest_email: 'oliver.b@email.com',
    guest_phone: '+44 7700 123001',
    room_type_id: 'rt1',
    check_in: format(addDays(new Date(), 3), 'yyyy-MM-dd'),
    check_out: format(addDays(new Date(), 5), 'yyyy-MM-dd'),
    num_guests: 2,
    status: 'waiting',
    notes: 'Anniversary trip — would love a sea view room if possible',
    created_at: new Date().toISOString(),
  },
  {
    id: 'wl-2',
    guest_name: 'Sophie Chen',
    guest_email: 'sophie.c@email.com',
    guest_phone: '+44 7700 123002',
    room_type_id: 'rt2',
    check_in: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    check_out: format(addDays(new Date(), 3), 'yyyy-MM-dd'),
    num_guests: 1,
    status: 'offered',
    notes: 'Business traveller, flexible on room type',
    created_at: new Date().toISOString(),
  },
  {
    id: 'wl-3',
    guest_name: 'James Wright',
    guest_email: 'james.w@email.com',
    guest_phone: '+44 7700 123003',
    room_type_id: 'rt3',
    check_in: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    check_out: format(addDays(new Date(), 10), 'yyyy-MM-dd'),
    num_guests: 4,
    status: 'waiting',
    notes: 'Family booking — needs interconnecting rooms',
    created_at: new Date().toISOString(),
  },
];

export function WaitlistPage() {
  const { roomTypes } = useRooms();
  const [waitlist, setWaitlist] = useState<WaitlistItem[]>(isDemoMode ? initialWaitlist : []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState<WaitlistStatus | 'all'>('all');
  const [newEntry, setNewEntry] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    room_type_id: roomTypes[0]?.id ?? 'rt1',
    check_in: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    check_out: format(addDays(new Date(), 3), 'yyyy-MM-dd'),
    num_guests: 2,
    notes: '',
  });

  const filtered = waitlist.filter((w) => filter === 'all' || w.status === filter);
  const waitingCount = waitlist.filter((w) => w.status === 'waiting').length;
  const offeredCount = waitlist.filter((w) => w.status === 'offered').length;

  const handleAdd = () => {
    if (!newEntry.guest_name || !newEntry.guest_email) {
      toast.error('Name and email are required');
      return;
    }
    const item: WaitlistItem = {
      id: `wl-${Date.now()}`,
      ...newEntry,
      status: 'waiting',
      created_at: new Date().toISOString(),
    };
    setWaitlist([item, ...waitlist]);
    setShowAddForm(false);
    setNewEntry({
      guest_name: '',
      guest_email: '',
      guest_phone: '',
      room_type_id: roomTypes[0]?.id ?? 'rt1',
      check_in: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      check_out: format(addDays(new Date(), 3), 'yyyy-MM-dd'),
      num_guests: 2,
      notes: '',
    });
    toast.success('Added to waitlist');
  };

  const updateStatus = (id: string, status: WaitlistStatus) => {
    setWaitlist(waitlist.map((w) => (w.id === id ? { ...w, status } : w)));
    toast.success(`Status updated to ${statusConfig[status].label}`);
  };

  const removeEntry = (id: string) => {
    setWaitlist(waitlist.filter((w) => w.id !== id));
    toast.success('Removed from waitlist');
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display text-white mb-1.5 tracking-tight flex items-center gap-2">
            <ClipboardList size={24} className="text-teal" />
            Waitlist
          </h1>
          <p className="text-sm text-steel font-body tracking-wide">
            {waitingCount} waiting · {offeredCount} offered · {waitlist.length} total
          </p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={16} className="mr-2" /> Add to Waitlist
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card variant="dark" className="mb-6 border-teal/20">
          <CardHeader>
            <CardTitle className="text-white text-base">New Waitlist Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label variant="dark">Guest Name *</Label>
                <Input
                  variant="dark"
                  placeholder="Full name"
                  value={newEntry.guest_name}
                  onChange={(e) => setNewEntry({ ...newEntry, guest_name: e.target.value })}
                />
              </div>
              <div>
                <Label variant="dark">Email *</Label>
                <Input
                  variant="dark"
                  type="email"
                  placeholder="guest@email.com"
                  value={newEntry.guest_email}
                  onChange={(e) => setNewEntry({ ...newEntry, guest_email: e.target.value })}
                />
              </div>
              <div>
                <Label variant="dark">Phone</Label>
                <Input
                  variant="dark"
                  placeholder="+44 ..."
                  value={newEntry.guest_phone}
                  onChange={(e) => setNewEntry({ ...newEntry, guest_phone: e.target.value })}
                />
              </div>
              <div>
                <Label variant="dark">Room Type</Label>
                <select
                  className="input-dark w-full text-sm py-2 px-3 rounded-xl bg-charcoal border border-white/[0.06]"
                  value={newEntry.room_type_id}
                  onChange={(e) => setNewEntry({ ...newEntry, room_type_id: e.target.value })}
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name} — £{rt.base_rate}/night
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label variant="dark">Check-in</Label>
                <Input
                  variant="dark"
                  type="date"
                  value={newEntry.check_in}
                  onChange={(e) => setNewEntry({ ...newEntry, check_in: e.target.value })}
                />
              </div>
              <div>
                <Label variant="dark">Check-out</Label>
                <Input
                  variant="dark"
                  type="date"
                  value={newEntry.check_out}
                  onChange={(e) => setNewEntry({ ...newEntry, check_out: e.target.value })}
                />
              </div>
              <div>
                <Label variant="dark">Guests</Label>
                <Input
                  variant="dark"
                  type="number"
                  min={1}
                  max={10}
                  value={newEntry.num_guests}
                  onChange={(e) => setNewEntry({ ...newEntry, num_guests: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label variant="dark">Notes</Label>
              <Input
                variant="dark"
                placeholder="Special requests, preferences..."
                value={newEntry.notes}
                onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd}>
                <Check size={14} className="mr-1" /> Add
              </Button>
              <Button variant="outline-dark" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status filters */}
      <div className="flex items-center gap-2 mb-6">
        {(['all', 'waiting', 'offered', 'confirmed', 'expired', 'cancelled'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-body font-medium transition-all border',
              filter === s
                ? 'bg-teal/15 text-teal border-teal/25 font-semibold'
                : 'text-steel bg-white/[0.03] border-white/[0.06] hover:text-silver hover:border-white/[0.12]',
            )}
          >
            {s === 'all' ? `All (${waitlist.length})` : `${statusConfig[s].label} (${waitlist.filter((w) => w.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Waitlist entries */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <ClipboardList size={32} className="text-steel mx-auto mb-3" />
            <p className="text-steel font-body">No waitlist entries</p>
          </div>
        )}
        {filtered.map((entry) => {
          const rt = roomTypes.find((r) => r.id === entry.room_type_id);
          const nights = Math.max(
            1,
            Math.ceil(
              (new Date(entry.check_out).getTime() - new Date(entry.check_in).getTime()) / 86_400_000,
            ),
          );
          const cfg = statusConfig[entry.status];
          const isExpired = isBefore(new Date(entry.check_in), new Date()) && entry.status === 'waiting';

          return (
            <Card key={entry.id} variant="dark" className={cn('hover:border-white/[0.12] transition-all', isExpired && 'border-amber-500/20')}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  {/* Guest info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white font-body font-medium">{entry.guest_name}</p>
                      <span
                        className={cn(
                          'text-[10px] font-body font-semibold px-2 py-0.5 rounded-full border',
                          cfg.color,
                        )}
                      >
                        {cfg.label}
                      </span>
                      {isExpired && (
                        <span className="text-[10px] font-body font-semibold px-2 py-0.5 rounded-full border text-amber-400 bg-amber-400/10 border-amber-400/20">
                          Past date
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-steel font-body mt-1">
                      <span className="flex items-center gap-1">
                        <Mail size={11} /> {entry.guest_email}
                      </span>
                      {entry.guest_phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={11} /> {entry.guest_phone}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-steel font-body mt-2">
                      <span className="flex items-center gap-1">
                        <BedDouble size={11} /> {rt?.name ?? 'Room'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {format(new Date(entry.check_in), 'dd MMM')} → {format(new Date(entry.check_out), 'dd MMM yyyy')}
                        ({nights} night{nights !== 1 ? 's' : ''})
                      </span>
                      <span className="flex items-center gap-1">
                        <User size={11} /> {entry.num_guests} guest{entry.num_guests !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-silver/70 font-body mt-2 italic">"{entry.notes}"</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {entry.status === 'waiting' && (
                      <button
                        onClick={() => updateStatus(entry.id, 'offered')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-body font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all"
                      >
                        <Send size={11} /> Offer Room
                      </button>
                    )}
                    {entry.status === 'offered' && (
                      <button
                        onClick={() => updateStatus(entry.id, 'confirmed')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-body font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                      >
                        <Check size={11} /> Confirm
                      </button>
                    )}
                    {(entry.status === 'waiting' || entry.status === 'offered') && (
                      <button
                        onClick={() => updateStatus(entry.id, 'cancelled')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-body font-semibold bg-white/[0.03] border border-white/[0.06] text-steel hover:text-red-400 hover:border-red-400/20 transition-all"
                      >
                        <X size={11} /> Cancel
                      </button>
                    )}
                    <button
                      onClick={() => removeEntry(entry.id)}
                      className="p-1.5 rounded-lg text-steel/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Remove"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Overbooking settings card */}
      <Card variant="dark" className="mt-8">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" /> Overbooking Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-steel font-body">
            Overbooking allows accepting more reservations than available rooms to account for cancellations and no-shows.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label variant="dark">Overbooking Tolerance (%)</Label>
              <Input variant="dark" type="number" defaultValue="10" min="0" max="50" />
              <p className="text-[10px] text-steel font-body mt-1">
                Maximum percentage of rooms that can be overbooked
              </p>
            </div>
            <div>
              <Label variant="dark">Alert Threshold (%)</Label>
              <Input variant="dark" type="number" defaultValue="5" min="0" max="50" />
              <p className="text-[10px] text-steel font-body mt-1">
                Show warning when overbooking exceeds this percentage
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-silver font-body cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-white/20 bg-white/5" />
              Enable automatic waitlist when fully booked
            </label>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => toast.success('Overbooking settings saved')}>
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
