import { useMemo } from 'react';
import { useBookings } from '@/hooks/useBookings';
import { useRooms } from '@/hooks/useRooms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  Brain, TrendingUp, TrendingDown, CheckCircle2,
  Calendar, Users, Zap, Lightbulb, ArrowUpRight, ArrowDownRight,
  BedDouble, DollarSign, BarChart3, Target, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, differenceInDays } from 'date-fns';

// ── Simulated AI forecast data ────────────────────────────────────
function generateForecast(_totalRooms: number, currentOccupancy: number) {
  const today = new Date();
  const days: { date: Date; predicted: number; confidence: number }[] = [];
  let trend = currentOccupancy;

  for (let i = 0; i < 30; i++) {
    const dayOfWeek = addDays(today, i).getDay();
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    // Simulate seasonality + random variation
    const seasonalFactor = isWeekend ? 1.15 : 0.92;
    const noise = (Math.sin(i * 0.7) * 0.08 + Math.cos(i * 0.3) * 0.05);
    trend = Math.max(20, Math.min(98, trend * seasonalFactor + noise * 100));
    const confidence = Math.max(60, 95 - i * 0.8);
    days.push({ date: addDays(today, i), predicted: Math.round(trend), confidence: Math.round(confidence) });
  }
  return days;
}

function generateRevenueForecast(avgRate: number, occupancyForecast: { predicted: number }[], roomCount: number) {
  return occupancyForecast.map((d, i) => ({
    day: i,
    revenue: Math.round((d.predicted / 100) * roomCount * avgRate * (0.95 + Math.sin(i * 0.5) * 0.1)),
  }));
}

type Suggestion = {
  id: number;
  priority: 'high' | 'medium' | 'low';
  type: 'revenue' | 'operations' | 'guest';
  title: string;
  description: string;
  impact: string;
};

function generateSuggestions(occupancy: number, avgRate: number): Suggestion[] {
  const suggestions: Suggestion[] = [];
  let id = 1;

  if (occupancy < 50) {
    suggestions.push({
      id: id++, priority: 'high', type: 'revenue',
      title: 'Low occupancy detected — consider flash promotion',
      description: `Occupancy is at ${occupancy}%. A 15-20% rate reduction for next 7 days could boost bookings by an estimated 25%.`,
      impact: 'Estimated +£2,400 weekly revenue',
    });
  }
  if (occupancy > 85) {
    suggestions.push({
      id: id++, priority: 'high', type: 'revenue',
      title: 'High demand period — raise rates',
      description: `Occupancy at ${occupancy}% signals strong demand. Increase BAR by 10-15% for the next 5 days.`,
      impact: 'Estimated +£1,800 additional revenue',
    });
  }
  suggestions.push({
    id: id++, priority: 'medium', type: 'operations',
    title: 'Weekend surge expected — staff accordingly',
    description: 'AI predicts 85%+ occupancy this Friday-Sunday. Consider scheduling additional housekeeping and front desk staff.',
    impact: 'Improved guest satisfaction score',
  });
  suggestions.push({
    id: id++, priority: 'medium', type: 'guest',
    title: '3 guests with loyalty history checking in tomorrow',
    description: 'Returning guests detected. Prepare personalized welcome notes and room upgrades where available.',
    impact: 'Increased repeat booking probability',
  });
  if (avgRate < 180) {
    suggestions.push({
      id: id++, priority: 'low', type: 'revenue',
      title: 'ADR below market average',
      description: `Average daily rate £${avgRate.toFixed(0)} is below the market average of £195. Review rate parity across OTA channels.`,
      impact: 'Rate optimization opportunity',
    });
  }
  suggestions.push({
    id: id++, priority: 'low', type: 'operations',
    title: 'Midweek dip forecast — schedule deep cleans',
    description: 'Occupancy drops below 60% on Wednesday. Ideal window for deep-cleaning 4-6 rooms and minor maintenance.',
    impact: 'Proactive maintenance scheduling',
  });
  return suggestions;
}

const priorityColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  high: { bg: 'bg-red-500/5', border: 'border-red-500/15', text: 'text-red-400', dot: 'bg-red-400' },
  medium: { bg: 'bg-amber-500/5', border: 'border-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400' },
  low: { bg: 'bg-blue-500/5', border: 'border-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400' },
};

const typeIcons: Record<string, React.ElementType> = {
  revenue: DollarSign,
  operations: Zap,
  guest: Users,
};

export function AIInsightsPage() {
  const { bookings } = useBookings();
  const { rooms } = useRooms();

  const totalRooms = rooms.filter(r => r.status !== 'maintenance' && r.status !== 'blocked').length;
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length;
  const currentOccupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const avgRate = useMemo(() => {
    const rates = bookings.filter((b) => b.nightly_rate > 0).map((b) => b.nightly_rate);
    return rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 175;
  }, [bookings]);

  const forecast = useMemo(() => generateForecast(totalRooms, currentOccupancy), [totalRooms, currentOccupancy]);
  const revForecast = useMemo(() => generateRevenueForecast(avgRate, forecast, totalRooms), [avgRate, forecast, totalRooms]);
  const suggestions = useMemo(() => generateSuggestions(currentOccupancy, avgRate), [currentOccupancy, avgRate]);

  const next7avg = Math.round(forecast.slice(0, 7).reduce((a, b) => a + b.predicted, 0) / 7);
  const next14avg = Math.round(forecast.slice(0, 14).reduce((a, b) => a + b.predicted, 0) / 14);
  const next7rev = revForecast.slice(0, 7).reduce((a, b) => a + b.revenue, 0);
  const peakDay = forecast.length > 0 ? forecast.reduce((max, d) => d.predicted > max.predicted ? d : max, forecast[0]!) : null;
  const lowestDay = forecast.length > 0 ? forecast.reduce((min, d) => d.predicted < min.predicted ? d : min, forecast[0]!) : null;

  const forecastMax = Math.max(...forecast.map((d) => d.predicted));

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500/20 to-teal/20 border border-purple-500/20 flex items-center justify-center">
          <Brain size={20} className="text-purple-400" />
        </div>
        <div>
          <h1 className="text-3xl font-display text-white tracking-tight">AI Insights</h1>
          <p className="text-sm text-steel font-body">Powered by predictive analytics · Updated just now</p>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Current Occupancy', value: `${currentOccupancy}%`, sub: `${occupiedRooms}/${totalRooms} rooms`, trend: currentOccupancy > 70 ? 'up' : 'down', color: 'text-teal' },
          { label: '7-Day Forecast Avg', value: `${next7avg}%`, sub: 'Predicted occupancy', trend: next7avg > currentOccupancy ? 'up' : 'down', color: 'text-purple-400' },
          { label: '7-Day Rev Forecast', value: `£${next7rev.toLocaleString()}`, sub: 'Predicted revenue', trend: 'up', color: 'text-gold' },
          { label: 'ADR', value: `£${avgRate.toFixed(0)}`, sub: 'Average daily rate', trend: avgRate > 180 ? 'up' : 'down', color: 'text-emerald-400' },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-panel rounded-xl p-5">
            <p className="text-[11px] text-steel font-body mb-1">{kpi.label}</p>
            <div className="flex items-center gap-2">
              <span className={cn('text-2xl font-display', kpi.color)}>{kpi.value}</span>
              {kpi.trend === 'up' ? (
                <ArrowUpRight size={14} className="text-emerald-400" />
              ) : (
                <ArrowDownRight size={14} className="text-red-400" />
              )}
            </div>
            <p className="text-[10px] text-steel/60 font-body mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Occupancy Forecast Chart */}
        <Card variant="dark" className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 size={16} className="text-teal" />
                30-Day Occupancy Forecast
              </CardTitle>
              <div className="flex items-center gap-3 text-[10px] text-steel font-body">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal inline-block" /> Forecast</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gold inline-block" /> Peak</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Simple bar chart visualization */}
            <div className="flex items-end gap-[3px] h-40 mt-2">
              {forecast.map((d, i) => {
                const height = (d.predicted / forecastMax) * 100;
                const isPeak = d === peakDay;
                const isLowest = d === lowestDay;
                const isWeekend = d.date.getDay() === 5 || d.date.getDay() === 6;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-charcoal border border-white/10 rounded px-2 py-1 text-[9px] text-white font-body whitespace-nowrap z-10 pointer-events-none">
                      {format(d.date, 'MMM d')}: {d.predicted}% · {d.confidence}% conf
                    </div>
                    <div
                      className={cn(
                        'w-full rounded-t-sm transition-all duration-200',
                        isPeak ? 'bg-gold' : isLowest ? 'bg-red-400/60' : isWeekend ? 'bg-teal/70' : 'bg-teal/40',
                        'group-hover:opacity-80'
                      )}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-[9px] text-steel/50 font-body">
              <span>Today</span>
              <span>+7d</span>
              <span>+14d</span>
              <span>+21d</span>
              <span>+30d</span>
            </div>

            {/* Key insights below chart */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/[0.06]">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-gold" />
                <div>
                  <p className="text-xs text-white font-body font-medium">Peak: {peakDay?.predicted ?? 0}%</p>
                  <p className="text-[10px] text-steel font-body">{peakDay ? format(peakDay.date, 'EEE, MMM d') : '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown size={14} className="text-red-400" />
                <div>
                  <p className="text-xs text-white font-body font-medium">Low: {lowestDay?.predicted ?? 0}%</p>
                  <p className="text-[10px] text-steel font-body">{lowestDay ? format(lowestDay.date, 'EEE, MMM d') : '—'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Predictions Summary */}
        <div className="space-y-4">
          <Card variant="dark">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Target size={14} className="text-purple-400" />
                Forecast Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-steel font-body">7-day avg</span>
                <span className={cn('text-sm font-body font-semibold', next7avg > 70 ? 'text-emerald-400' : 'text-amber-400')}>{next7avg}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-steel font-body">14-day avg</span>
                <span className={cn('text-sm font-body font-semibold', next14avg > 70 ? 'text-emerald-400' : 'text-amber-400')}>{next14avg}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-steel font-body">Trend</span>
                <span className={cn('text-sm font-body font-semibold flex items-center gap-1',
                  next7avg > currentOccupancy ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {next7avg > currentOccupancy ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {next7avg > currentOccupancy ? 'Upward' : 'Downward'}
                </span>
              </div>
              <div className="pt-2 border-t border-white/[0.06]">
                <p className="text-[11px] text-steel/60 font-body">
                  Confidence: {forecast[0]?.confidence ?? 0}% (today) → {forecast[29]?.confidence ?? 0}% (30d)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card variant="dark">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Calendar size={14} className="text-teal" />
                Booking Patterns
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Avg lead time', value: '4.2 days', icon: Clock },
                { label: 'Direct bookings', value: `${Math.round(bookings.filter(b => b.source === 'direct').length / Math.max(bookings.length, 1) * 100)}%`, icon: Target },
                { label: 'Avg stay length', value: `${(bookings.reduce((a, b) => a + differenceInDays(new Date(b.check_out), new Date(b.check_in)), 0) / Math.max(bookings.length, 1)).toFixed(1)} nights`, icon: BedDouble },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1">
                  <span className="text-xs text-steel font-body flex items-center gap-1.5">
                    <item.icon size={12} className="text-steel/60" />
                    {item.label}
                  </span>
                  <span className="text-xs text-white font-body font-medium">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* AI Suggestions */}
        <div className="lg:col-span-3">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={16} className="text-gold" />
            <h2 className="text-lg font-display text-white">AI Suggestions</h2>
            <span className="text-xs text-steel font-body ml-2">{suggestions.length} actionable insights</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((s) => {
              const p = priorityColors[s.priority]!;
              const TypeIcon = typeIcons[s.type] ?? Zap;
              return (
                <div
                  key={s.id}
                  className={cn(
                    'rounded-xl p-4 border transition-all duration-200 hover:scale-[1.01]',
                    p.bg, p.border
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', p.bg, 'border', p.border)}>
                      <TypeIcon size={14} className={p.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('w-1.5 h-1.5 rounded-full', p.dot)} />
                        <span className={cn('text-[10px] font-body font-semibold uppercase tracking-wider', p.text)}>
                          {s.priority} priority
                        </span>
                      </div>
                      <h3 className="text-sm font-body font-semibold text-white mb-1">{s.title}</h3>
                      <p className="text-xs text-steel font-body leading-relaxed">{s.description}</p>
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-400/80 font-body">
                        <CheckCircle2 size={10} />
                        {s.impact}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
