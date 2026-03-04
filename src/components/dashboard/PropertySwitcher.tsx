import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, Check, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProperty } from '@/hooks/useProperty';

interface PropertySwitcherProps {
  collapsed?: boolean;
}

export function PropertySwitcher({ collapsed = false }: PropertySwitcherProps) {
  const { property, properties, activePropertyId, hasMultipleProperties, switchProperty } = useProperty();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!hasMultipleProperties) {
    // Single-property: just show the property card, no dropdown
    if (collapsed || !property) return null;
    return (
      <div className="relative z-10 mx-3 mb-3 p-3 rounded-xl bg-gradient-to-br from-gold/[0.1] via-teal/[0.04] to-transparent border border-white/[0.08] backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold/40 to-gold/15 flex items-center justify-center flex-shrink-0 shadow-[0_4px_12px_rgba(201,168,76,0.2),inset_0_1px_0_rgba(255,255,255,0.15)] ring-1 ring-gold/20">
            <Building2 size={16} className="text-gold drop-shadow-[0_0_4px_rgba(201,168,76,0.3)]" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-white truncate font-body">{property.name}</p>
            <p className="text-[10px] text-steel truncate font-body">{property.address.city}, {property.address.postcode}</p>
          </div>
        </div>
      </div>
    );
  }

  // Multi-property: show dropdown switcher
  return (
    <div className="relative z-10 mx-3 mb-3" ref={ref}>
      <button
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

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border border-white/[0.1] bg-[#0d1117] shadow-[0_20px_60px_rgba(0,0,0,0.7)] z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
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
        </div>
      )}
    </div>
  );
}
