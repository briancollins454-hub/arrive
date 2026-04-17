import { useState, useMemo } from 'react';
import { useBookings } from '@/hooks/useBookings';
import { useRooms } from '@/hooks/useRooms';
import { useProperty } from '@/hooks/useProperty';
import { useAllFolios } from '@/hooks/useFolios';
import { getSourceLabel } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight,
  PieChart, BarChart3, Wallet, Receipt, BadgePoundSterling, Target,
  BedDouble, Download,
} from 'lucide-react';
import type { FolioEntry } from '@/types';
import {
  format, subDays, subMonths, startOfMonth, endOfMonth,
  isWithinInterval, differenceInDays, getDaysInMonth, parseISO,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { exportCSV, exportXeroCSV, exportQuickBooksCSV, type AccountingInvoiceRow } from '@/lib/exportUtils';
import { DashboardDatePicker, getPresetRange } from '@/components/shared/DashboardDatePicker';
import type { DateRange } from '@/components/shared/DashboardDatePicker';

function calcChange(current: number, previous: number): { pct: number; positive: boolean } {
  if (previous === 0) return { pct: current > 0 ? 100 : 0, positive: current >= 0 };
  const pct = ((current - previous) / previous) * 100;
  return { pct, positive: pct >= 0 };
}

export function FinancialDashboardPage() {
  const { bookings } = useBookings();
  const { rooms, roomTypes } = useRooms();
  const { property } = useProperty();
  const { allEntries: allFolios } = useAllFolios((bookings ?? []).map(b => b.id));
  const [dateRange, setDateRange] = useState<DateRange>(getPresetRange('month'));

  const handleDateChange = (range: DateRange) => {
    setDateRange(range);
  };

  const allBookings = bookings ?? [];
  const allRooms = rooms ?? [];
  const allRoomTypes = roomTypes ?? [];
  const allEntries: FolioEntry[] = allFolios;

  const start = dateRange.start;
  const end = dateRange.end;
  const periodLabel = dateRange.label;
  const rangeDays = differenceInDays(end, start) + 1;
  const prevEnd = subDays(start, 1);
  const prevStart = subDays(start, rangeDays);
  const totalSellableRooms = allRooms.filter(r => r.status !== 'maintenance' && r.status !== 'blocked').length;
  const daysInPeriod = Math.max(1, differenceInDays(end, start) + 1);

  // ── Filter bookings/entries by period ──────────────────────────
  const periodBookings = useMemo(() =>
    allBookings.filter(b => {
      if (b.status === 'cancelled' || b.status === 'no_show') return false;
      const ci = parseISO(b.check_in);
      const co = parseISO(b.check_out);
      // Booking overlaps the period if check-in < end AND check-out > start
      return ci <= end && co >= start;
    }), [allBookings, start, end]);

  const prevBookings = useMemo(() =>
    allBookings.filter(b => {
      if (b.status === 'cancelled' || b.status === 'no_show') return false;
      const ci = parseISO(b.check_in);
      const co = parseISO(b.check_out);
      return ci <= prevEnd && co >= prevStart;
    }), [allBookings, prevStart, prevEnd]);

  const periodCharges = useMemo(() =>
    allEntries.filter(e => {
      if (e.is_voided) return false;
      const d = parseISO(e.posted_at);
      return e.type === 'charge' && isWithinInterval(d, { start, end });
    }), [allEntries, start, end]);

  const periodPayments = useMemo(() =>
    allEntries.filter(e => {
      if (e.is_voided) return false;
      const d = parseISO(e.posted_at);
      return (e.type === 'payment' || e.type === 'refund') && isWithinInterval(d, { start, end });
    }), [allEntries, start, end]);

  const prevCharges = useMemo(() =>
    allEntries.filter(e => {
      if (e.is_voided) return false;
      const d = parseISO(e.posted_at);
      return e.type === 'charge' && isWithinInterval(d, { start: prevStart, end: prevEnd });
    }), [allEntries, prevStart, prevEnd]);

  // ── KPI computations ──────────────────────────────────────────
  const totalRevenue = periodCharges.reduce((s, e) => s + e.amount, 0);
  const prevRevenue = prevCharges.reduce((s, e) => s + e.amount, 0);
  const roomRevenue = periodCharges.filter(e => e.category === 'room').reduce((s, e) => s + e.amount, 0);
  const ancillaryRevenue = totalRevenue - roomRevenue;

  // Occupancy: room-nights sold / room-nights available
  const roomNightsSold = periodBookings.reduce((s, b) => {
    const bIn = parseISO(b.check_in);
    const bOut = parseISO(b.check_out);
    const overlapStart = bIn > start ? bIn : start;
    const overlapEnd = bOut < end ? bOut : end;
    return s + Math.max(0, differenceInDays(overlapEnd, overlapStart));
  }, 0);
  const roomNightsAvailable = totalSellableRooms * daysInPeriod;
  const occupancyPct = roomNightsAvailable > 0 ? (roomNightsSold / roomNightsAvailable) * 100 : 0;
  const prevRoomNightsSold = prevBookings.reduce((s, b) => {
    const bIn = parseISO(b.check_in);
    const bOut = parseISO(b.check_out);
    const overlapStart = bIn > prevStart ? bIn : prevStart;
    const overlapEnd = bOut < prevEnd ? bOut : prevEnd;
    return s + Math.max(0, differenceInDays(overlapEnd, overlapStart));
  }, 0);
  const prevDaysInPeriod = Math.max(1, differenceInDays(prevEnd, prevStart) + 1);
  const prevRoomNightsAvailable = totalSellableRooms * prevDaysInPeriod;
  const prevOccPct = prevRoomNightsAvailable > 0 ? (prevRoomNightsSold / prevRoomNightsAvailable) * 100 : 0;

  const adr = roomNightsSold > 0 ? roomRevenue / roomNightsSold : 0;
  const prevAdr = prevRoomNightsSold > 0
    ? prevCharges.filter(e => e.category === 'room').reduce((s, e) => s + e.amount, 0) / prevRoomNightsSold
    : 0;
  const revpar = totalSellableRooms > 0 ? roomRevenue / (totalSellableRooms * daysInPeriod) : 0;
  const prevRevpar = totalSellableRooms > 0
    ? prevCharges.filter(e => e.category === 'room').reduce((s, e) => s + e.amount, 0) / (totalSellableRooms * Math.max(1, differenceInDays(prevEnd, prevStart) + 1))
    : 0;
  const goppar = totalSellableRooms > 0 ? totalRevenue / (totalSellableRooms * daysInPeriod) : 0;

  const revChange = calcChange(totalRevenue, prevRevenue);
  const occChange = calcChange(occupancyPct, prevOccPct);
  const adrChange = calcChange(adr, prevAdr);
  const revparChange = calcChange(revpar, prevRevpar);

  // ── Revenue breakdown by category ─────────────────────────────
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of periodCharges) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    return [...map.entries()]
      .map(([cat, amount]) => ({ category: cat, amount, pct: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [periodCharges, totalRevenue]);

  const categoryColors: Record<string, string> = {
    room: '#0ea5a0', food: '#f59e0b', beverage: '#8b5cf6', spa: '#ec4899',
    laundry: '#6366f1', parking: '#64748b', phone: '#94a3b8', tax: '#475569',
    discount: '#ef4444', other: '#71717a', damage: '#dc2626', city_ledger: '#0284c7',
  };

  // ── Revenue by room type (from folio charges) ─────────────────
  const roomTypeRevenue = useMemo(() => {
    return allRoomTypes.map(rt => {
      const rtBookings = periodBookings.filter(b => b.room_type_id === rt.id);
      const rtBookingIds = new Set(rtBookings.map(b => b.id));
      // Sum folio charges for this room type's bookings
      const rev = periodCharges.filter(e => rtBookingIds.has(e.booking_id)).reduce((s, e) => s + e.amount, 0);
      const nights = rtBookings.reduce((s, b) => s + Math.max(1, differenceInDays(parseISO(b.check_out), parseISO(b.check_in))), 0);
      const roomCount = allRooms.filter(r => r.room_type_id === rt.id).length;
      return {
        name: rt.name,
        revenue: rev,
        bookings: rtBookings.length,
        nights,
        adr: nights > 0 ? rev / nights : 0,
        roomCount,
        revpar: roomCount > 0 ? rev / (roomCount * daysInPeriod) : 0,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [allRoomTypes, periodBookings, periodCharges, allRooms, daysInPeriod]);

  // ── Source revenue (from folio charges) ────────────────────────
  const sourceRevenue = useMemo(() => {
    const map = new Map<string, { bookings: number; revenue: number }>();
    for (const b of periodBookings) {
      const src = b.source;
      const prev = map.get(src) ?? { bookings: 0, revenue: 0 };
      // Sum folio charges for this booking
      const bCharges = periodCharges.filter(e => e.booking_id === b.id).reduce((s, e) => s + e.amount, 0);
      map.set(src, { bookings: prev.bookings + 1, revenue: prev.revenue + bCharges });
    }
    return [...map.entries()]
      .map(([source, data]) => ({ source, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [periodBookings, periodCharges]);

  // ── Monthly trend (last 6 months) — from folio charges ────────
  const monthlyTrend = useMemo(() => {
    const months: { label: string; revenue: number; occupancy: number; adr: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(new Date(), i);
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      const dim = getDaysInMonth(m);
      const mBookings = allBookings.filter(b => {
        if (b.status === 'cancelled' || b.status === 'no_show') return false;
        const bIn = parseISO(b.check_in);
        const bOut = parseISO(b.check_out);
        return bIn < mEnd && bOut > mStart;
      });
      // Use folio charges posted in this month
      const mCharges = allEntries.filter(e =>
        e.type === 'charge' && !e.is_voided &&
        isWithinInterval(parseISO(e.posted_at), { start: mStart, end: mEnd })
      );
      const mRev = mCharges.reduce((s, e) => s + e.amount, 0);
      const mRoomRev = mCharges.filter(e => e.category === 'room').reduce((s, e) => s + e.amount, 0);
      const mNights = mBookings.reduce((s, b) => {
        const bIn = parseISO(b.check_in);
        const bOut = parseISO(b.check_out);
        const os = bIn > mStart ? bIn : mStart;
        const oe = bOut < mEnd ? bOut : mEnd;
        return s + Math.max(0, differenceInDays(oe, os));
      }, 0);
      const mAvail = totalSellableRooms * dim;
      months.push({
        label: format(m, 'MMM'),
        revenue: mRev,
        occupancy: mAvail > 0 ? (mNights / mAvail) * 100 : 0,
        adr: mNights > 0 ? mRoomRev / mNights : 0,
      });
    }
    return months;
  }, [allBookings, allEntries, totalSellableRooms]);

  const maxTrendRev = Math.max(...monthlyTrend.map(m => m.revenue), 1);

  // ── P&L summary ───────────────────────────────────────────────
  const totalRefunds = periodPayments.filter(e => e.type === 'refund').reduce((s, e) => s + e.amount, 0);
  const discounts = periodCharges.filter(e => e.category === 'discount').reduce((s, e) => s + e.amount, 0);
  const taxes = periodCharges.filter(e => e.category === 'tax').reduce((s, e) => s + e.amount, 0);
  // totalRevenue already includes negative discount amounts, so it IS the net figure.
  // Gross = totalRevenue minus the (negative) discounts = totalRevenue - discounts
  const grossRevenue = totalRevenue - discounts; // discounts are negative, so this adds back
  const netRevenue = totalRevenue; // discounts already subtracted
  const revenueAfterTax = netRevenue - taxes;

  // ── Export ─────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const totalPaid = periodPayments.filter(e => e.type === 'payment').reduce((s, e) => s + Math.abs(e.amount), 0);
    const fmtCur = (v: number) => `£${v.toFixed(2)}`;
    const fmtPct = (v: number) => `${v.toFixed(1)}%`;
    const fmtChg = (c: { pct: number; positive: boolean }) => `${c.positive ? '+' : ''}${c.pct.toFixed(1)}%`;

    const rows = [
      // Period context
      { Metric: 'Report', Value: `Financial Dashboard — ${periodLabel}` },
      { Metric: 'Period', Value: `${format(start, 'dd/MM/yyyy')} – ${format(end, 'dd/MM/yyyy')} (${daysInPeriod} day${daysInPeriod !== 1 ? 's' : ''})` },
      { Metric: '', Value: '' },

      // KPIs — current vs previous
      { Metric: 'Total Revenue', Value: fmtCur(totalRevenue) },
      { Metric: '  vs Previous Period', Value: fmtChg(revChange) },
      { Metric: 'Room Revenue', Value: fmtCur(roomRevenue) },
      { Metric: 'Ancillary Revenue', Value: fmtCur(ancillaryRevenue) },
      { Metric: 'Occupancy', Value: fmtPct(occupancyPct) },
      { Metric: '  vs Previous Period', Value: fmtChg(occChange) },
      { Metric: 'ADR', Value: fmtCur(adr) },
      { Metric: '  vs Previous Period', Value: fmtChg(adrChange) },
      { Metric: 'RevPAR', Value: fmtCur(revpar) },
      { Metric: '  vs Previous Period', Value: fmtChg(revparChange) },
      { Metric: 'GOPPAR', Value: fmtCur(goppar) },
      { Metric: 'Room Nights Sold', Value: String(roomNightsSold) },
      { Metric: 'Room Nights Available', Value: String(roomNightsAvailable) },
      { Metric: '', Value: '' },

      // P&L
      { Metric: '— P&L Summary —', Value: '' },
      { Metric: 'Gross Revenue (before discounts)', Value: fmtCur(grossRevenue) },
      { Metric: 'Discounts', Value: fmtCur(discounts) },
      { Metric: 'Net Revenue', Value: fmtCur(netRevenue) },
      { Metric: 'Taxes Collected', Value: fmtCur(taxes) },
      { Metric: 'Revenue After Tax', Value: fmtCur(revenueAfterTax) },
      { Metric: 'Total Payments Received', Value: fmtCur(totalPaid) },
      { Metric: 'Total Refunds', Value: fmtCur(totalRefunds) },
      { Metric: '', Value: '' },

      // Revenue by category
      { Metric: '— Revenue by Category —', Value: '' },
      ...categoryBreakdown.map(c => ({ Metric: `  ${c.category}`, Value: `${fmtCur(c.amount)} (${c.pct.toFixed(1)}%)` })),
      { Metric: '', Value: '' },

      // Revenue by room type
      { Metric: '— Revenue by Room Type —', Value: '' },
      ...roomTypeRevenue.map(r => ({
        Metric: `  ${r.name}`,
        Value: `${fmtCur(r.revenue)} | ${r.bookings} booking${r.bookings !== 1 ? 's' : ''} | ${r.nights} night${r.nights !== 1 ? 's' : ''} | ADR ${fmtCur(r.adr)} | RevPAR ${fmtCur(r.revpar)}`,
      })),
      { Metric: '', Value: '' },

      // Revenue by source
      { Metric: '— Revenue by Source —', Value: '' },
      ...sourceRevenue.map(s => ({
        Metric: `  ${s.source}`,
        Value: `${fmtCur(s.revenue)} | ${s.bookings} booking${s.bookings !== 1 ? 's' : ''}`,
      })),
      { Metric: '', Value: '' },

      // Monthly trend
      { Metric: '— 6-Month Trend —', Value: '' },
      ...monthlyTrend.map(m => ({
        Metric: `  ${m.label}`,
        Value: `Rev ${fmtCur(m.revenue)} | Occ ${fmtPct(m.occupancy)} | ADR ${fmtCur(m.adr)}`,
      })),
    ];
    exportCSV(rows, `financial-dashboard-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  // ── Accounting exports (one invoice row per checked-out booking) ─
  const buildAccountingRows = (): AccountingInvoiceRow[] => {
    return periodBookings
      .filter(b => b.status === 'checked_out' || b.status === 'checked_in')
      .map(b => {
        const nights = Math.max(1, differenceInDays(parseISO(b.check_out), parseISO(b.check_in)));
        const guestName = b.guest
          ? `${b.guest.first_name} ${b.guest.last_name}`.trim()
          : 'Guest';
        return {
          reference: b.confirmation_code,
          invoice_date: format(parseISO(b.check_out), 'yyyy-MM-dd'),
          due_date: format(parseISO(b.check_out), 'yyyy-MM-dd'),
          contact_name: guestName || 'Guest',
          contact_email: b.guest?.email ?? '',
          description: `${b.room_type?.name ?? 'Accommodation'} — ${nights} night${nights !== 1 ? 's' : ''} (${format(parseISO(b.check_in), 'dd MMM')} – ${format(parseISO(b.check_out), 'dd MMM yyyy')})`,
          quantity: nights,
          unit_amount: b.nightly_rate,
          tax_rate: 0.20,
          account_code: '200',
          currency: 'GBP',
        };
      });
  };
  const handleExportXero = () => {
    const rows = buildAccountingRows();
    if (rows.length === 0) return;
    exportXeroCSV(rows, `xero-invoices-${format(new Date(), 'yyyy-MM-dd')}`);
  };
  const handleExportQuickBooks = () => {
    const rows = buildAccountingRows();
    if (rows.length === 0) return;
    exportQuickBooksCSV(rows, `quickbooks-invoices-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Financial Dashboard</h1>
          <p className="text-sm text-steel font-body tracking-wide mt-1">
            {property?.name ?? 'Property'} — {periodLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <DashboardDatePicker
            value={dateRange}
            onChange={handleDateChange}
            presets={['week', 'month', 'quarter', 'year']}
          />
          <Button variant="outline-dark" size="sm" onClick={handleExportCSV}>
            <Download size={14} className="mr-1.5" /> Export
          </Button>
          <Button variant="outline-dark" size="sm" onClick={handleExportXero} title="Export invoices in Xero CSV format">
            <Download size={14} className="mr-1.5" /> Xero
          </Button>
          <Button variant="outline-dark" size="sm" onClick={handleExportQuickBooks} title="Export invoices in QuickBooks CSV format">
            <Download size={14} className="mr-1.5" /> QuickBooks
          </Button>
        </div>
      </div>

      {/* ── Hero KPI Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `£${(totalRevenue / 1000).toFixed(1)}k`, change: revChange, icon: DollarSign, accent: 'from-gold/20 to-gold/5', iconColor: 'text-gold' },
          { label: 'Occupancy', value: `${occupancyPct.toFixed(1)}%`, change: occChange, icon: BedDouble, accent: 'from-teal/20 to-teal/5', iconColor: 'text-teal' },
          { label: 'ADR', value: `£${adr.toFixed(0)}`, change: adrChange, icon: BadgePoundSterling, accent: 'from-blue-500/20 to-blue-500/5', iconColor: 'text-blue-400' },
          { label: 'RevPAR', value: `£${revpar.toFixed(0)}`, change: revparChange, icon: Target, accent: 'from-emerald-500/20 to-emerald-500/5', iconColor: 'text-emerald-400' },
        ].map(kpi => (
          <div key={kpi.label} className={cn('glass-panel rounded-xl p-5 bg-gradient-to-br', kpi.accent)}>
            <div className="flex items-center justify-between mb-3">
              <kpi.icon size={20} className={kpi.iconColor} />
              <div className={cn(
                'flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full',
                kpi.change.positive
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-red-500/10 text-red-400'
              )}>
                {kpi.change.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(kpi.change.pct).toFixed(1)}%
              </div>
            </div>
            <div className="text-2xl font-bold text-white font-display">{kpi.value}</div>
            <div className="text-xs text-silver mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Revenue Trend (left 2/3) ───────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Monthly Revenue Trend */}
          <Card variant="dark">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp size={18} className="text-teal" />
                6-Month Revenue Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthlyTrend.map(m => (
                  <div key={m.label} className="flex items-center gap-3">
                    <span className="text-xs text-silver w-10 text-right font-body">{m.label}</span>
                    <div className="flex-1 h-7 bg-white/[0.03] rounded-lg overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-teal/80 to-teal/40 rounded-lg transition-all duration-700 flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(4, (m.revenue / maxTrendRev) * 100)}%` }}
                      >
                        <span className="text-[10px] font-semibold text-white">
                          £{(m.revenue / 1000).toFixed(1)}k
                        </span>
                      </div>
                    </div>
                    <div className="text-[10px] text-steel w-16 text-right">
                      {m.occupancy.toFixed(0)}% occ
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Revenue by Room Type */}
          <Card variant="dark">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BedDouble size={18} className="text-gold" />
                Room Type Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-body">
                  <thead>
                    <tr className="border-b border-white/[0.08]">
                      <th className="text-left py-2 text-steel font-medium">Room Type</th>
                      <th className="text-right py-2 text-steel font-medium">Revenue</th>
                      <th className="text-right py-2 text-steel font-medium">Bookings</th>
                      <th className="text-right py-2 text-steel font-medium">ADR</th>
                      <th className="text-right py-2 text-steel font-medium">RevPAR</th>
                      <th className="text-right py-2 text-steel font-medium">Nights</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomTypeRevenue.map(rt => (
                      <tr key={rt.name} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="py-2.5 text-white font-medium">{rt.name}</td>
                        <td className="text-right text-white">£{rt.revenue.toLocaleString()}</td>
                        <td className="text-right text-silver">{rt.bookings}</td>
                        <td className="text-right text-silver">£{rt.adr.toFixed(0)}</td>
                        <td className="text-right text-teal font-medium">£{rt.revpar.toFixed(0)}</td>
                        <td className="text-right text-silver">{rt.nights}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Revenue by Source */}
          <Card variant="dark">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PieChart size={18} className="text-purple-400" />
                Revenue by Source
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sourceRevenue.map(s => {
                  const pct = totalRevenue > 0 ? (s.revenue / totalRevenue) * 100 : 0;
                  return (
                    <div key={s.source} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white font-body">{getSourceLabel(s.source)}</span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-steel">{s.bookings} bookings</span>
                          <span className="text-white font-medium">£{s.revenue.toLocaleString()}</span>
                          <span className="text-silver">{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-gold to-gold/50 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right column ───────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Revenue Breakdown by Category */}
          <Card variant="dark">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt size={18} className="text-amber-400" />
                Revenue Mix
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {categoryBreakdown.map(cat => (
                <div key={cat.category} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: categoryColors[cat.category] ?? '#71717a' }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white font-body capitalize">{cat.category}</span>
                      <span className="text-xs text-silver">£{cat.amount.toFixed(0)}</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${cat.pct}%`,
                          backgroundColor: categoryColors[cat.category] ?? '#71717a',
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-steel w-10 text-right">{cat.pct.toFixed(0)}%</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* P&L Summary */}
          <Card variant="dark">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet size={18} className="text-emerald-400" />
                P&amp;L Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm font-body">
              <div className="flex justify-between py-1.5">
                <span className="text-silver">Gross Revenue</span>
                <span className="text-white font-medium">£{grossRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-red-400">
                <span>Discounts</span>
                <span>-£{Math.abs(discounts).toFixed(2)}</span>
              </div>
              <div className="border-t border-white/[0.06] flex justify-between py-1.5">
                <span className="text-silver">Net Revenue</span>
                <span className="text-white font-semibold">£{netRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-steel">
                <span>Taxes Collected</span>
                <span>£{taxes.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-steel">
                <span>Refunds Issued</span>
                <span className="text-red-400">-£{Math.abs(totalRefunds).toFixed(2)}</span>
              </div>
              <div className="border-t border-white/[0.06] flex justify-between py-2">
                <span className="text-white font-semibold">Revenue After Tax</span>
                <span className="text-emerald-400 font-bold text-base">£{revenueAfterTax.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Ancillary Revenue Score */}
          <Card variant="dark">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 size={18} className="text-blue-400" />
                Key Ratios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'GOPPAR', value: `£${goppar.toFixed(2)}`, desc: 'Gross Operating Profit Per Available Room' },
                { label: 'TRevPAR', value: `£${(totalRevenue / Math.max(1, totalSellableRooms * daysInPeriod)).toFixed(2)}`, desc: 'Total Revenue Per Available Room' },
                { label: 'Ancillary %', value: `${totalRevenue > 0 ? ((ancillaryRevenue / totalRevenue) * 100).toFixed(1) : '0'}%`, desc: 'Non-room revenue share' },
                { label: 'Avg Booking Value', value: `£${periodBookings.length > 0 ? (totalRevenue / periodBookings.length).toFixed(0) : '0'}`, desc: 'Revenue per booking' },
              ].map(r => (
                <div key={r.label} className="glass-panel rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-silver font-body">{r.label}</span>
                    <span className="text-base font-bold text-white font-display">{r.value}</span>
                  </div>
                  <div className="text-[10px] text-steel mt-0.5">{r.desc}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
