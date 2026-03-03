import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Search as SearchIcon, Plus, X, Package, CheckCircle, Archive, Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useLostFound } from '@/hooks/useLostFound';
import { useRooms } from '@/hooks/useRooms';
import type { LostFoundStatus } from '@/types';

const statusConfig: Record<LostFoundStatus, { label: string; color: string }> = {
  found: { label: 'Found — Unclaimed', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  claimed: { label: 'Claimed', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  shipped: { label: 'Shipped', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  disposed: { label: 'Disposed', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
};

export function LostFoundPage() {
  const { items, createItem, updateItem } = useLostFound();
  const { rooms } = useRooms();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<LostFoundStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const allItems = items ?? [];
  const allRooms = rooms ?? [];
  const filtered = allItems.filter(i => {
    if (filter !== 'all' && i.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return i.description.toLowerCase().includes(q) || i.found_location.toLowerCase().includes(q) || (i.claimed_by?.toLowerCase().includes(q) ?? false);
    }
    return true;
  });

  // Form state
  const [form, setForm] = useState({
    description: '', found_location: '', found_by: '', room_id: '', notes: '',
  });
  const resetForm = () => {
    setForm({ description: '', found_location: '', found_by: '', room_id: '', notes: '' });
    setShowForm(false);
  };
  const handleCreate = () => {
    if (!form.description || !form.found_location || !form.found_by) return;
    createItem.mutate({
      description: form.description,
      found_location: form.found_location,
      found_by: form.found_by,
      room_id: form.room_id || null,
      guest_id: null,
      status: 'found',
      claimed_by: null,
      claimed_at: null,
      notes: form.notes || null,
    });
    resetForm();
  };

  const countByStatus = (s: LostFoundStatus) => allItems.filter(i => i.status === s).length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Lost & Found</h1>
          <p className="text-silver text-sm mt-1">Track items found on property</p>
        </div>
        <Button variant="teal" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> Log Item
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-amber-400">{countByStatus('found')}</div>
          <div className="text-xs text-silver">Unclaimed</div>
        </div>
        <div className="glass-panel rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-emerald-400">{countByStatus('claimed')}</div>
          <div className="text-xs text-silver">Claimed</div>
        </div>
        <div className="glass-panel rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-blue-400">{countByStatus('shipped')}</div>
          <div className="text-xs text-silver">Shipped</div>
        </div>
        <div className="glass-panel rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-slate-400">{countByStatus('disposed')}</div>
          <div className="text-xs text-silver">Disposed</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-silver" />
          <input className="input-dark w-full pl-9" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {(['all', 'found', 'claimed', 'shipped', 'disposed'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-lg border transition-colors',
              filter === s ? 'bg-teal/20 text-teal border-teal/30' : 'text-silver border-white/10 hover:text-white'
            )}
          >
            {s === 'all' ? 'All' : statusConfig[s].label.split(' — ')[0]}
          </button>
        ))}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="glass-panel rounded-xl p-6 space-y-4 border border-teal/20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Log Found Item</h2>
            <button onClick={resetForm} className="text-silver hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-silver mb-1">Item Description *</label>
              <input className="input-dark w-full" placeholder="e.g. Black leather wallet with bank cards" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-silver mb-1">Found Location *</label>
              <input className="input-dark w-full" placeholder="e.g. Room 202, bedside drawer" value={form.found_location} onChange={e => setForm(f => ({ ...f, found_location: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-silver mb-1">Found By *</label>
              <input className="input-dark w-full" placeholder="Staff name" value={form.found_by} onChange={e => setForm(f => ({ ...f, found_by: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-silver mb-1">Room (if applicable)</label>
              <select className="input-dark w-full" value={form.room_id} onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))}>
                <option value="">N/A</option>
                {allRooms.map(r => <option key={r.id} value={r.id}>Room {r.room_number}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-silver mb-1">Notes</label>
              <input className="input-dark w-full" placeholder="Additional notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost-dark" onClick={resetForm}>Cancel</Button>
            <Button variant="teal" onClick={handleCreate}>Log Item</Button>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="glass-panel rounded-xl p-8 text-center text-silver">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No items found</p>
          </div>
        )}
        {filtered.map(item => {
          const roomNum = allRooms.find(r => r.id === item.room_id)?.room_number;
          const cfg = statusConfig[item.status];
          return (
            <div key={item.id} className="glass-panel rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full border', cfg.color)}>{cfg.label}</span>
                    {roomNum && <span className="text-xs text-silver">Rm {roomNum}</span>}
                    <span className="text-[10px] text-silver/60">{format(parseISO(item.created_at), 'MMM d, yyyy')}</span>
                  </div>
                  <p className="text-white text-sm font-medium">{item.description}</p>
                  <p className="text-silver text-xs mt-0.5">Found at: {item.found_location} — by {item.found_by}</p>
                  {item.notes && <p className="text-silver/70 text-xs mt-1 italic">{item.notes}</p>}
                  {item.claimed_by && (
                    <p className="text-teal text-xs mt-1">Claimed by: {item.claimed_by} {item.claimed_at && `on ${format(parseISO(item.claimed_at), 'MMM d')}`}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {item.status === 'found' && (
                    <>
                      <Button variant="teal" size="sm" onClick={() => {
                        const name = prompt('Claimed by (guest name):');
                        if (name) updateItem.mutate({ id: item.id, status: 'claimed', claimed_by: name, claimed_at: new Date().toISOString() });
                      }}>
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />Claim
                      </Button>
                      <Button variant="outline-dark" size="sm" onClick={() => updateItem.mutate({ id: item.id, status: 'shipped', claimed_by: 'Guest (shipped)', claimed_at: new Date().toISOString() })}>
                        <Send className="w-3.5 h-3.5 mr-1" />Ship
                      </Button>
                      <Button variant="ghost-dark" size="sm" onClick={() => { if (confirm('Dispose this item permanently?')) updateItem.mutate({ id: item.id, status: 'disposed' }); }}>
                        <Archive className="w-3.5 h-3.5 mr-1" />Dispose
                      </Button>
                    </>
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
