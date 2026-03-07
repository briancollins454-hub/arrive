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
import { Plus, Calendar, Edit, Trash2, ToggleLeft, ToggleRight, AlertTriangle, Tag, Percent, Layers } from 'lucide-react';
import { format, isAfter, isBefore, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { isDemoMode } from '@/lib/supabase';
import type { RatePeriod } from '@/types';
import type { RatePeriodFormData } from '@/lib/validators';
import { DashboardDatePicker, getPresetRange } from '@/components/shared/DashboardDatePicker';
import type { DateRange } from '@/components/shared/DashboardDatePicker';

// Day-of-week labels
const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Promo code type
interface PromoCode {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  valid_from: string;
  valid_until: string;
  max_uses: number;
  used_count: number;
  min_nights: number;
  is_active: boolean;
}

// Derived rate plan type
interface DerivedRatePlan {
  id: string;
  name: string;
  base_rate_id: string;
  derivation_type: 'percentage' | 'fixed';
  derivation_value: number;
  room_type_id: string | null;
  includes_breakfast: boolean;
  is_active: boolean;
}

// DOW pricing adjustment type (used for future API integration)
type DOWPricing = { id: string; rate_period_id: string; adjustments: Record<number, number> };
void (0 as unknown as DOWPricing);

export function RatesPage() {
  const { roomTypes, isLoadingTypes } = useRooms();
  const { ratePeriods, isLoading, createRate, updateRate, deleteRate, toggleActive } = useRatePeriods();

  const [showEditor, setShowEditor] = useState(false);
  const [editingRate, setEditingRate] = useState<RatePeriod | null>(null);
  const [filterRoomType, setFilterRoomType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'periods' | 'derived' | 'dow' | 'promos'>('periods');
  const [dateRange, setDateRange] = useState<DateRange>(getPresetRange('year'));

  // Promo codes state
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>(isDemoMode ? [
    { id: 'promo-1', code: 'WELCOME10', description: '10% off for new guests', discount_type: 'percentage', discount_value: 10, valid_from: '2026-01-01', valid_until: '2026-12-31', max_uses: 100, used_count: 23, min_nights: 2, is_active: true },
    { id: 'promo-2', code: 'LONGSTAY', description: '£50 off stays of 5+ nights', discount_type: 'fixed', discount_value: 50, valid_from: '2026-01-01', valid_until: '2026-06-30', max_uses: 50, used_count: 8, min_nights: 5, is_active: true },
    { id: 'promo-3', code: 'SUMMER25', description: '25% summer discount', discount_type: 'percentage', discount_value: 25, valid_from: '2026-06-01', valid_until: '2026-08-31', max_uses: 200, used_count: 0, min_nights: 1, is_active: false },
  ] : []);
  const [showAddPromo, setShowAddPromo] = useState(false);
  const [newPromo, setNewPromo] = useState({ code: '', description: '', discount_type: 'percentage' as 'percentage' | 'fixed', discount_value: '', valid_from: '', valid_until: '', max_uses: '100', min_nights: '1' });

  // Derived rate plans state
  const [derivedPlans, setDerivedPlans] = useState<DerivedRatePlan[]>(isDemoMode ? [
    { id: 'dr-1', name: 'BAR -10%', base_rate_id: '', derivation_type: 'percentage', derivation_value: -10, room_type_id: null, includes_breakfast: false, is_active: true },
    { id: 'dr-2', name: 'B&B Rate', base_rate_id: '', derivation_type: 'fixed', derivation_value: 25, room_type_id: null, includes_breakfast: true, is_active: true },
    { id: 'dr-3', name: 'Advance Purchase -15%', base_rate_id: '', derivation_type: 'percentage', derivation_value: -15, room_type_id: null, includes_breakfast: false, is_active: true },
  ] : []);
  const [showAddDerived, setShowAddDerived] = useState(false);

  // DOW pricing adjustments
  const [dowPricing, setDowPricing] = useState<Record<number, number>>(isDemoMode ? {
    0: 100, 1: 100, 2: 100, 3: 100, 4: 115, 5: 130, 6: 120,
  } : {
    0: 100, 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100,
  });

  if (isLoadingTypes || isLoading) return <PageSpinner />;

  // Filter
  const filtered = ratePeriods.filter((rp) => {
    if (filterRoomType !== 'all' && rp.room_type_id !== filterRoomType) return false;
    if (filterStatus === 'active' && !rp.is_active) return false;
    if (filterStatus === 'inactive' && rp.is_active) return false;
    // Date range filter: rate period overlaps selected range
    const rpStart = parseISO(rp.start_date);
    const rpEnd = parseISO(rp.end_date);
    if (rpEnd < startOfDay(dateRange.start) || rpStart > endOfDay(dateRange.end)) return false;
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
        {activeSubTab === 'periods' && (
          <Button onClick={openCreate}>
            <Plus size={16} className="mr-2" /> New Rate Period
          </Button>
        )}
        {activeSubTab === 'promos' && (
          <Button onClick={() => setShowAddPromo(true)}>
            <Plus size={16} className="mr-2" /> New Promo Code
          </Button>
        )}
        {activeSubTab === 'derived' && (
          <Button onClick={() => setShowAddDerived(true)}>
            <Plus size={16} className="mr-2" /> New Derived Plan
          </Button>
        )}
      </div>

      {/* Date Range Picker */}
      <div>
        <DashboardDatePicker
          value={dateRange}
          onChange={setDateRange}
          presets={['month', 'quarter', 'year']}
        />
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
        {([
          { id: 'periods' as const, label: 'Rate Periods', icon: Calendar },
          { id: 'derived' as const, label: 'Derived Plans', icon: Layers },
          { id: 'dow' as const, label: 'Day-of-Week', icon: Percent },
          { id: 'promos' as const, label: 'Promo Codes', icon: Tag },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-body font-medium transition-all whitespace-nowrap',
              activeSubTab === tab.id
                ? 'bg-white/[0.1] text-white shadow-sm'
                : 'text-steel hover:text-silver hover:bg-white/[0.04]'
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'periods' && (<>

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

      </>)}

      {/* ============================== */}
      {/* Derived Rate Plans Tab         */}
      {/* ============================== */}
      {activeSubTab === 'derived' && (
        <div className="space-y-4">
          <p className="text-xs text-steel font-body">
            Derived rate plans automatically calculate from a base rate (BAR). Instead of setting fixed prices, define an offset or percentage adjustment.
          </p>

          {showAddDerived && (
            <Card variant="dark" className="border-teal/20">
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-steel font-body mb-1">Plan Name</label>
                    <input className="input-dark w-full text-sm py-2 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white" placeholder="e.g. B&B Rate" />
                  </div>
                  <div>
                    <label className="block text-xs text-steel font-body mb-1">Derivation Type</label>
                    <select className="input-dark w-full text-sm py-2 px-3 rounded-xl bg-charcoal border border-white/[0.06]">
                      <option value="percentage">Percentage (± %)</option>
                      <option value="fixed">Fixed Amount (± £)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-steel font-body mb-1">Adjustment Value</label>
                    <input className="input-dark w-full text-sm py-2 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white" type="number" placeholder="-10 or +25" />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm text-silver font-body cursor-pointer pb-2">
                      <input type="checkbox" className="rounded border-white/20 bg-white/5" />
                      Includes Breakfast
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => {
                    setDerivedPlans([...derivedPlans, { id: `dr-${Date.now()}`, name: 'New Plan', base_rate_id: '', derivation_type: 'percentage', derivation_value: 0, room_type_id: null, includes_breakfast: false, is_active: true }]);
                    setShowAddDerived(false);
                    toast.success('Derived rate plan created');
                  }}>
                    <Plus size={14} className="mr-1" /> Save Plan
                  </Button>
                  <Button variant="ghost-dark" size="sm" onClick={() => setShowAddDerived(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {derivedPlans.map(plan => (
              <Card key={plan.id} variant="dark">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center border text-xs font-display font-bold', plan.is_active ? 'bg-teal/10 border-teal/20 text-teal' : 'bg-white/5 border-white/10 text-steel')}>
                      <Layers size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-body font-medium text-white">{plan.name}</p>
                        {plan.includes_breakfast && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-400/10 text-[9px] font-semibold text-amber-400 border border-amber-400/20">B&B</span>
                        )}
                      </div>
                      <p className="text-xs text-steel font-body">
                        BAR {plan.derivation_value >= 0 ? '+' : ''}{plan.derivation_value}{plan.derivation_type === 'percentage' ? '%' : ''}
                        {plan.derivation_type === 'fixed' ? ` (£${Math.abs(plan.derivation_value)})` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setDerivedPlans(derivedPlans.map(p => p.id === plan.id ? { ...p, is_active: !p.is_active } : p))}>
                      {plan.is_active ? <ToggleRight size={20} className="text-emerald-400" /> : <ToggleLeft size={20} className="text-steel" />}
                    </button>
                    <button onClick={() => { setDerivedPlans(derivedPlans.filter(p => p.id !== plan.id)); toast.success('Plan deleted'); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-steel hover:text-red-400 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ============================== */}
      {/* Day-of-Week Pricing Tab        */}
      {/* ============================== */}
      {activeSubTab === 'dow' && (
        <div className="space-y-4">
          <Card variant="dark">
            <CardContent className="p-5 space-y-4">
              <p className="text-xs text-steel font-body">
                Set day-of-week multipliers applied to all rate periods. 100% = no change, 130% = 30% surcharge. 
                These multiply your base rate period prices.
              </p>
              <div className="grid grid-cols-7 gap-3">
                {DOW_LABELS.map((day, i) => (
                  <div key={day} className="text-center space-y-2">
                    <label className="block text-xs text-steel font-body font-medium">{day}</label>
                    <input
                      type="number"
                      min={50}
                      max={300}
                      value={dowPricing[i] ?? 100}
                      onChange={e => setDowPricing({ ...dowPricing, [i]: parseInt(e.target.value) || 100 })}
                      className="w-full text-center text-sm py-2 px-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white font-body focus:outline-none focus:ring-1 focus:ring-teal/40"
                    />
                    <div className={cn('h-1.5 rounded-full mx-auto transition-all', (dowPricing[i] ?? 100) > 100 ? 'bg-gold' : (dowPricing[i] ?? 100) < 100 ? 'bg-blue-400' : 'bg-white/10')} style={{ width: `${Math.min(100, ((dowPricing[i] ?? 100) / 150) * 100)}%` }} />
                    <p className={cn('text-[10px] font-body', (dowPricing[i] ?? 100) > 100 ? 'text-gold' : (dowPricing[i] ?? 100) < 100 ? 'text-blue-400' : 'text-steel')}>
                      {(dowPricing[i] ?? 100) === 100 ? 'Base' : `${(dowPricing[i] ?? 100) > 100 ? '+' : ''}${(dowPricing[i] ?? 100) - 100}%`}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-white/[0.06]">
                <button onClick={() => setDowPricing({ 0: 100, 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 })} className="text-xs text-steel hover:text-silver font-body transition-colors">
                  Reset All to 100%
                </button>
                <Button size="sm" onClick={() => toast.success('Day-of-week pricing saved')}>
                  Save DOW Pricing
                </Button>
              </div>

              {/* Preview with example */}
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
                <p className="text-[11px] text-steel font-body font-semibold uppercase tracking-wider mb-2">Preview (£150/night base rate)</p>
                <div className="grid grid-cols-7 gap-2 text-center">
                  {DOW_LABELS.map((day, i) => (
                    <div key={day}>
                      <p className="text-[10px] text-steel font-body">{day}</p>
                      <p className={cn('text-sm font-display font-bold', (dowPricing[i] ?? 100) > 100 ? 'text-gold' : (dowPricing[i] ?? 100) < 100 ? 'text-blue-400' : 'text-white')}>
                        £{Math.round(150 * (dowPricing[i] ?? 100) / 100)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================== */}
      {/* Promo Codes Tab                */}
      {/* ============================== */}
      {activeSubTab === 'promos' && (
        <div className="space-y-4">
          {/* Add Promo Form */}
          {showAddPromo && (
            <Card variant="dark" className="border-teal/20">
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-steel font-body mb-1">Promo Code</label>
                    <input className="input-dark w-full text-sm py-2 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white uppercase" placeholder="e.g. SUMMER25" value={newPromo.code} onChange={e => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase().replace(/\s/g, '') })} />
                  </div>
                  <div>
                    <label className="block text-xs text-steel font-body mb-1">Description</label>
                    <input className="input-dark w-full text-sm py-2 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white" placeholder="Summer discount" value={newPromo.description} onChange={e => setNewPromo({ ...newPromo, description: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-steel font-body mb-1">Discount Type</label>
                    <select className="input-dark w-full text-sm py-2 px-3 rounded-xl bg-charcoal border border-white/[0.06]" value={newPromo.discount_type} onChange={e => setNewPromo({ ...newPromo, discount_type: e.target.value as 'percentage' | 'fixed' })}>
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (£)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-steel font-body mb-1">Discount Value</label>
                    <input className="input-dark w-full text-sm py-2 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white" type="number" placeholder="10" value={newPromo.discount_value} onChange={e => setNewPromo({ ...newPromo, discount_value: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-steel font-body mb-1">Valid From</label>
                    <input className="input-dark w-full text-sm py-2 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white" type="date" value={newPromo.valid_from} onChange={e => setNewPromo({ ...newPromo, valid_from: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-steel font-body mb-1">Valid Until</label>
                    <input className="input-dark w-full text-sm py-2 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white" type="date" value={newPromo.valid_until} onChange={e => setNewPromo({ ...newPromo, valid_until: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-steel font-body mb-1">Max Uses</label>
                    <input className="input-dark w-full text-sm py-2 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white" type="number" value={newPromo.max_uses} onChange={e => setNewPromo({ ...newPromo, max_uses: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-steel font-body mb-1">Min Nights</label>
                    <input className="input-dark w-full text-sm py-2 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white" type="number" value={newPromo.min_nights} onChange={e => setNewPromo({ ...newPromo, min_nights: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => {
                    if (!newPromo.code) { toast.error('Promo code is required'); return; }
                    setPromoCodes([...promoCodes, {
                      id: `promo-${Date.now()}`, code: newPromo.code, description: newPromo.description,
                      discount_type: newPromo.discount_type, discount_value: parseFloat(newPromo.discount_value) || 0,
                      valid_from: newPromo.valid_from, valid_until: newPromo.valid_until,
                      max_uses: parseInt(newPromo.max_uses) || 100, used_count: 0,
                      min_nights: parseInt(newPromo.min_nights) || 1, is_active: true,
                    }]);
                    setNewPromo({ code: '', description: '', discount_type: 'percentage', discount_value: '', valid_from: '', valid_until: '', max_uses: '100', min_nights: '1' });
                    setShowAddPromo(false);
                    toast.success('Promo code created');
                  }}>
                    <Plus size={14} className="mr-1" /> Create Code
                  </Button>
                  <Button variant="ghost-dark" size="sm" onClick={() => setShowAddPromo(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Promo codes list */}
          <div className="space-y-2">
            {promoCodes.map(promo => {
              const usagePct = promo.max_uses > 0 ? (promo.used_count / promo.max_uses) * 100 : 0;
              return (
                <Card key={promo.id} variant="dark">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center border text-xs font-display font-bold', promo.is_active ? 'bg-gold/10 border-gold/20 text-gold' : 'bg-white/5 border-white/10 text-steel')}>
                        <Tag size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-white/[0.06] text-gold font-mono text-xs font-bold">{promo.code}</span>
                          <p className="text-sm text-silver font-body truncate">{promo.description}</p>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-steel font-body">
                          <span>{promo.discount_type === 'percentage' ? `${promo.discount_value}% off` : `£${promo.discount_value} off`}</span>
                          <span>·</span>
                          <span>{promo.min_nights}+ nights</span>
                          <span>·</span>
                          <span>{promo.used_count}/{promo.max_uses} used</span>
                          {promo.valid_from && promo.valid_until && (
                            <>
                              <span>·</span>
                              <span>{format(new Date(promo.valid_from), 'MMM d')} – {format(new Date(promo.valid_until), 'MMM d, yyyy')}</span>
                            </>
                          )}
                        </div>
                        <div className="mt-1.5 h-1 rounded-full bg-white/[0.06] w-24">
                          <div className={cn('h-full rounded-full', usagePct > 80 ? 'bg-red-400' : usagePct > 50 ? 'bg-amber-400' : 'bg-emerald-400')} style={{ width: `${Math.min(100, usagePct)}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setPromoCodes(promoCodes.map(p => p.id === promo.id ? { ...p, is_active: !p.is_active } : p))}>
                        {promo.is_active ? <ToggleRight size={20} className="text-emerald-400" /> : <ToggleLeft size={20} className="text-steel" />}
                      </button>
                      <button onClick={() => { setPromoCodes(promoCodes.filter(p => p.id !== promo.id)); toast.success('Promo code deleted'); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-steel hover:text-red-400 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {promoCodes.length === 0 && (
              <Card variant="dark">
                <CardContent className="p-8 text-center">
                  <Tag size={32} className="mx-auto text-steel/30 mb-2" />
                  <p className="text-sm text-steel font-body">No promo codes yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
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
