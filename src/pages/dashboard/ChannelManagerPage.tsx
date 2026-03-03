import { useState, useMemo } from 'react';
import { useBookings } from '@/hooks/useBookings';
import { useRooms } from '@/hooks/useRooms';
import { useRatePeriods } from '@/hooks/useRatePeriods';
import { useAllFolios } from '@/hooks/useFolios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Globe, Wifi, RefreshCw, ArrowUpRight, ArrowDownRight,
  CheckCircle2, AlertTriangle, XCircle, BarChart3,
  DollarSign, TrendingUp, Percent, ShieldCheck, ShieldAlert, Link2,
  Unplug, Activity, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { format, subDays, differenceInDays, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import type { BookingSource, Booking, FolioEntry } from '@/types';
interface OTAChannel {
  id: BookingSource;
  name: string;
  logo: string;
  color: string;
  commissionRate: number;
  connected: boolean;
  lastSync: Date | null;
  status: 'active' | 'paused' | 'error' | 'disconnected';
}

const OTA_CHANNELS: OTAChannel[] = [
  { id: 'booking_com', name: 'Booking.com', logo: 'B', color: '#003580', commissionRate: 15, connected: true, lastSync: new Date(Date.now() - 300_000), status: 'active' },
  { id: 'expedia', name: 'Expedia', logo: 'E', color: '#FBAF17', commissionRate: 18, connected: true, lastSync: new Date(Date.now() - 600_000), status: 'active' },
  { id: 'hotels_com', name: 'Hotels.com', logo: 'H', color: '#D32F2F', commissionRate: 20, connected: true, lastSync: new Date(Date.now() - 900_000), status: 'active' },
  { id: 'airbnb', name: 'Airbnb', logo: 'A', color: '#FF5A5F', commissionRate: 14, connected: true, lastSync: new Date(Date.now() - 1_800_000), status: 'paused' },
  { id: 'agoda', name: 'Agoda', logo: 'AG', color: '#5A2D82', commissionRate: 17, connected: false, lastSync: null, status: 'disconnected' },
  { id: 'tripadvisor', name: 'TripAdvisor', logo: 'TA', color: '#00AF87', commissionRate: 12, connected: false, lastSync: null, status: 'disconnected' },
  { id: 'direct', name: 'Direct Website', logo: 'D', color: '#0ea5a0', commissionRate: 0, connected: true, lastSync: new Date(), status: 'active' },
  { id: 'phone', name: 'Phone / Walk-in', logo: 'PH', color: '#64748b', commissionRate: 0, connected: true, lastSync: new Date(), status: 'active' },
];

function getChannelStats(bookings: Booking[], folioEntries: FolioEntry[], channelId: BookingSource) {
  const channelBookings = bookings.filter(b =>
    b.source === channelId && b.status !== 'cancelled' && b.status !== 'no_show'
  );
  const channelBookingIds = new Set(channelBookings.map(b => b.id));
  const channelCharges = folioEntries.filter(e => channelBookingIds.has(e.booking_id) && e.type === 'charge' && !e.is_voided);

  const now = new Date();
  const mStart = startOfMonth(now);
  const mEnd = endOfMonth(now);
  const last30 = subDays(now, 30);

  // Filter by stay dates (check-in/check-out overlap) not created_at
  const thisMonth = channelBookings.filter(b => {
    const ci = parseISO(b.check_in);
    const co = parseISO(b.check_out);
    return ci <= mEnd && co >= mStart;
  });

  const recent = channelBookings.filter(b => {
    const ci = parseISO(b.check_in);
    return ci >= last30;
  });

  const totalRevenue = channelCharges.reduce((s, e) => s + e.amount, 0);
  const monthCharges = channelCharges.filter(e => {
    const d = parseISO(e.posted_at);
    return isWithinInterval(d, { start: mStart, end: mEnd });
  });
  const monthRevenue = monthCharges.reduce((s, e) => s + e.amount, 0);
  const avgRate = channelBookings.length > 0
    ? channelBookings.reduce((s, b) => s + b.nightly_rate, 0) / channelBookings.length
    : 0;
  const avgStay = channelBookings.length > 0
    ? channelBookings.reduce((s, b) => s + Math.max(1, differenceInDays(parseISO(b.check_out), parseISO(b.check_in))), 0) / channelBookings.length
    : 0;

  return {
    totalBookings: channelBookings.length,
    monthBookings: thisMonth.length,
    recentBookings: recent.length,
    totalRevenue,
    monthRevenue,
    avgRate,
    avgStay,
  };
}

type ViewTab = 'connections' | 'performance' | 'parity';

export function ChannelManagerPage() {
  const { bookings } = useBookings();
  const { roomTypes } = useRooms();
  const { ratePeriods } = useRatePeriods();
  const { allEntries: folioEntries } = useAllFolios((bookings ?? []).map(b => b.id));
  const [activeTab, setActiveTab] = useState<ViewTab>('connections');
  const [syncingChannel, setSyncingChannel] = useState<string | null>(null);

  const allBookings = bookings ?? [];
  const allRoomTypes = roomTypes ?? [];
  const allRatePeriods = ratePeriods ?? [];

  const allFolioEntries = folioEntries ?? [];

  // ── Aggregate stats ────────────────────────────────────────────
  const channelPerformance = useMemo(() => {
    return OTA_CHANNELS.map(ch => ({
      ...ch,
      stats: getChannelStats(allBookings, allFolioEntries, ch.id),
    }));
  }, [allBookings, allFolioEntries]);

  const totalMonthRevenue = channelPerformance.reduce((s, c) => s + c.stats.monthRevenue, 0);
  const totalBookingsCount = channelPerformance.reduce((s, c) => s + c.stats.totalBookings, 0);
  const directRevenue = channelPerformance.filter(c => c.commissionRate === 0).reduce((s, c) => s + c.stats.monthRevenue, 0);
  const directRatio = totalMonthRevenue > 0 ? Math.round((directRevenue / totalMonthRevenue) * 100) : 0;

  const estimatedCommission = channelPerformance.reduce((s, c) => {
    return s + c.stats.monthRevenue * (c.commissionRate / 100);
  }, 0);

  // ── Rate parity simulation ────────────────────────────────────
  const parityData = useMemo(() => {
    return allRoomTypes.map(rt => {
      const baseRate = rt.base_rate;
      const activePeriod = allRatePeriods.find(rp =>
        rp.room_type_id === rt.id && rp.is_active &&
        parseISO(rp.start_date) <= new Date() && parseISO(rp.end_date) >= new Date()
      );
      const effectiveRate = activePeriod ? activePeriod.rate : baseRate;

      // Simulated OTA rates (±5-12% variance)
      const channels = OTA_CHANNELS.filter(c => c.connected && c.id !== 'direct' && c.id !== 'phone').map(ch => {
        const variance = ((ch.id.charCodeAt(0) * 7 + rt.name.length * 13) % 15 - 5) / 100;
        const otaRate = Math.round(effectiveRate * (1 + variance));
        const isParity = Math.abs(otaRate - effectiveRate) <= effectiveRate * 0.02;
        return {
          channel: ch,
          rate: otaRate,
          yourRate: effectiveRate,
          diff: otaRate - effectiveRate,
          diffPercent: ((otaRate - effectiveRate) / effectiveRate) * 100,
          isParity,
        };
      });

      const allParity = channels.every(c => c.isParity);
      return { roomType: rt, effectiveRate, channels, allParity };
    });
  }, [allRoomTypes, allRatePeriods]);

  const parityIssues = parityData.reduce((s, rt) => s + rt.channels.filter(c => !c.isParity).length, 0);

  // ── Sync simulation ───────────────────────────────────────────
  const handleSync = (channelId: string) => {
    setSyncingChannel(channelId);
    setTimeout(() => setSyncingChannel(null), 2000);
  };

  const tabs: { id: ViewTab; label: string; icon: typeof Globe }[] = [
    { id: 'connections', label: 'Connections', icon: Link2 },
    { id: 'performance', label: 'Performance', icon: BarChart3 },
    { id: 'parity', label: 'Rate Parity', icon: ShieldCheck },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Channel Manager</h1>
          <p className="text-sm text-steel font-body tracking-wide mt-1">
            OTA connections, revenue attribution &amp; rate parity monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline-dark" size="sm" onClick={() => handleSync('all')}>
            <RefreshCw size={14} className={cn('mr-1.5', syncingChannel === 'all' && 'animate-spin')} />
            Sync All
          </Button>
        </div>
      </div>

      {/* Quick KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active Channels', value: OTA_CHANNELS.filter(c => c.status === 'active').length, sub: `of ${OTA_CHANNELS.length} total`, icon: Wifi, accent: 'text-emerald-400' },
          { label: 'Monthly Revenue', value: `£${(totalMonthRevenue / 1000).toFixed(1)}k`, sub: `${totalBookingsCount} bookings`, icon: DollarSign, accent: 'text-gold' },
          { label: 'Direct Ratio', value: `${directRatio}%`, sub: `£${estimatedCommission.toFixed(0)} est. commission`, icon: TrendingUp, accent: 'text-teal' },
          { label: 'Rate Parity', value: parityIssues === 0 ? 'All Clear' : `${parityIssues} Issues`, sub: parityIssues === 0 ? 'All channels aligned' : 'Needs attention', icon: parityIssues === 0 ? ShieldCheck : ShieldAlert, accent: parityIssues === 0 ? 'text-emerald-400' : 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="glass-panel rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <s.icon size={18} className={s.accent} />
            </div>
            <div className="text-xl font-bold text-white font-display">{s.value}</div>
            <div className="text-xs text-silver">{s.label}</div>
            <div className="text-[10px] text-steel mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 glass-panel rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-body font-medium transition-all duration-200',
              activeTab === t.id
                ? 'bg-teal/15 text-teal shadow-[0_0_8px_rgba(14,165,160,0.1)]'
                : 'text-steel hover:text-silver hover:bg-white/[0.04]'
            )}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Connections ──────────────────────────────────────── */}
      {activeTab === 'connections' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {OTA_CHANNELS.map(ch => {
            const stats = channelPerformance.find(c => c.id === ch.id)?.stats;
            return (
              <div
                key={ch.id}
                className={cn(
                  'glass-panel rounded-xl p-5 space-y-4 transition-all duration-300',
                  ch.status === 'error' && 'border-red-500/20',
                  ch.status === 'paused' && 'border-amber-500/20 opacity-80',
                  ch.status === 'disconnected' && 'opacity-50'
                )}
              >
                {/* Channel header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-lg"
                      style={{ backgroundColor: ch.color + '99' }}
                    >
                      {ch.logo}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white font-body">{ch.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {ch.status === 'active' && <><CheckCircle2 size={11} className="text-emerald-400" /><span className="text-[10px] text-emerald-400">Connected</span></>}
                        {ch.status === 'paused' && <><AlertTriangle size={11} className="text-amber-400" /><span className="text-[10px] text-amber-400">Paused</span></>}
                        {ch.status === 'error' && <><XCircle size={11} className="text-red-400" /><span className="text-[10px] text-red-400">Error</span></>}
                        {ch.status === 'disconnected' && <><Unplug size={11} className="text-steel" /><span className="text-[10px] text-steel">Not Connected</span></>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {ch.connected && (
                      <button
                        onClick={() => handleSync(ch.id)}
                        className="p-1.5 rounded-lg hover:bg-white/[0.06] text-steel hover:text-silver transition-all"
                        title="Sync now"
                      >
                        <RefreshCw size={14} className={syncingChannel === ch.id ? 'animate-spin text-teal' : ''} />
                      </button>
                    )}
                    <Button
                      variant={ch.connected ? 'outline-dark' : 'default'}
                      size="sm"
                      className="text-[11px]"
                      onClick={() => toast.success(ch.connected ? `Opening ${ch.name} settings…` : `Connecting ${ch.name}…`)}
                    >
                      {ch.connected ? 'Manage' : 'Connect'}
                    </Button>
                  </div>
                </div>

                {/* Channel stats */}
                {ch.connected && stats && (
                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/[0.06]">
                    <div>
                      <div className="text-lg font-bold text-white">{stats.monthBookings}</div>
                      <div className="text-[10px] text-steel">This Month</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white">£{stats.monthRevenue.toLocaleString()}</div>
                      <div className="text-[10px] text-steel">Revenue</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white">£{stats.avgRate.toFixed(0)}</div>
                      <div className="text-[10px] text-steel">Avg Rate</div>
                    </div>
                  </div>
                )}

                {/* Commission & last sync */}
                {ch.connected && (
                  <div className="flex items-center justify-between text-[10px] text-steel pt-1 border-t border-white/[0.04]">
                    <span>Commission: {ch.commissionRate}%</span>
                    {ch.lastSync && (
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        Synced {format(ch.lastSync, 'HH:mm')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB: Performance ─────────────────────────────────────── */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Revenue by Channel — bar chart visual */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 size={18} className="text-teal" />
                Revenue by Channel — This Month
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {channelPerformance
                .filter(c => c.stats.monthRevenue > 0)
                .sort((a, b) => b.stats.monthRevenue - a.stats.monthRevenue)
                .map(ch => {
                  const pct = totalMonthRevenue > 0 ? (ch.stats.monthRevenue / totalMonthRevenue) * 100 : 0;
                  const netRevenue = ch.stats.monthRevenue * (1 - ch.commissionRate / 100);
                  return (
                    <div key={ch.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: ch.color }}
                          />
                          <span className="text-white font-medium font-body">{ch.name}</span>
                          <span className="text-steel text-xs">({ch.stats.monthBookings} bookings)</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-steel">Gross: £{ch.stats.monthRevenue.toLocaleString()}</span>
                          <span className="text-emerald-400 font-medium">Net: £{netRevenue.toFixed(0)}</span>
                          <span className="text-silver font-semibold">{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-3 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: ch.color }}
                        />
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>

          {/* Commission Leakage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Percent size={18} className="text-amber-400" />
                Commission Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="glass-panel rounded-xl p-5 text-center">
                  <div className="text-2xl font-bold text-white font-display">£{totalMonthRevenue.toLocaleString()}</div>
                  <div className="text-xs text-steel">Gross Revenue</div>
                </div>
                <div className="glass-panel rounded-xl p-5 text-center">
                  <div className="text-2xl font-bold text-amber-400 font-display">-£{estimatedCommission.toFixed(0)}</div>
                  <div className="text-xs text-steel">Est. Commission</div>
                </div>
                <div className="glass-panel rounded-xl p-5 text-center">
                  <div className="text-2xl font-bold text-emerald-400 font-display">£{(totalMonthRevenue - estimatedCommission).toFixed(0)}</div>
                  <div className="text-xs text-steel">Net Revenue</div>
                </div>
              </div>

              <div className="space-y-2">
                {channelPerformance
                  .filter(c => c.stats.monthRevenue > 0 && c.commissionRate > 0)
                  .sort((a, b) => (b.stats.monthRevenue * b.commissionRate) - (a.stats.monthRevenue * a.commissionRate))
                  .map(ch => {
                    const comm = ch.stats.monthRevenue * (ch.commissionRate / 100);
                    return (
                      <div key={ch.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: ch.color }} />
                          <span className="text-sm text-white font-body">{ch.name}</span>
                          <span className="text-[10px] text-steel">({ch.commissionRate}%)</span>
                        </div>
                        <span className="text-sm text-amber-400 font-medium">-£{comm.toFixed(0)}</span>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Source Mix Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity size={18} className="text-teal" />
                Booking Volume by Source
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-body">
                  <thead>
                    <tr className="border-b border-white/[0.08]">
                      <th className="text-left py-2 text-steel font-medium">Source</th>
                      <th className="text-right py-2 text-steel font-medium">Total</th>
                      <th className="text-right py-2 text-steel font-medium">Revenue</th>
                      <th className="text-right py-2 text-steel font-medium">Avg Rate</th>
                      <th className="text-right py-2 text-steel font-medium">Avg Stay</th>
                      <th className="text-right py-2 text-steel font-medium">Commission</th>
                      <th className="text-right py-2 text-steel font-medium">Net Rev</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channelPerformance
                      .filter(c => c.stats.totalBookings > 0)
                      .sort((a, b) => b.stats.totalRevenue - a.stats.totalRevenue)
                      .map(ch => {
                        const comm = ch.stats.totalRevenue * (ch.commissionRate / 100);
                        return (
                          <tr key={ch.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                            <td className="py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: ch.color }} />
                                <span className="text-white">{ch.name}</span>
                              </div>
                            </td>
                            <td className="text-right text-white">{ch.stats.totalBookings}</td>
                            <td className="text-right text-white">£{ch.stats.totalRevenue.toLocaleString()}</td>
                            <td className="text-right text-silver">£{ch.stats.avgRate.toFixed(0)}</td>
                            <td className="text-right text-silver">{ch.stats.avgStay.toFixed(1)}N</td>
                            <td className="text-right text-amber-400">-£{comm.toFixed(0)}</td>
                            <td className="text-right text-emerald-400 font-medium">£{(ch.stats.totalRevenue - comm).toFixed(0)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB: Rate Parity ─────────────────────────────────────── */}
      {activeTab === 'parity' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-xl p-5 flex items-center gap-3">
            {parityIssues === 0 ? (
              <>
                <ShieldCheck size={20} className="text-emerald-400" />
                <div>
                  <p className="text-sm font-semibold text-white">All rates are in parity</p>
                  <p className="text-xs text-steel">Your rates match across all connected channels (within 2% tolerance)</p>
                </div>
              </>
            ) : (
              <>
                <ShieldAlert size={20} className="text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-white">{parityIssues} parity issue{parityIssues !== 1 ? 's' : ''} detected</p>
                  <p className="text-xs text-steel">Some OTA rates deviate more than 2% from your direct rate</p>
                </div>
              </>
            )}
          </div>

          {parityData.map(rt => (
            <Card key={rt.roomType.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {rt.roomType.name}
                    <span className="text-xs text-steel font-normal">— Your rate: £{rt.effectiveRate}/night</span>
                  </CardTitle>
                  {rt.allParity ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                      <CheckCircle2 size={10} className="mr-1" /> Parity
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
                      <AlertTriangle size={10} className="mr-1" /> Issues
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {rt.channels.map(ch => (
                    <div
                      key={ch.channel.id}
                      className={cn(
                        'flex items-center justify-between py-2 px-3 rounded-lg border',
                        ch.isParity
                          ? 'bg-white/[0.01] border-white/[0.04]'
                          : ch.diff > 0
                          ? 'bg-amber-500/[0.03] border-amber-500/10'
                          : 'bg-red-500/[0.03] border-red-500/10'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white"
                          style={{ backgroundColor: ch.channel.color + '99' }}
                        >
                          {ch.channel.logo}
                        </div>
                        <span className="text-sm text-white font-body">{ch.channel.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-white font-medium">£{ch.rate}</span>
                        {ch.isParity ? (
                          <span className="text-emerald-400 text-xs flex items-center gap-0.5">
                            <CheckCircle2 size={11} /> Match
                          </span>
                        ) : (
                          <span className={cn(
                            'text-xs font-medium flex items-center gap-0.5',
                            ch.diff > 0 ? 'text-amber-400' : 'text-red-400'
                          )}>
                            {ch.diff > 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                            {ch.diff > 0 ? '+' : ''}£{ch.diff} ({ch.diffPercent > 0 ? '+' : ''}{ch.diffPercent.toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
