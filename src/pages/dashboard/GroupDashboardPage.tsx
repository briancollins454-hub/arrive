import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, TrendingUp,
  ArrowRight, LogIn, LogOut,
  DollarSign, Percent, BarChart3, MapPin,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useProperty } from '@/hooks/useProperty';
import { format } from 'date-fns';
import type { Property, PropertySummary } from '@/types';

// ============================================================
// DEMO DATA GENERATOR — per-property synthetic KPIs
// ============================================================

function generatePropertySummary(property: Property, index: number): PropertySummary {
  // Deterministic-ish demo data based on index so numbers stay stable
  const roomCounts = [10, 8, 6];
  const totalRooms = roomCounts[index % roomCounts.length] ?? 10;
  const occupancyPcts = [82, 71, 93];
  const occupancyPct = occupancyPcts[index % occupancyPcts.length] ?? 75;
  const occupiedRooms = Math.round(totalRooms * occupancyPct / 100);
  const arrivalsData = [3, 2, 1];
  const departuresData = [2, 1, 2];
  const revenueData = [4250, 2890, 3540];
  const adrData = [185, 165, 245];

  return {
    property,
    totalRooms,
    occupiedRooms,
    occupancyPct,
    arrivals: arrivalsData[index % arrivalsData.length] ?? 2,
    departures: departuresData[index % departuresData.length] ?? 1,
    inHouse: occupiedRooms,
    todayRevenue: revenueData[index % revenueData.length] ?? 3000,
    adr: adrData[index % adrData.length] ?? 180,
    revpar: Math.round((adrData[index % adrData.length] ?? 180) * occupancyPct / 100),
  };
}

// ============================================================
// Metric Card
// ============================================================

function MetricCard({ icon: Icon, label, value, sub, color, trend }: {
  icon: typeof Building2;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  trend?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 group hover:border-white/[0.12] transition-all duration-500">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative flex items-start gap-4">
        <div className={cn(
          'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
          color === 'gold' && 'bg-gradient-to-br from-gold/20 to-gold/5',
          color === 'teal' && 'bg-gradient-to-br from-teal/20 to-teal/5',
          color === 'blue' && 'bg-gradient-to-br from-blue-500/20 to-blue-500/5',
          color === 'purple' && 'bg-gradient-to-br from-purple-500/20 to-purple-500/5',
        )}>
          <Icon size={20} className={cn(
            color === 'gold' && 'text-gold',
            color === 'teal' && 'text-teal',
            color === 'blue' && 'text-blue-400',
            color === 'purple' && 'text-purple-400',
          )} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-steel font-body mb-1">{label}</p>
          <p className="text-2xl font-bold text-white font-body tracking-tight">{value}</p>
          {sub && <p className="text-[11px] text-steel/70 mt-0.5 font-body">{sub}</p>}
          {trend && (
            <span className="inline-flex items-center gap-0.5 mt-1 text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">
              <TrendingUp size={10} />
              {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Property Row — per-hotel summary card
// ============================================================

function PropertyRow({ summary, currency, onSelect }: {
  summary: PropertySummary;
  currency: string;
  onSelect: () => void;
}) {
  const p = summary.property;
  const occupancyColor = summary.occupancyPct >= 85
    ? 'text-emerald-400'
    : summary.occupancyPct >= 60
    ? 'text-gold'
    : 'text-rose-400';

  return (
    <button
      onClick={onSelect}
      className="w-full text-left group"
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-white/[0.01] p-5 hover:border-gold/20 hover:shadow-[0_8px_32px_rgba(201,168,76,0.08)] transition-all duration-500">
        {/* Hover shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold/30 to-gold/10 flex items-center justify-center ring-1 ring-gold/20 shrink-0">
              <span className="text-sm font-bold text-gold font-body">{p.name.charAt(0)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white font-body truncate">{p.name}</p>
              <div className="flex items-center gap-1 text-[11px] text-steel/70 font-body">
                <MapPin size={10} />
                <span>{p.address.city}, {p.address.postcode}</span>
              </div>
            </div>
            <ArrowRight size={16} className="text-steel/40 group-hover:text-gold group-hover:translate-x-0.5 transition-all duration-300 shrink-0" />
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-[10px] text-steel/60 font-body mb-0.5">Occupancy</p>
              <p className={cn('text-lg font-bold font-body', occupancyColor)}>{summary.occupancyPct}%</p>
              <p className="text-[10px] text-steel/50">{summary.occupiedRooms}/{summary.totalRooms} rooms</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-[10px] text-steel/60 font-body mb-0.5">Revenue</p>
              <p className="text-lg font-bold font-body text-white">{formatCurrency(summary.todayRevenue, currency)}</p>
              <p className="text-[10px] text-steel/50">today</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-[10px] text-steel/60 font-body mb-0.5">ADR</p>
              <p className="text-lg font-bold font-body text-gold">{formatCurrency(summary.adr, currency)}</p>
              <p className="text-[10px] text-steel/50">avg daily rate</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-[10px] text-steel/60 font-body mb-0.5">Movements</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-400">
                  <LogIn size={10} />{summary.arrivals}
                </span>
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-400">
                  <LogOut size={10} />{summary.departures}
                </span>
              </div>
              <p className="text-[10px] text-steel/50 mt-0.5">in/out</p>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

// ============================================================
// Occupancy Bar (visual comparison)
// ============================================================

function OccupancyComparison({ summaries }: { summaries: PropertySummary[] }) {
  return (
    <div className="space-y-3">
      {summaries.map((s) => {
        const pct = s.occupancyPct;
        const barColor = pct >= 85
          ? 'from-emerald-500 to-emerald-400'
          : pct >= 60
          ? 'from-gold to-gold-light'
          : 'from-rose-500 to-rose-400';

        return (
          <div key={s.property.id} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white font-body font-medium truncate">{s.property.name}</span>
              <span className={cn(
                'text-xs font-bold font-body',
                pct >= 85 ? 'text-emerald-400' : pct >= 60 ? 'text-gold' : 'text-rose-400',
              )}>{pct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-1000', barColor)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// GROUP DASHBOARD PAGE
// ============================================================

export function GroupDashboardPage() {
  const navigate = useNavigate();
  const { properties, switchProperty } = useProperty();

  const summaries = useMemo(
    () => properties.map((p, i) => generatePropertySummary(p, i)),
    [properties],
  );

  // Aggregate totals
  const totals = useMemo(() => {
    const t = {
      properties: summaries.length,
      totalRooms: 0,
      occupiedRooms: 0,
      arrivals: 0,
      departures: 0,
      revenue: 0,
    };
    for (const s of summaries) {
      t.totalRooms += s.totalRooms;
      t.occupiedRooms += s.occupiedRooms;
      t.arrivals += s.arrivals;
      t.departures += s.departures;
      t.revenue += s.todayRevenue;
    }
    return t;
  }, [summaries]);

  const overallOccupancy = totals.totalRooms > 0
    ? Math.round((totals.occupiedRooms / totals.totalRooms) * 100)
    : 0;

  const overallAdr = totals.occupiedRooms > 0
    ? Math.round(totals.revenue / totals.occupiedRooms)
    : 0;

  const overallRevpar = totals.totalRooms > 0
    ? Math.round(totals.revenue / totals.totalRooms)
    : 0;

  const currency = properties[0]?.settings.currency ?? 'GBP';

  const handleSelectProperty = (id: string) => {
    switchProperty(id);
    navigate('/dashboard');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-white">
            Portfolio Overview
          </h1>
          <p className="text-sm text-steel font-body mt-1">
            {format(new Date(), 'EEEE, d MMMM yyyy')} &middot; {totals.properties} properties
          </p>
        </div>
      </div>

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Building2}
          label="Total Rooms"
          value={totals.totalRooms}
          sub={`${totals.occupiedRooms} occupied`}
          color="gold"
        />
        <MetricCard
          icon={Percent}
          label="Portfolio Occupancy"
          value={`${overallOccupancy}%`}
          sub={`${totals.occupiedRooms}/${totals.totalRooms} rooms`}
          color="teal"
          trend="+4.2% vs last week"
        />
        <MetricCard
          icon={DollarSign}
          label="Today's Revenue"
          value={formatCurrency(totals.revenue, currency)}
          sub={`ADR: ${formatCurrency(overallAdr, currency)}`}
          color="blue"
          trend="+8.1% vs yesterday"
        />
        <MetricCard
          icon={Users}
          label="Guest Movements"
          value={`${totals.arrivals} in / ${totals.departures} out`}
          sub={`${totals.occupiedRooms} guests in-house`}
          color="purple"
        />
      </div>

      {/* Middle Row: Occupancy Comparison + Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occupancy Comparison */}
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-white/[0.01] p-6">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 size={18} className="text-teal" />
            <h2 className="text-sm font-semibold text-white font-body">Occupancy by Property</h2>
          </div>
          <OccupancyComparison summaries={summaries} />
        </div>

        {/* Revenue split */}
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-white/[0.01] p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={18} className="text-gold" />
            <h2 className="text-sm font-semibold text-white font-body">Revenue by Property</h2>
          </div>
          <div className="space-y-4">
            {summaries.map((s) => {
              const pct = totals.revenue > 0 ? Math.round((s.todayRevenue / totals.revenue) * 100) : 0;
              return (
                <div key={s.property.id} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center ring-1 ring-gold/15 shrink-0">
                    <span className="text-[10px] font-bold text-gold">{s.property.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white font-body font-medium truncate">{s.property.name}</span>
                      <span className="text-xs font-bold text-white font-body">{formatCurrency(s.todayRevenue, currency)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-gold to-gold-light transition-all duration-1000"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-steel font-body font-medium w-8 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-xs text-steel font-body">Combined RevPAR</span>
            <span className="text-sm font-bold text-gold font-body">{formatCurrency(overallRevpar, currency)}</span>
          </div>
        </div>
      </div>

      {/* Property Cards */}
      <div>
        <h2 className="text-lg font-semibold text-white font-body mb-4">Your Properties</h2>
        <div className="space-y-4">
          {summaries.map((s) => (
            <PropertyRow
              key={s.property.id}
              summary={s}
              currency={currency}
              onSelect={() => handleSelectProperty(s.property.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
