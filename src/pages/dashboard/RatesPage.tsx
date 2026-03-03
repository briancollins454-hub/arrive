import { useState } from 'react';
import { useRooms } from '@/hooks/useRooms';
import { useRatePeriods } from '@/hooks/useRatePeriods';
import { RatePeriodEditor } from '@/components/dashboard/RatePeriodEditor';
import { PageSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/Dialog';
import { Plus, Calendar, Edit, Trash2, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';
import { format, isAfter, isBefore, isWithinInterval } from 'date-fns';
import toast from 'react-hot-toast';
import type { RatePeriod } from '@/types';
import type { RatePeriodFormData } from '@/lib/validators';

export function RatesPage() {
  const { roomTypes, isLoadingTypes } = useRooms();
  const { ratePeriods, isLoading, createRate, updateRate, deleteRate, toggleActive } = useRatePeriods();

  const [showEditor, setShowEditor] = useState(false);
  const [editingRate, setEditingRate] = useState<RatePeriod | null>(null);
  const [filterRoomType, setFilterRoomType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (isLoadingTypes || isLoading) return <PageSpinner />;

  // Filter
  const filtered = ratePeriods.filter((rp) => {
    if (filterRoomType !== 'all' && rp.room_type_id !== filterRoomType) return false;
    if (filterStatus === 'active' && !rp.is_active) return false;
    if (filterStatus === 'inactive' && rp.is_active) return false;
    return true;
  });

  // Group by room type
  const grouped = roomTypes.map((rt) => ({
    roomType: rt,
    rates: filtered.filter((rp) => rp.room_type_id === rt.id),
  })).filter((g) => g.rates.length > 0);

  // Also include rates with null room_type_id
  const globalRates = filtered.filter((rp) => !rp.room_type_id);

  const today = new Date();

  const getTimelineStatus = (rp: RatePeriod) => {
    const start = new Date(rp.start_date);
    const end = new Date(rp.end_date);
    if (!rp.is_active) return { label: 'Inactive', color: 'text-steel bg-white/[0.03]' };
    if (isBefore(end, today)) return { label: 'Expired', color: 'text-rose-400 bg-rose-400/10' };
    if (isAfter(start, today)) return { label: 'Upcoming', color: 'text-blue-400 bg-blue-400/10' };
    if (isWithinInterval(today, { start, end })) return { label: 'Current', color: 'text-emerald-400 bg-emerald-400/10' };
    return { label: '—', color: 'text-steel' };
  };

  const handleSubmit = (data: RatePeriodFormData) => {
    if (editingRate) {
      updateRate.mutate({
        id: editingRate.id,
        name: data.name,
        room_type_id: data.room_type_id ?? null,
        start_date: data.start_date,
        end_date: data.end_date,
        rate: data.rate,
        min_stay: data.min_stay ?? 1,
        is_active: data.is_active ?? true,
      });
    } else {
      createRate.mutate({
        name: data.name,
        room_type_id: data.room_type_id ?? null,
        start_date: data.start_date,
        end_date: data.end_date,
        rate: data.rate,
        min_stay: data.min_stay ?? 1,
        is_active: data.is_active ?? true,
      });
    }
    setShowEditor(false);
    setEditingRate(null);
  };

  const handleDelete = (id: string) => {
    deleteRate.mutate(id);
    setConfirmDelete(null);
    toast.success('Rate period deleted');
  };

  const openEdit = (rp: RatePeriod) => {
    setEditingRate(rp);
    setShowEditor(true);
  };

  const openCreate = () => {
    setEditingRate(null);
    setShowEditor(true);
  };

  // Summary stats
  const activeCount = ratePeriods.filter((rp) => rp.is_active).length;
  const currentCount = ratePeriods.filter((rp) => {
    if (!rp.is_active) return false;
    const s = new Date(rp.start_date);
    const e = new Date(rp.end_date);
    try { return isWithinInterval(today, { start: s, end: e }); } catch { return false; }
  }).length;

  const RateRow = ({ rp }: { rp: RatePeriod }) => {
    const rt = roomTypes.find((t) => t.id === rp.room_type_id);
    const status = getTimelineStatus(rp);
    return (
      <tr className="border-b border-slate/10 hover:bg-white/[0.02] transition-colors">
        <td className="p-4">
          <div className="flex items-center gap-2">
            <span className="text-white font-body text-sm font-medium">{rp.name}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${status.color}`}>
              {status.label}
            </span>
          </div>
        </td>
        <td className="p-4 text-white/80 font-body text-sm">{rt?.name || 'All Types'}</td>
        <td className="p-4">
          <div className="flex items-center gap-1.5 text-white/80 font-body text-sm">
            <Calendar size={13} className="text-steel shrink-0" />
            {format(new Date(rp.start_date), 'MMM d')} – {format(new Date(rp.end_date), 'MMM d, yyyy')}
          </div>
        </td>
        <td className="p-4 text-gold font-display text-sm">£{rp.rate}</td>
        <td className="p-4 text-white/80 font-body text-sm">
          {rp.min_stay} night{rp.min_stay !== 1 ? 's' : ''}
        </td>
        <td className="p-4 text-right">
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost-dark"
              size="icon"
              onClick={() => toggleActive.mutate(rp.id)}
              title={rp.is_active ? 'Deactivate' : 'Activate'}
            >
              {rp.is_active
                ? <ToggleRight size={16} className="text-emerald-400" />
                : <ToggleLeft size={16} className="text-steel" />}
            </Button>
            <Button variant="ghost-dark" size="icon" onClick={() => openEdit(rp)} aria-label="Edit rate period">
              <Edit size={14} />
            </Button>
            <Button variant="ghost-dark" size="icon" onClick={() => setConfirmDelete(rp.id)} aria-label="Delete rate period">
              <Trash2 size={14} className="text-rose-400" />
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-white mb-1.5 tracking-tight">Rates & Pricing</h1>
          <p className="text-sm text-steel font-body">
            Manage seasonal rates, pricing rules, and minimum stay requirements
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-2" /> New Rate Period
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card variant="dark">
          <CardContent className="p-4">
            <p className="text-xs text-steel font-body mb-1">Total Periods</p>
            <p className="text-2xl font-display text-white">{ratePeriods.length}</p>
          </CardContent>
        </Card>
        <Card variant="dark">
          <CardContent className="p-4">
            <p className="text-xs text-steel font-body mb-1">Active</p>
            <p className="text-2xl font-display text-emerald-400">{activeCount}</p>
          </CardContent>
        </Card>
        <Card variant="dark">
          <CardContent className="p-4">
            <p className="text-xs text-steel font-body mb-1">Current (today)</p>
            <p className="text-2xl font-display text-gold">{currentCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={filterRoomType}
          onChange={(e) => setFilterRoomType(e.target.value)}
          className="input-dark text-sm py-1.5 px-3 rounded-xl bg-charcoal border border-white/[0.06]"
        >
          <option value="all">All Room Types</option>
          {roomTypes.map((rt) => (
            <option key={rt.id} value={rt.id}>{rt.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
          className="input-dark text-sm py-1.5 px-3 rounded-xl bg-charcoal border border-white/[0.06]"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
        <span className="text-xs text-steel font-body ml-auto">
          Showing {filtered.length} of {ratePeriods.length} rate periods
        </span>
      </div>

      {/* Global rates (no room type) */}
      {globalRates.length > 0 && (
        <Card variant="dark">
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-slate/20">
              <h2 className="text-sm font-display text-white/70">All Room Types</h2>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate/20">
                  <th className="text-left text-xs text-steel font-body font-normal p-4">Period</th>
                  <th className="text-left text-xs text-steel font-body font-normal p-4">Room Type</th>
                  <th className="text-left text-xs text-steel font-body font-normal p-4">Dates</th>
                  <th className="text-left text-xs text-steel font-body font-normal p-4">Rate/Night</th>
                  <th className="text-left text-xs text-steel font-body font-normal p-4">Min Stay</th>
                  <th className="text-right text-xs text-steel font-body font-normal p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {globalRates.map((rp) => <RateRow key={rp.id} rp={rp} />)}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grouped by room type */}
      {grouped.map(({ roomType: rt, rates }) => (
        <Card key={rt.id} variant="dark">
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-slate/20 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-display text-white">{rt.name}</h2>
                <p className="text-xs text-steel font-body">
                  Base rate: £{rt.base_rate}/night · {rates.length} period{rates.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate/20">
                  <th className="text-left text-xs text-steel font-body font-normal p-4">Period</th>
                  <th className="text-left text-xs text-steel font-body font-normal p-4">Room Type</th>
                  <th className="text-left text-xs text-steel font-body font-normal p-4">Dates</th>
                  <th className="text-left text-xs text-steel font-body font-normal p-4">Rate/Night</th>
                  <th className="text-left text-xs text-steel font-body font-normal p-4">Min Stay</th>
                  <th className="text-right text-xs text-steel font-body font-normal p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((rp) => <RateRow key={rp.id} rp={rp} />)}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>
      ))}

      {filtered.length === 0 && (
        <Card variant="dark">
          <CardContent className="p-12 text-center">
            <Calendar size={40} className="mx-auto mb-3 text-steel/30" />
            <p className="text-white font-display mb-1">No rate periods found</p>
            <p className="text-sm text-steel font-body mb-4">Adjust your filters or create a new rate period</p>
            <Button onClick={openCreate}>
              <Plus size={16} className="mr-2" /> New Rate Period
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={(o) => { if (!o) { setShowEditor(false); setEditingRate(null); } }}>
        <DialogContent variant="dark" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingRate ? 'Edit Rate Period' : 'New Rate Period'}
            </DialogTitle>
          </DialogHeader>
          <RatePeriodEditor
            ratePeriod={editingRate}
            onSubmit={handleSubmit}
            isLoading={createRate.isPending || updateRate.isPending}
            onCancel={() => { setShowEditor(false); setEditingRate(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent variant="dark" className="max-w-sm">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-400/10 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} className="text-rose-400" />
            </div>
            <div>
              <h3 className="text-white font-display text-lg mb-1">Delete Rate Period?</h3>
              <p className="text-sm text-steel font-body">
                This action cannot be undone. The rate period will be permanently removed.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <Button variant="ghost-dark" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button
                className="bg-rose-500 hover:bg-rose-600 text-white"
                onClick={() => confirmDelete && handleDelete(confirmDelete)}
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
