import { useState } from 'react';
import {
  Gift, Plus, X, Check, Trash2, Edit, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { usePackages } from '@/hooks/usePackages';
import type { Package } from '@/types';

export function PackagesPage() {
  const { packages, createPackage, updatePackage, deletePackage } = usePackages();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const allPackages = packages ?? [];
  const active = allPackages.filter(p => p.is_active);
  const inactive = allPackages.filter(p => !p.is_active);

  // Form state
  const [form, setForm] = useState({
    name: '', description: '', price_per_night: 0, included_items: '',
  });
  const resetForm = () => {
    setForm({ name: '', description: '', price_per_night: 0, included_items: '' });
    setShowForm(false);
    setEditingId(null);
  };
  const handleCreate = () => {
    if (!form.name) return;
    const items = form.included_items.split('\n').filter(s => s.trim());
    if (editingId) {
      updatePackage.mutate({
        id: editingId,
        name: form.name,
        description: form.description || null,
        price_per_night: form.price_per_night,
        included_items: items,
      });
    } else {
      createPackage.mutate({
        name: form.name,
        description: form.description || null,
        price_per_night: form.price_per_night,
        included_items: items,
        is_active: true,
      });
    }
    resetForm();
  };
  const startEdit = (pkg: Package) => {
    setForm({
      name: pkg.name,
      description: pkg.description ?? '',
      price_per_night: pkg.price_per_night,
      included_items: pkg.included_items.join('\n'),
    });
    setEditingId(pkg.id);
    setShowForm(true);
  };

  const renderCard = (pkg: Package) => (
    <div key={pkg.id} className={cn('glass-panel rounded-xl p-5 space-y-3', !pkg.is_active && 'opacity-60')}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-white font-semibold">{pkg.name}</h3>
          {pkg.description && <p className="text-silver text-sm mt-0.5">{pkg.description}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-teal font-bold text-lg">£{pkg.price_per_night}</span>
          <span className="text-silver text-xs">/night</span>
        </div>
      </div>

      {/* Included Items */}
      <div>
        <h4 className="text-xs text-silver uppercase tracking-wider mb-1.5">Includes</h4>
        <ul className="space-y-1">
          {pkg.included_items.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-white/80">
              <Check className="w-3.5 h-3.5 text-teal shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
        <Button variant="ghost-dark" size="sm" onClick={() => startEdit(pkg)}>
          <Edit className="w-3.5 h-3.5 mr-1" />Edit
        </Button>
        <Button variant="ghost-dark" size="sm" onClick={() => updatePackage.mutate({ id: pkg.id, is_active: !pkg.is_active })}>
          {pkg.is_active ? <ToggleRight className="w-3.5 h-3.5 mr-1 text-teal" /> : <ToggleLeft className="w-3.5 h-3.5 mr-1" />}
          {pkg.is_active ? 'Active' : 'Inactive'}
        </Button>
        <Button variant="ghost-dark" size="sm" onClick={() => { if (window.confirm('Delete this package? This action cannot be undone.')) deletePackage.mutate(pkg.id); }}>
          <Trash2 className="w-3.5 h-3.5 mr-1" />Delete
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Packages & Add-ons</h1>
          <p className="text-silver text-sm mt-1">
            Create rate packages guests can add to their stay
          </p>
        </div>
        <Button variant="teal" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> New Package
        </Button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="glass-panel rounded-xl px-4 py-2">
          <span className="text-white font-medium">{active.length}</span>
          <span className="text-silver ml-1">active</span>
        </div>
        <div className="glass-panel rounded-xl px-4 py-2">
          <span className="text-white font-medium">{inactive.length}</span>
          <span className="text-silver ml-1">inactive</span>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="glass-panel rounded-xl p-6 space-y-4 border border-teal/20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{editingId ? 'Edit Package' : 'New Package'}</h2>
            <button onClick={resetForm} className="text-silver hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-silver mb-1">Package Name *</label>
              <input className="input-dark w-full" placeholder="e.g. Bed & Breakfast" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-silver mb-1">Price per Night (£)</label>
              <input className="input-dark w-full" type="number" min={0} value={form.price_per_night} onChange={e => setForm(f => ({ ...f, price_per_night: Number(e.target.value) }))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-silver mb-1">Description</label>
              <input className="input-dark w-full" placeholder="Short marketing description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-silver mb-1">Included Items (one per line)</label>
              <textarea className="input-dark w-full" rows={4} placeholder={"Full cooked breakfast\nContinental options\nHot beverages"} value={form.included_items} onChange={e => setForm(f => ({ ...f, included_items: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost-dark" onClick={resetForm}>Cancel</Button>
            <Button variant="teal" onClick={handleCreate}>{editingId ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      )}

      {/* Active Packages */}
      {active.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">Active Packages</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {active.map(renderCard)}
          </div>
        </div>
      )}

      {/* Inactive Packages */}
      {inactive.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-silver mb-3">Inactive Packages</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inactive.map(renderCard)}
          </div>
        </div>
      )}

      {allPackages.length === 0 && (
        <div className="glass-panel rounded-xl p-8 text-center text-silver">
          <Gift className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No packages created yet</p>
        </div>
      )}
    </div>
  );
}
