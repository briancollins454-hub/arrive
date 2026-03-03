import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Wrench, Plus, X, CheckCircle, Clock, AlertTriangle, AlertCircle,
  ChevronDown, ChevronUp, MapPin, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useWorkOrders } from '@/hooks/useWorkOrders';
import { useRooms } from '@/hooks/useRooms';
import toast from 'react-hot-toast';
import type { WorkOrderStatus, WorkOrderPriority, WorkOrderCategory } from '@/types';

const statusConfig: Record<WorkOrderStatus, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: 'Open', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: AlertCircle },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Clock },
  completed: { label: 'Completed', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: AlertTriangle },
};

const priorityConfig: Record<WorkOrderPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-slate-400' },
  medium: { label: 'Medium', color: 'text-amber-400' },
  high: { label: 'High', color: 'text-orange-400' },
  urgent: { label: 'Urgent', color: 'text-red-400' },
};

const categoryLabels: Record<WorkOrderCategory, string> = {
  plumbing: 'Plumbing', electrical: 'Electrical', hvac: 'HVAC',
  furniture: 'Furniture', cleaning: 'Cleaning', appliance: 'Appliance',
  structural: 'Structural', other: 'Other',
};

export function MaintenancePage() {
  const { workOrders, createWorkOrder, updateWorkOrder, deleteWorkOrder } = useWorkOrders();
  const { rooms } = useRooms();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<WorkOrderStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allOrders = workOrders ?? [];
  const allRooms = rooms ?? [];
  const filtered = filter === 'all' ? allOrders : allOrders.filter(w => w.status === filter);
  const sorted = [...filtered].sort((a, b) => {
    const priOrder: Record<WorkOrderPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    return priOrder[a.priority] - priOrder[b.priority];
  });

  // Form state
  const [form, setForm] = useState({
    room_id: '', title: '', description: '', category: 'other' as WorkOrderCategory,
    priority: 'medium' as WorkOrderPriority, reported_by: 'Front Desk', assigned_to: '',
    estimated_cost: undefined as number | undefined,
  });
  const resetForm = () => {
    setForm({ room_id: '', title: '', description: '', category: 'other', priority: 'medium', reported_by: 'Front Desk', assigned_to: '', estimated_cost: undefined });
    setShowForm(false);
  };
  const handleCreate = () => {
    if (!form.title) {
      toast.error('Please enter a title for the work order');
      return;
    }
    if (!form.description) {
      toast.error('Please enter a description for the work order');
      return;
    }
    createWorkOrder.mutate({
      ...form,
      room_id: form.room_id || null,
      assigned_to: form.assigned_to || null,
      estimated_cost: form.estimated_cost || null,
      status: 'open',
    });
    resetForm();
  };

  // Stats
  const openCount = allOrders.filter(w => w.status === 'open').length;
  const inProgressCount = allOrders.filter(w => w.status === 'in_progress').length;
  const completedCount = allOrders.filter(w => w.status === 'completed').length;
  const urgentCount = allOrders.filter(w => w.priority === 'urgent' && w.status !== 'completed' && w.status !== 'cancelled').length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Maintenance</h1>
          <p className="text-silver text-sm mt-1">Work orders & maintenance tracking</p>
        </div>
        <Button variant="teal" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> New Work Order
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Open', value: openCount, color: 'text-amber-400' },
          { label: 'In Progress', value: inProgressCount, color: 'text-blue-400' },
          { label: 'Completed', value: completedCount, color: 'text-emerald-400' },
          { label: 'Urgent', value: urgentCount, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="glass-panel rounded-xl p-4 text-center">
            <div className={cn('text-xl font-bold', s.color)}>{s.value}</div>
            <div className="text-xs text-silver">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {(['all', 'open', 'in_progress', 'completed', 'cancelled'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-lg border transition-colors',
              filter === s ? 'bg-teal/20 text-teal border-teal/30' : 'text-silver border-white/10 hover:border-white/20 hover:text-white'
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
            <h2 className="text-lg font-semibold text-white">New Work Order</h2>
            <button onClick={resetForm} className="text-silver hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-silver mb-1">Title *</label>
              <input className="input-dark w-full" placeholder="Brief description" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-silver mb-1">Room</label>
              <select className="input-dark w-full" value={form.room_id} onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))}>
                <option value="">Common area / N/A</option>
                {allRooms.map(r => <option key={r.id} value={r.id}>Room {r.room_number}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-silver mb-1">Category</label>
              <select className="input-dark w-full" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as WorkOrderCategory }))}>
                {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
              <label className="block text-xs text-silver mb-1">Reported By</label>
              <input className="input-dark w-full" value={form.reported_by} onChange={e => setForm(f => ({ ...f, reported_by: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-silver mb-1">Assign To</label>
              <input className="input-dark w-full" placeholder="Technician name" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-silver mb-1">Estimated Cost (£)</label>
              <input className="input-dark w-full" type="number" min={0} placeholder="0.00" value={form.estimated_cost ?? ''} onChange={e => setForm(f => ({ ...f, estimated_cost: e.target.value === '' ? undefined : Number(e.target.value) }))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-silver mb-1">Description *</label>
              <textarea className="input-dark w-full" rows={2} placeholder="Full details..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost-dark" onClick={resetForm}>Cancel</Button>
            <Button variant="teal" onClick={handleCreate}>Create</Button>
          </div>
        </div>
      )}

      {/* Work Orders List */}
      <div className="space-y-2">
        {sorted.length === 0 && (
          <div className="glass-panel rounded-xl p-8 text-center text-silver">
            <Wrench className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No work orders found</p>
          </div>
        )}
        {sorted.map(wo => {
          const cfg = statusConfig[wo.status];
          const priCfg = priorityConfig[wo.priority];
          const StatusIcon = cfg.icon;
          const isExpanded = expandedId === wo.id;
          const roomNum = allRooms.find(r => r.id === wo.room_id)?.room_number;
          return (
            <div key={wo.id} className="glass-panel rounded-xl overflow-hidden">
              <button className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-white/[0.02] transition-colors" onClick={() => setExpandedId(isExpanded ? null : wo.id)}>
                <div className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium border', cfg.color)}>
                  <StatusIcon className="w-3 h-3 inline mr-0.5" />{cfg.label}
                </div>
                <span className={cn('text-[10px] font-bold uppercase', priCfg.color)}>{priCfg.label}</span>
                <span className="text-white text-sm font-medium flex-1 truncate">{wo.title}</span>
                {roomNum && <span className="text-silver text-xs flex items-center gap-1"><MapPin className="w-3 h-3" />Rm {roomNum}</span>}
                <span className="text-silver text-xs">{format(parseISO(wo.created_at), 'MMM d')}</span>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-silver" /> : <ChevronDown className="w-4 h-4 text-silver" />}
              </button>
              {isExpanded && (
                <div className="border-t border-white/[0.06] px-4 py-3 space-y-3">
                  <p className="text-silver text-sm">{wo.description}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div><span className="text-silver">Category:</span> <span className="text-white ml-1">{categoryLabels[wo.category]}</span></div>
                    <div><span className="text-silver">Reported by:</span> <span className="text-white ml-1">{wo.reported_by}</span></div>
                    <div><span className="text-silver">Assigned to:</span> <span className="text-white ml-1">{wo.assigned_to || '—'}</span></div>
                    <div><span className="text-silver">Est. cost:</span> <span className="text-white ml-1">{wo.estimated_cost != null ? `£${wo.estimated_cost}` : '—'}</span></div>
                  </div>
                  {wo.actual_cost != null && (
                    <div className="text-xs"><span className="text-silver">Actual cost:</span> <span className="text-teal ml-1">£{wo.actual_cost}</span></div>
                  )}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                    {wo.status === 'open' && (
                      <Button variant="primary" size="sm" onClick={() => updateWorkOrder.mutate({ id: wo.id, status: 'in_progress' })}>Start</Button>
                    )}
                    {wo.status === 'in_progress' && (
                      <Button variant="teal" size="sm" onClick={() => updateWorkOrder.mutate({ id: wo.id, status: 'completed', completed_at: new Date().toISOString() })}>
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />Complete
                      </Button>
                    )}
                    {wo.status !== 'completed' && wo.status !== 'cancelled' && (
                      <Button variant="danger" size="sm" onClick={() => updateWorkOrder.mutate({ id: wo.id, status: 'cancelled' })}>Cancel</Button>
                    )}
                    <Button variant="ghost-dark" size="sm" onClick={() => { if (window.confirm('Delete this work order? This action cannot be undone.')) deleteWorkOrder.mutate(wo.id); }}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" />Delete
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
