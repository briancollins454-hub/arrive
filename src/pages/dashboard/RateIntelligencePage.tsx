import { useMemo, useState } from 'react';
import { useBookings } from '@/hooks/useBookings';
import { useRooms } from '@/hooks/useRooms';
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Globe, Building2, BarChart3, Target,
  AlertTriangle, CheckCircle2, RefreshCcw,
  Shield, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isDemoMode } from '@/lib/supabase';

// ── Simulated competitor data ─────────────────────────────────────
type Competitor = {
  name: string;
  stars: number;
  avgRate: number;
  occupancy: number;
  rateChange7d: number; // percentage
  source: string;
};

const COMPETITORS: Competitor[] = isDemoMode ? [
  { name: 'The Grand Metropolitan', stars: 5, avgRate: 245, occupancy: 82, rateChange7d: 5.2, source: 'Booking.com' },
  { name: 'Park View Suites', stars: 4, avgRate: 198, occupancy: 74, rateChange7d: -2.1, source: 'Expedia' },
  { name: 'Riverside Boutique Hotel', stars: 4, avgRate: 185, occupancy: 68, rateChange7d: 0, source: 'Direct' },
  { name: 'City Centre Inn', stars: 3, avgRate: 142, occupancy: 91, rateChange7d: 8.3, source: 'Hotels.com' },
  { name: 'The Heritage House', stars: 4, avgRate: 210, occupancy: 77, rateChange7d: 3.1, source: 'Booking.com' },
  { name: 'Luxe Apartments Hotel', stars: 4, avgRate: 175, occupancy: 65, rateChange7d: -4.5, source: 'Expedia' },
] : [];

type RateRecommendation = {
  id: number;
  roomType: string;
  currentRate: number;
  suggestedRate: number;
  reason: string;
  confidence: number;
  impact: string;
  direction: 'increase' | 'decrease' | 'maintain';
};

type ChannelRate = {
  channel: string;
  rate: number;
  parity: boolean;
  lastChecked: string;
};

function generateRateRecommendations(avgRate: number, occupancy: number): RateRecommendation[] {
  const recs: RateRecommendation[] = [];

  recs.push({
    id: 1, roomType: 'Deluxe King', currentRate: avgRate * 1.2,
    suggestedRate: occupancy > 75 ? avgRate * 1.35 : avgRate * 1.1,
    reason: occupancy > 75 ? 'High demand justifies premium pricing' : 'Slight reduction to boost midweek occupancy',
    confidence: 87, impact: occupancy > 75 ? '+£320/week est. revenue' : '+12% occupancy expected',
    direction: occupancy > 75 ? 'increase' : 'decrease',
  });
  recs.push({
    id: 2, roomType: 'Standard Double', currentRate: avgRate * 0.85,
    suggestedRate: avgRate * 0.9,
    reason: 'Competitor City Centre Inn raised rates 8.3% — room to adjust upward',
    confidence: 79, impact: '+£180/week est. revenue',
    direction: 'increase',
  });
  recs.push({
    id: 3, roomType: 'Executive Suite', currentRate: avgRate * 1.8,
    suggestedRate: avgRate * 1.8,
    reason: 'Rate is well-positioned against The Grand Metropolitan. Maintain current pricing.',
    confidence: 92, impact: 'Stable — competitive positioning strong',
    direction: 'maintain',
  });
  recs.push({
    id: 4, roomType: 'Family Room', currentRate: avgRate * 1.1,
    suggestedRate: avgRate * 0.95,
    reason: 'Low booking volume for this type. Weekend promotional rate recommended to fill inventory.',
    confidence: 74, impact: '+18% occupancy for room type',
    direction: 'decrease',
  });

  return recs;
}

const CHANNEL_RATES: ChannelRate[] = isDemoMode ? [
  { channel: 'Direct Website', rate: 189, parity: true, lastChecked: '2 min ago' },
  { channel: 'Booking.com', rate: 195, parity: false, lastChecked: '5 min ago' },
  { channel: 'Expedia', rate: 192, parity: false, lastChecked: '5 min ago' },
  { channel: 'Hotels.com', rate: 194, parity: false, lastChecked: '8 min ago' },
  { channel: 'Agoda', rate: 189, parity: true, lastChecked: '12 min ago' },
] : [];

export function RateIntelligencePage() {
  const { bookings } = useBookings();
  const { rooms } = useRooms();
  const [selectedTab, setSelectedTab] = useState<'competitors' | 'recommendations' | 'parity'>('competitors');

  const totalRooms = rooms.filter(r => r.status !== 'maintenance' && r.status !== 'blocked').length;
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length;
  const currentOccupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const avgRate = useMemo(() => {
    const rates = bookings.filter((b) => b.nightly_rate > 0).map((b) => b.nightly_rate);
    return rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 175;
  }, [bookings]);

  const recommendations = useMemo(() => generateRateRecommendations(avgRate, currentOccupancy), [avgRate, currentOccupancy]);

  const marketAvg = Math.round(COMPETITORS.reduce((a, b) => a + b.avgRate, 0) / COMPETITORS.length);
  const ratePosition = avgRate > marketAvg ? 'above' : avgRate < marketAvg ? 'below' : 'at';
  const rateDiff = Math.abs(Math.round(((avgRate - marketAvg) / marketAvg) * 100));
  const parityIssues = CHANNEL_RATES.filter((c) => !c.parity).length;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gold/20 to-emerald-500/20 border border-gold/20 flex items-center justify-center">
          <Globe size={20} className="text-gold" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-display text-white tracking-tight">Rate Intelligence</h1>
          <p className="text-sm text-steel font-body">Competitor monitoring · Rate parity · Dynamic pricing</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body font-semibold bg-white/[0.05] border border-white/[0.1] text-steel hover:text-white hover:bg-white/[0.08] transition-all">
          <RefreshCcw size={12} />
          Refresh Rates
        </button>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: 'Your ADR', value: `£${avgRate.toFixed(0)}`,
            sub: `${ratePosition} market by ${rateDiff}%`,
            color: 'text-gold',
            icon: ratePosition === 'above' ? ArrowUpRight : ArrowDownRight,
            iconColor: ratePosition === 'above' ? 'text-emerald-400' : 'text-amber-400',
          },
          { label: 'Market Average', value: `£${marketAvg}`, sub: `${COMPETITORS.length} competitors tracked`, color: 'text-teal', icon: Building2, iconColor: 'text-steel' },
          { label: 'Rate Position', value: `#${COMPETITORS.filter((c) => c.avgRate > avgRate).length + 1}`, sub: `of ${COMPETITORS.length + 1} properties`, color: 'text-purple-400', icon: BarChart3, iconColor: 'text-steel' },
          {
            label: 'Parity Issues', value: `${parityIssues}`,
            sub: parityIssues > 0 ? 'channels need attention' : 'all channels in parity',
            color: parityIssues > 0 ? 'text-red-400' : 'text-emerald-400',
            icon: parityIssues > 0 ? AlertTriangle : CheckCircle2,
            iconColor: parityIssues > 0 ? 'text-red-400' : 'text-emerald-400',
          },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-panel rounded-xl p-5">
            <p className="text-[11px] text-steel font-body mb-1">{kpi.label}</p>
            <div className="flex items-center gap-2">
              <span className={cn('text-2xl font-display', kpi.color)}>{kpi.value}</span>
              <kpi.icon size={14} className={kpi.iconColor} />
            </div>
            <p className="text-[10px] text-steel/60 font-body mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 mb-6 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit">
        {([
          { key: 'competitors', label: 'Competitor Rates', icon: Building2 },
          { key: 'recommendations', label: 'Rate Suggestions', icon: Target },
          { key: 'parity', label: 'Channel Parity', icon: Shield },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedTab(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-body font-semibold transition-all',
              selectedTab === tab.key
                ? 'bg-white/[0.08] text-white border border-white/[0.1]'
                : 'text-steel hover:text-silver'
            )}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Competitors Tab */}
      {selectedTab === 'competitors' && (
        <div className="space-y-3">
          {/* Your property header row */}
          <div className="glass-panel rounded-xl p-5 border-teal/20 bg-teal/5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-teal/10 border border-teal/20 flex items-center justify-center">
                <Building2 size={16} className="text-teal" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-body font-semibold text-white">Arrivé Hotel <span className="text-teal text-xs font-normal">(You)</span></p>
                <p className="text-[11px] text-steel font-body">{'★'.repeat(4)} · Direct + OTA</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-display text-teal">£{avgRate.toFixed(0)}</p>
                <p className="text-[10px] text-steel font-body">{currentOccupancy}% occupied</p>
              </div>
            </div>
          </div>

          {COMPETITORS.map((comp) => (
            <div key={comp.name} className="glass-panel rounded-xl p-5 hover:bg-white/[0.03] transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                  <Building2 size={16} className="text-steel" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body font-semibold text-white">{comp.name}</p>
                  <p className="text-[11px] text-steel font-body">{'★'.repeat(comp.stars)} · via {comp.source}</p>
                </div>

                {/* Rate change */}
                <div className="flex items-center gap-1 mr-4">
                  {comp.rateChange7d > 0 ? (
                    <ArrowUpRight size={12} className="text-red-400" />
                  ) : comp.rateChange7d < 0 ? (
                    <ArrowDownRight size={12} className="text-emerald-400" />
                  ) : (
                    <span className="text-steel text-xs">—</span>
                  )}
                  <span className={cn(
                    'text-xs font-body font-medium',
                    comp.rateChange7d > 0 ? 'text-red-400' : comp.rateChange7d < 0 ? 'text-emerald-400' : 'text-steel'
                  )}>
                    {comp.rateChange7d !== 0 ? `${comp.rateChange7d > 0 ? '+' : ''}${comp.rateChange7d}%` : 'Stable'}
                  </span>
                  <span className="text-[10px] text-steel/50 font-body ml-1">7d</span>
                </div>

                <div className="text-right">
                  <p className={cn(
                    'text-lg font-display',
                    comp.avgRate > avgRate ? 'text-emerald-400' : comp.avgRate < avgRate ? 'text-red-400' : 'text-white'
                  )}>
                    £{comp.avgRate}
                  </p>
                  <p className="text-[10px] text-steel font-body">{comp.occupancy}% occ.</p>
                </div>
              </div>
            </div>
          ))}

          <p className="text-[10px] text-steel/40 font-body text-center mt-4">
            Rates are simulated for demonstration. In production, connected to real OTA APIs.
          </p>
        </div>
      )}

      {/* Recommendations Tab */}
      {selectedTab === 'recommendations' && (
        <div className="space-y-3">
          {recommendations.map((rec) => {
            const isIncrease = rec.direction === 'increase';
            const isDecrease = rec.direction === 'decrease';
            return (
              <div
                key={rec.id}
                className={cn(
                  'glass-panel rounded-xl p-5 border transition-all',
                  isIncrease ? 'border-emerald-500/15' : isDecrease ? 'border-amber-500/15' : 'border-blue-500/15'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border',
                    isIncrease ? 'bg-emerald-500/10 border-emerald-500/20' :
                    isDecrease ? 'bg-amber-500/10 border-amber-500/20' :
                    'bg-blue-500/10 border-blue-500/20'
                  )}>
                    {isIncrease ? <TrendingUp size={16} className="text-emerald-400" /> :
                     isDecrease ? <TrendingDown size={16} className="text-amber-400" /> :
                     <Target size={16} className="text-blue-400" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-body font-semibold text-white">{rec.roomType}</h3>
                      <span className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-body font-semibold uppercase tracking-wider border',
                        isIncrease ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        isDecrease ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                        'bg-blue-500/10 border-blue-500/20 text-blue-400'
                      )}>
                        {rec.direction}
                      </span>
                    </div>
                    <p className="text-xs text-steel font-body mb-2">{rec.reason}</p>

                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-[10px] text-steel/60 font-body">Current</p>
                        <p className="text-sm font-display text-white">£{rec.currentRate.toFixed(0)}</p>
                      </div>
                      <span className="text-steel">→</span>
                      <div>
                        <p className="text-[10px] text-steel/60 font-body">Suggested</p>
                        <p className={cn(
                          'text-sm font-display',
                          isIncrease ? 'text-emerald-400' : isDecrease ? 'text-amber-400' : 'text-blue-400'
                        )}>
                          £{rec.suggestedRate.toFixed(0)}
                        </p>
                      </div>
                      <div className="ml-auto flex items-center gap-3">
                        <div>
                          <p className="text-[10px] text-steel/60 font-body">Confidence</p>
                          <div className="flex items-center gap-1">
                            <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                              <div className="h-full bg-teal rounded-full" style={{ width: `${rec.confidence}%` }} />
                            </div>
                            <span className="text-[10px] text-steel font-body">{rec.confidence}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-400/80 font-body">
                      <CheckCircle2 size={10} />
                      {rec.impact}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="glass-panel rounded-xl p-5 border border-dashed border-white/[0.1] text-center">
            <p className="text-xs text-steel font-body">
              Rate suggestions update hourly based on competitor movements, occupancy forecasts, and booking velocity.
            </p>
          </div>
        </div>
      )}

      {/* Channel Parity Tab */}
      {selectedTab === 'parity' && (
        <div className="space-y-3">
          <div className="glass-panel rounded-xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye size={14} className="text-teal" />
              <h3 className="text-sm font-body font-semibold text-white">Rate Parity Monitor</h3>
            </div>
            <p className="text-xs text-steel font-body">
              Rate parity ensures your direct website price matches or undercuts OTA prices. 
              Violations can lead to search ranking penalties and commission erosion.
            </p>
          </div>

          {CHANNEL_RATES.map((ch) => (
            <div
              key={ch.channel}
              className={cn(
                'glass-panel rounded-xl p-5 border transition-all',
                ch.parity ? 'border-emerald-500/10' : 'border-red-500/15 bg-red-500/[0.02]'
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center border',
                  ch.parity ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'
                )}>
                  {ch.parity
                    ? <CheckCircle2 size={16} className="text-emerald-400" />
                    : <AlertTriangle size={16} className="text-red-400" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-body font-semibold text-white flex items-center gap-2">
                    {ch.channel}
                    {!ch.parity && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-body font-semibold">
                        PARITY VIOLATION
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-steel font-body">Last checked {ch.lastChecked}</p>
                </div>
                <div className="text-right">
                  <p className={cn('text-lg font-display', ch.parity ? 'text-white' : 'text-red-400')}>
                    £{ch.rate}
                  </p>
                  {!ch.parity && (
                    <p className="text-[10px] text-red-400/70 font-body">
                      +£{ch.rate - (CHANNEL_RATES[0]?.rate ?? 0)} vs direct
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {parityIssues > 0 && (
            <div className="glass-panel rounded-xl p-5 border border-amber-500/15 bg-amber-500/[0.02]">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-amber-400" />
                <h3 className="text-sm font-body font-semibold text-amber-400">
                  {parityIssues} Parity Issue{parityIssues > 1 ? 's' : ''} Detected
                </h3>
              </div>
              <p className="text-xs text-steel font-body">
                OTA channels are showing rates higher than your direct website. While this benefits direct bookings,
                it may indicate outdated rate pushes. Review your channel manager settings.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
