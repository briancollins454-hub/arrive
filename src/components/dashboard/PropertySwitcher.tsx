import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, Check, LayoutGrid, Plus, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProperty } from '@/hooks/useProperty';

interface PropertySwitcherProps {
  collapsed?: boolean;
}

export function PropertySwitcher({ collapsed = false }: PropertySwitcherProps) {
  const { property, properties, activePropertyId, hasMultipleProperties, switchProperty, createProperty } = useProperty();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('');
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  // Position the portal dropdown below the button
  const updatePos = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    }
  }, []);

  useEffect(() => {
    if (open) {
      updatePos();
      window.addEventListener('resize', updatePos);
      window.addEventListener('scroll', updatePos, true);
    }
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [open, updatePos]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        btnRef.current && !btnRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // --- Create Property handler & dialog (shared by single & multi views) ---
  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const created = await createProperty({
      name: newName.trim(),
      slug,
      address: { line1: '', line2: '', city: newCity.trim(), county: '', postcode: '', country: 'United Kingdom' },
    });
    setIsCreating(false);
    if (created) {
      setShowCreate(false);
      setNewName('');
      setNewCity('');
      switchProperty(created.id);
      navigate('/dashboard');
    }
  };

  const createPropertyDialog = showCreate
    ? createPortal(
        <>
          <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm" onClick={() => { if (!isCreating) { setShowCreate(false); setNewName(''); setNewCity(''); } }} />
          <div className="fixed z-[10001] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md">
            <div className="rounded-xl border border-white/[0.1] bg-[#0d1117] shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-display text-white flex items-center gap-2">
                  <Building2 size={18} className="text-gold" />
                  Add New Property
                </h3>
                <button onClick={() => { if (!isCreating) { setShowCreate(false); setNewName(''); setNewCity(''); } }} className="text-steel hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-body font-medium text-silver mb-1">Hotel Name *</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. The Riverside Inn"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-sm text-white placeholder:text-steel/50 font-body focus:outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-all"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) handleCreate(); }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-body font-medium text-silver mb-1">City</label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="e.g. Bath"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-sm text-white placeholder:text-steel/50 font-body focus:outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-all"
                    onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) handleCreate(); }}
                  />
                </div>
              </div>

              <p className="text-[10px] text-steel font-body mt-3">You can update the full address, contact details and settings later from the Settings page.</p>

              <div className="flex justify-end gap-2 mt-5">
                <button
                  onClick={() => { setShowCreate(false); setNewName(''); setNewCity(''); }}
                  disabled={isCreating}
                  className="px-3 py-1.5 rounded-lg text-xs font-body font-medium text-steel hover:text-white hover:bg-white/[0.05] transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isCreating || !newName.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs font-body font-semibold bg-gradient-to-r from-gold to-gold/80 text-charcoal hover:from-gold/90 hover:to-gold/70 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isCreating ? <><Loader2 size={12} className="animate-spin" /> Creating...</> : <><Plus size={12} /> Create Property</>}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body,
      )
    : null;

  if (!hasMultipleProperties) {
    // Single-property: show the property card with an "Add Property" button
    if (collapsed || !property) return null;
    return (
      <>
        <div className="relative z-10 mx-3 mb-3 p-3 rounded-xl bg-gradient-to-br from-gold/[0.1] via-teal/[0.04] to-transparent border border-white/[0.08] backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold/40 to-gold/15 flex items-center justify-center flex-shrink-0 shadow-[0_4px_12px_rgba(201,168,76,0.2),inset_0_1px_0_rgba(255,255,255,0.15)] ring-1 ring-gold/20">
              <Building2 size={16} className="text-gold drop-shadow-[0_0_4px_rgba(201,168,76,0.3)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-white truncate font-body">{property.name}</p>
              <p className="text-[10px] text-steel truncate font-body">{property.address.city}, {property.address.postcode}</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-2.5 flex items-center gap-1.5 w-full px-2.5 py-1.5 rounded-lg text-[11px] font-body font-medium text-steel hover:text-gold hover:bg-white/[0.04] transition-all duration-150 border border-transparent hover:border-white/[0.06]"
          >
            <Plus size={12} /> Add Another Property
          </button>
        </div>
        {showCreate && createPropertyDialog}
      </>
    );
  }

  // Multi-property: show dropdown switcher
  const dropdown = open
    ? createPortal(
        <>
          {/* Invisible backdrop to catch clicks */}
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div
            ref={dropdownRef}
            className="fixed rounded-xl border border-white/[0.1] bg-[#0d1117] shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-[9999] overflow-hidden"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            <div className="p-2 border-b border-white/[0.06]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-steel/50 font-body px-2">Switch Property</p>
            </div>
            <div className="p-1.5 max-h-64 overflow-y-auto space-y-0.5">
              {/* Group View option */}
              <button
                onClick={() => {
                  switchProperty('all');
                  navigate('/dashboard/group');
                  setOpen(false);
                }}
                className={cn(
                  'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg transition-all duration-150',
                  activePropertyId === null
                    ? 'bg-gradient-to-r from-gold/[0.12] to-teal/[0.06] border border-gold/20'
                    : 'hover:bg-white/[0.04] border border-transparent',
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal/30 to-teal/10 flex items-center justify-center">
                  <LayoutGrid size={14} className="text-teal" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-xs font-semibold text-white font-body">All Properties</p>
                  <p className="text-[10px] text-steel/70 font-body">{properties.length} hotels · Group view</p>
                </div>
                {activePropertyId === null && (
                  <Check size={14} className="text-gold shrink-0" />
                )}
              </button>

              {/* Individual properties */}
              {properties.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    switchProperty(p.id);
                    navigate('/dashboard');
                    setOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg transition-all duration-150',
                    activePropertyId === p.id
                      ? 'bg-gradient-to-r from-gold/[0.12] to-teal/[0.06] border border-gold/20'
                      : 'hover:bg-white/[0.04] border border-transparent',
                  )}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center ring-1 ring-gold/15">
                    <span className="text-[11px] font-bold text-gold font-body">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-xs font-semibold text-white font-body truncate">{p.name}</p>
                    <p className="text-[10px] text-steel/70 font-body truncate">{p.address.city}</p>
                  </div>
                  {activePropertyId === p.id && (
                    <Check size={14} className="text-gold shrink-0" />
                  )}
                </button>
              ))}
            </div>
            {/* Add Property button */}
            <div className="p-1.5 border-t border-white/[0.06]">
              <button
                onClick={() => { setOpen(false); setShowCreate(true); }}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-body font-medium text-steel hover:text-gold hover:bg-white/[0.04] transition-all duration-150"
              >
                <Plus size={14} /> Add Property
              </button>
            </div>
          </div>
        </>,
        document.body,
      )
    : null;

  return (
    <div className="relative z-10 mx-3 mb-3">
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full p-3 rounded-xl border backdrop-blur-sm transition-all duration-300 group text-left',
          'bg-gradient-to-br from-gold/[0.1] via-teal/[0.04] to-transparent',
          open
            ? 'border-gold/30 shadow-[0_8px_32px_rgba(201,168,76,0.15)]'
            : 'border-white/[0.08] hover:border-white/[0.14]',
        )}
      >
        {collapsed ? (
          <div className="flex items-center justify-center">
            <Building2 size={18} className="text-gold" />
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold/40 to-gold/15 flex items-center justify-center flex-shrink-0 shadow-[0_4px_12px_rgba(201,168,76,0.2),inset_0_1px_0_rgba(255,255,255,0.15)] ring-1 ring-gold/20">
              <Building2 size={16} className="text-gold drop-shadow-[0_0_4px_rgba(201,168,76,0.3)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-white truncate font-body">
                {property?.name ?? 'All Properties'}
              </p>
              <p className="text-[10px] text-steel truncate font-body">
                {property ? `${property.address.city}` : `${properties.length} hotels`}
              </p>
            </div>
            <ChevronDown
              size={14}
              className={cn(
                'text-steel transition-transform duration-200 shrink-0',
                open && 'rotate-180 text-gold',
              )}
            />
          </div>
        )}
      </button>
      {dropdown}
      {showCreate && createPropertyDialog}
    </div>
  );
}
