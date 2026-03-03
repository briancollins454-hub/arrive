import { useState } from 'react';
import { parseISO, formatDistanceToNow } from 'date-fns';
import {
  Bell, Plus, X, CheckCircle, Clock, AlertCircle,
  Phone, Coffee, Car, Bed, Info, AlertTriangle, MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useGuestRequests } from '@/hooks/useGuestRequests';
import { useBookings } from '@/hooks/useBookings';
import { useRooms } from '@/hooks/useRooms';
import type { GuestRequestStatus, GuestRequestCategory, WorkOrderPriority } from '@/types';

const statusConfig: Record<GuestRequestStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: AlertCircle },
  completed: { label: 'Completed', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: AlertTriangle },
};

const categoryConfig: Record<GuestRequestCategory, { label: string; icon: typeof Coffee }> = {
  housekeeping: { label: 'Housekeeping', icon: Bed },
  dining: { label: 'Dining', icon: Coffee },
  transport: { label: 'Transport', icon: Car },
  amenity: { label: 'Amenity', icon: Bell },
  information: { label: 'Information', icon: Info },
  complaint: { label: 'Complaint', icon: AlertTriangle },
  wake_up: { label: 'Wake-Up Call', icon: Phone },
  other: { label: 'Other', icon: MessageSquare },
};

export function ConciergePage() {
  const { requests, createRequest, updateRequest } = useGuestRequests();
  const { bookings } = useBookings();
  const { rooms } = useRooms();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<GuestRequestStatus | 'all'>('all');

  const allRequests = requests ?? [];
  const allBookings = bookings ?? [];
  const allRooms = rooms ?? [];
  const filtered = filter === 'all' ? allRequests : allRequests.filter(r => r.status === filter);
  const sorted = [...filtered].sort((a, b) => {
    const priOrder: Record<WorkOrderPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    return (priOrder[a.priority] || 2) - (priOrder[b.priority] || 2);
  });

  // Active in-house bookings for form dropdown
  const inHouseBookings = allBookings.filter(b => b.status === 'checked_in');

  // Form state
  const [form, setForm] = useState({
    booking_id: '', category: 'other' as GuestRequestCategory, description: '',
    priority: 'medium' as WorkOrderPriority, assigned_to: '', notes: '',
  });
  const resetForm = () => {
    setForm({ booking_id: '', category: 'other', description: '', priority: 'medium', assigned_to: '', notes: '' });
    setShowForm(false);
  };
  const handleCreate = () => {
    if (!form.description) return;
    const booking = allBookings.find(b => b.id === form.booking_id);
    createRequest.mutate({
      booking_id: form.booking_id || null,
      guest_id: booking?.guest_id ?? null,
      room_id: booking?.room_id ?? null,
      category: form.category,
      description: form.description,
      status: 'pending',
      priority: form.priority,
      assigned_to: form.assigned_to || null,
      completed_at: null,
      notes: form.notes || null,
    });
    resetForm();
  };

  const pendingCount = allRequests.filter(r => r.status === 'pending').length;
  const inProgressCount = allRequests.filter(r => r.status === 'in_progress').length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Concierge</h1>
          <p className="text-silver text-sm mt-1">Guest requests, wake-up calls & services</p>
        </div>
        <Button variant="teal" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> New Request
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="flex items-center gap-4">
        <div className="glass-panel rounded-xl px-5 py-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="text-white font-medium">{pendingCount}</span>
          <span className="text-silver text-xs">pending</span>
        </div>
        <div className="glass-panel rounded-xl px-5 py-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-blue-400" />
          <span className="text-white font-medium">{inProgressCount}</span>
          <span className="text-silver text-xs">in progress</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {(['all', 'pending', 'in_progress', 'completed', 'cancelled'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-lg border transition-colors',
              filter === s ? 'bg-teal/20 text-teal border-teal/30' : 'text-silver border-white/10 hover:text-white'
            )}
          >
            {s === 'all' ? 'All' : statusConfig[s].label}
          </button>
        ))}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="glass-panel rounded-xl p-6 space-y-4 border border-teal/20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">New Guest Request</h2>
            <button onClick={resetForm} className="text-silver hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-silver mb-1">Guest / Room</label>
              <select className="input-dark w-full" value={form.booking_id} onChange={e => setForm(f => ({ ...f, booking_id: e.target.value }))}>
                <option value="">Walk-in / General</option>
                {inHouseBookings.map(b => {
                  const room = allRooms.find(r => r.id === b.room_id);
                  return <option key={b.id} value={b.id}>Rm {room?.room_number ?? '?'} — {b.guest?.first_name} {b.guest?.last_name}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs text-silver mb-1">Category</label>
              <select className="input-dark w-full" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as GuestRequestCategory }))}>
                {Object.entries(categoryConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-silver mb-1">Priority</label>
              <select className="input-dark w-full" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as WorkOrderPriority }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-silver mb-1">Assign To</label>
              <input className="input-dark w-full" placeholder="Department or name" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-silver mb-1">Description *</label>
              <textarea className="input-dark w-full" rows={2} placeholder="Request details..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost-dark" onClick={resetForm}>Cancel</Button>
            <Button variant="teal" onClick={handleCreate}>Create Request</Button>
          </div>
        </div>
      )}

      {/* Requests List */}
      <div className="space-y-2">
        {sorted.length === 0 && (
          <div className="glass-panel rounded-xl p-8 text-center text-silver">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No requests</p>
          </div>
        )}
        {sorted.map(req => {
          const cfg = statusConfig[req.status];
          const catCfg = categoryConfig[req.category];
          const CatIcon = catCfg.icon;
          const roomNum = allRooms.find(r => r.id === req.room_id)?.room_number;
          const guest = allBookings.find(b => b.id === req.booking_id)?.guest;
          const priorityColor = req.priority === 'urgent' ? 'text-red-400' : req.priority === 'high' ? 'text-orange-400' : req.priority === 'medium' ? 'text-amber-400' : 'text-slate-400';

          return (
            <div key={req.id} className="glass-panel rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className={cn('mt-0.5 p-1.5 rounded-lg', req.status === 'completed' ? 'bg-emerald-500/10' : 'bg-white/[0.04]')}>
                  <CatIcon className={cn('w-4 h-4', req.status === 'completed' ? 'text-emerald-400' : 'text-silver')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full border', cfg.color)}>{cfg.label}</span>
                    <span className={cn('text-[10px] font-bold uppercase', priorityColor)}>{req.priority}</span>
                    <span className="text-[10px] text-silver/60">{catCfg.label}</span>
                    {roomNum && <span className="text-xs text-silver">Rm {roomNum}</span>}
                  </div>
                  <p className="text-white text-sm">{req.description}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-silver">
                    {guest && <span>{guest.first_name} {guest.last_name}</span>}
                    {req.assigned_to && <span>→ {req.assigned_to}</span>}
                    <span>{formatDistanceToNow(parseISO(req.created_at), { addSuffix: true })}</span>
                  </div>
                  {req.notes && <p className="text-silver/60 text-xs mt-1 italic">{req.notes}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {req.status === 'pending' && (
                    <Button variant="primary" size="sm" onClick={() => updateRequest.mutate({ id: req.id, status: 'in_progress' })}>Start</Button>
                  )}
                  {req.status === 'in_progress' && (
                    <Button variant="teal" size="sm" onClick={() => updateRequest.mutate({ id: req.id, status: 'completed', completed_at: new Date().toISOString() })}>
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />Done
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
