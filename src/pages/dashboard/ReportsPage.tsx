import { useState, useMemo } from 'react';
import { useBookings } from '@/hooks/useBookings';
import { useRooms } from '@/hooks/useRooms';
import { useProperty } from '@/hooks/useProperty';
import { useAllFolios } from '@/hooks/useFolios';
import { getSourceLabel } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import {
  BarChart3, Printer, Users, BedDouble, DollarSign,
  ArrowUpRight, ArrowDownRight, FileText, Download,
  ChevronRight, PieChart, ClipboardList, CalendarRange, TrendingUp,
} from 'lucide-react';
import type { Booking, FolioEntry } from '@/types';
import {
  format, subDays, subWeeks, subMonths, subYears, startOfDay,
  startOfWeek, startOfMonth, startOfYear, endOfDay, endOfWeek,
  endOfMonth, endOfYear, isWithinInterval, differenceInDays,
  getDaysInMonth,
} from 'date-fns';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { exportCSV, exportPrintablePDF } from '@/lib/exportUtils';
import { DashboardDatePicker, getPresetRange } from '@/components/shared/DashboardDatePicker';
import type { DateRange } from '@/components/shared/DashboardDatePicker';

type Period = 'today' | 'week' | 'month' | 'year' | 'custom';
type ReportType = 'overview' | 'revenue' | 'occupancy' | 'bookings' | 'guests' | 'roomType' | 'annual';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  custom: 'Custom Range',
};

const REPORT_TYPES: { id: ReportType; label: string; icon: typeof BarChart3; description: string }[] = [
  { id: 'overview', label: 'Daily Summary', icon: ClipboardList, description: 'Complete operational overview with all KPIs' },
  { id: 'revenue', label: 'Revenue Report', icon: DollarSign, description: 'Detailed revenue breakdown by source and room type' },
  { id: 'occupancy', label: 'Occupancy Report', icon: BedDouble, description: 'Room utilisation and availability analysis' },
  { id: 'bookings', label: 'Bookings Report', icon: FileText, description: 'All bookings with status, guest details, and rates' },
  { id: 'guests', label: 'Guest Report', icon: Users, description: 'Guest activity, nationalities, and loyalty stats' },
  { id: 'roomType', label: 'Room Type Performance', icon: PieChart, description: 'Revenue and occupancy per room type' },
  { id: 'annual', label: 'Annual Review', icon: CalendarRange, description: 'Month-by-month performance for the full year' },
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface MonthRow {
  month: string;
  monthFull: string;
  revenue: number;
  roomRevenue: number;
  ancillaryRevenue: number;
  occupancy: number;
  adr: number;
  revpar: number;
  bookings: number;
  guests: number;
  avgStay: number;
}

/** Compute month-by-month performance from actual bookings + folios */
function computeAnnualData(
  bookings: Booking[],
  folioEntries: FolioEntry[],
  totalRooms: number,
): MonthRow[] {
  const now = new Date();
  const rows: MonthRow[] = [];

  for (let mOffset = 11; mOffset >= 0; mOffset--) {
    const m = subMonths(now, mOffset);
    const mStart = startOfMonth(m);
    const mEnd = endOfMonth(m);
    const dim = getDaysInMonth(m);
    const monthIdx = mStart.getMonth();

    // Bookings that overlap this month (exclude cancelled/no-show)
    const mBookings = bookings.filter(b => {
      if (b.status === 'cancelled' || b.status === 'no_show') return false;
      const ci = new Date(b.check_in);
      const co = new Date(b.check_out);
      return ci <= mEnd && co >= mStart;
    });

    // Folio charges posted in this month (non-voided)
    const mCharges = folioEntries.filter(e =>
      e.type === 'charge' && !e.is_voided &&
      isWithinInterval(new Date(e.posted_at), { start: mStart, end: mEnd }),
    );

    const roomCharges = mCharges.filter(e => e.category === 'room');
    const roomRevenue = roomCharges.reduce((s, e) => s + e.amount, 0);
    const ancillaryRevenue = mCharges.filter(e => e.category !== 'room').reduce((s, e) => s + e.amount, 0);
    const revenue = roomRevenue + ancillaryRevenue;

    // Room-nights sold: count booking-nights that fall within this month
    let roomNightsSold = 0;
    let totalNights = 0;
    mBookings.forEach(b => {
      const ci = new Date(b.check_in);
      const co = new Date(b.check_out);
      const overlapStart = ci < mStart ? mStart : ci;
      const overlapEnd = co > mEnd ? mEnd : co;
      const nights = Math.max(0, differenceInDays(overlapEnd, overlapStart));
      roomNightsSold += nights;
      totalNights += differenceInDays(co, ci);
    });

    const totalRoomNights = totalRooms * dim;
    const occupancy = totalRoomNights > 0 ? Math.round((roomNightsSold / totalRoomNights) * 100) : 0;
    const adr = roomNightsSold > 0 ? Math.round(roomRevenue / roomNightsSold) : 0;
    const revpar = totalRoomNights > 0 ? Math.round(revenue / totalRoomNights) : 0;
    const avgStay = mBookings.length > 0
      ? Math.round((totalNights / mBookings.length) * 10) / 10
      : 0;

    rows.push({
      month: MONTH_NAMES[monthIdx]!,
      monthFull: MONTH_FULL[monthIdx]!,
      revenue,
      roomRevenue,
      ancillaryRevenue,
      occupancy,
      adr,
      revpar,
      bookings: mBookings.length,
      guests: mBookings.reduce((s, b) => s + b.num_guests, 0),
      avgStay,
    });
  }

  return rows;
}

function getPreviousDateRange(period: Period): { start: Date; end: Date } | undefined {
  const now = new Date();
  switch (period) {
    case 'today':
      return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
    case 'week':
      return { start: startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), end: endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
    case 'year':
      return { start: startOfYear(subYears(now, 1)), end: endOfYear(subYears(now, 1)) };
    default:
      return undefined;
  }
}

export function ReportsPage() {
  const { bookings } = useBookings();
  const { rooms, roomTypes } = useRooms();
  const { property } = useProperty();
  const { allEntries: allFolioEntries } = useAllFolios(bookings.map(b => b.id));

  const [period, setPeriod] = useState<Period>('today');
  const [dateRange, setDateRange] = useState<DateRange>(getPresetRange('today'));
  const [activeReport, setActiveReport] = useState<ReportType>('overview');

  const handleDateChange = (range: DateRange) => {
    setDateRange(range);
    if (range.period !== 'custom') setPeriod(range.period as Period);
    else setPeriod('custom');
  };

  const start = dateRange.start;
  const end = dateRange.end;
  const periodLabel = dateRange.label;
  const rangeDays = differenceInDays(dateRange.end, dateRange.start) + 1;
  const prev = (period !== 'custom' ? getPreviousDateRange(period as Exclude<Period, 'custom'>) : null) ?? { start: subDays(dateRange.start, rangeDays), end: subDays(dateRange.start, 1) };

  // Filter bookings for current period
  const periodBookings = useMemo(() =>
    bookings.filter(b => {
      const ci = new Date(b.check_in);
      const co = new Date(b.check_out);
      return (
        isWithinInterval(ci, { start, end }) ||
        isWithinInterval(co, { start, end }) ||
        (ci <= start && co >= end)
      );
    }),
    [bookings, start, end]
  );

  const prevBookings = useMemo(() =>
    bookings.filter(b => {
      const ci = new Date(b.check_in);
      const co = new Date(b.check_out);
      return (
        isWithinInterval(ci, { start: prev.start, end: prev.end }) ||
        isWithinInterval(co, { start: prev.start, end: prev.end }) ||
        (ci <= prev.start && co >= prev.end)
      );
    }),
    [bookings, prev.start, prev.end]
  );

  // Folio entries filtered by period
  const periodFolioEntries = useMemo(() =>
    allFolioEntries.filter(e => !e.is_voided && isWithinInterval(new Date(e.posted_at), { start, end })),
    [allFolioEntries, start, end]
  );
  const prevFolioEntries = useMemo(() =>
    allFolioEntries.filter(e => !e.is_voided && isWithinInterval(new Date(e.posted_at), { start: prev.start, end: prev.end })),
    [allFolioEntries, prev.start, prev.end]
  );

  // Revenue = folio charges (room + extras + discounts)
  const periodCharges = periodFolioEntries.filter(e => e.type === 'charge');
  const totalRevenue = periodCharges.reduce((s, e) => s + e.amount, 0);
  const prevCharges = prevFolioEntries.filter(e => e.type === 'charge');
  const prevRevenue = prevCharges.reduce((s, e) => s + e.amount, 0);
  const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue * 100) : 0;

  // Payments collected & outstanding balance
  const totalPaymentsCollected = periodFolioEntries.filter(e => e.type === 'payment').reduce((s, e) => s + Math.abs(e.amount), 0);
  const outstandingBalance = totalRevenue - totalPaymentsCollected;

  // Booking-level total (for bookings table only)
  const bookingAmountTotal = periodBookings.reduce((s, b) => s + b.total_amount, 0);

  const inHouse = periodBookings.filter(b => b.status === 'checked_in');
  const arrivals = periodBookings.filter(b => ['confirmed', 'pending'].includes(b.status) && isWithinInterval(new Date(b.check_in), { start, end }));
  const departures = periodBookings.filter(b => b.status === 'checked_in' && isWithinInterval(new Date(b.check_out), { start, end }));
  const checkedOut = periodBookings.filter(b => b.status === 'checked_out');
  const cancelled = periodBookings.filter(b => b.status === 'cancelled');
  const noShows = periodBookings.filter(b => b.status === 'no_show');

  const totalRooms = rooms.length;
  const maintenanceRooms = rooms.filter(r => r.status === 'maintenance' || r.status === 'blocked').length;
  const sellableRooms = totalRooms - maintenanceRooms;
  const availableRooms = rooms.filter(r => r.status === 'available' && r.housekeeping_status !== 'out_of_order').length;
  const dirtyRooms = rooms.filter(r => r.housekeeping_status === 'dirty').length;
  const cleanRooms = rooms.filter(r => r.housekeeping_status === 'clean' || r.housekeeping_status === 'inspected').length;

  // Period-based occupancy: room-nights sold ÷ total room-nights in period
  const daysInPeriod = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  const totalRoomNightsPeriod = sellableRooms * daysInPeriod;

  // Count room-nights sold in the period (active bookings only)
  const activeStatuses = new Set(['confirmed', 'checked_in', 'checked_out']);
  const roomNightsSoldPeriod = periodBookings
    .filter(b => activeStatuses.has(b.status))
    .reduce((sum, b) => {
      const ci = new Date(b.check_in);
      const co = new Date(b.check_out);
      const overlapStart = ci < start ? start : ci;
      const overlapEnd = co > end ? end : co;
      return sum + Math.max(0, Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / 86400000));
    }, 0);

  const occupancyRate = totalRoomNightsPeriod > 0 ? Math.round((roomNightsSoldPeriod / totalRoomNightsPeriod) * 100) : 0;

  // Previous period occupancy (same calculation)
  const prevDaysInPeriod = Math.max(1, Math.ceil((prev.end.getTime() - prev.start.getTime()) / 86400000));
  const prevTotalRoomNights = sellableRooms * prevDaysInPeriod;
  const prevRoomNightsSold = prevBookings
    .filter(b => activeStatuses.has(b.status))
    .reduce((sum, b) => {
      const ci = new Date(b.check_in);
      const co = new Date(b.check_out);
      const overlapStart = ci < prev.start ? prev.start : ci;
      const overlapEnd = co > prev.end ? prev.end : co;
      return sum + Math.max(0, Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / 86400000));
    }, 0);
  const prevOccupancy = prevTotalRoomNights > 0 ? Math.round((prevRoomNightsSold / prevTotalRoomNights) * 100) : 0;
  const occupancyChange = prevOccupancy > 0 ? occupancyRate - prevOccupancy : 0;

  // ADR = Room Revenue ÷ Room-nights sold (industry standard)
  const roomRevenuePeriod = periodCharges.filter(e => e.category === 'room').reduce((s, e) => s + e.amount, 0);
  const avgDailyRate = roomNightsSoldPeriod > 0 ? roomRevenuePeriod / roomNightsSoldPeriod : 0;

  // RevPAR = Room Revenue ÷ Total Room-nights available (industry standard)
  const revPar = totalRoomNightsPeriod > 0 ? (roomRevenuePeriod / totalRoomNightsPeriod) : 0;

  const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;

  // Unique guests
  const uniqueGuests = new Set(periodBookings.map(b => b.guest_id));

  // Revenue by room type (from folio charges)
  const revByType = roomTypes.map(rt => {
    const typeBookings = periodBookings.filter(b => b.room_type_id === rt.id);
    const typeBookingIds = new Set(typeBookings.map(b => b.id));
    const rev = periodCharges.filter(e => typeBookingIds.has(e.booking_id)).reduce((s, e) => s + e.amount, 0);
    const roomCount = rooms.filter(r => r.room_type_id === rt.id).length;
    // Period-based occupancy per room type
    const typeRoomNights = typeBookings
      .filter(b => activeStatuses.has(b.status))
      .reduce((sum, b) => {
        const ci = new Date(b.check_in);
        const co = new Date(b.check_out);
        const os = ci < start ? start : ci;
        const oe = co > end ? end : co;
        return sum + Math.max(0, Math.ceil((oe.getTime() - os.getTime()) / 86400000));
      }, 0);
    const totalTypeNights = roomCount * daysInPeriod;
    const occCount = totalTypeNights > 0 ? Math.round((typeRoomNights / totalTypeNights) * roomCount) : 0;
    return { name: rt.name, revenue: rev, bookings: typeBookings.length, baseRate: rt.base_rate, roomCount, occupiedCount: occCount };
  });

  // Revenue by source (dynamic from actual booking sources)
  const revBySource = [...new Set(periodBookings.map(b => b.source))].map(src => {
    const srcBookings = periodBookings.filter(b => b.source === src);
    const srcBookingIds = new Set(srcBookings.map(b => b.id));
    return {
      source: src,
      label: getSourceLabel(src),
      bookings: srcBookings.length,
      revenue: periodCharges.filter(e => srcBookingIds.has(e.booking_id)).reduce((s, e) => s + e.amount, 0),
    };
  }).filter(s => s.bookings > 0);

  // Revenue by department (folio charge categories)
  const DEPT_LABELS: Record<string, string> = {
    room: 'Accommodation', food: 'Food & Beverage', beverage: 'Bar & Minibar',
    spa: 'Spa & Wellness', laundry: 'Laundry', parking: 'Parking',
    phone: 'Telephone', damage: 'Damage Recovery', tax: 'Taxes & Levies',
    discount: 'Discounts & Adj.', city_ledger: 'City Ledger / Billback', other: 'Miscellaneous',
  };
  const revByDept = Object.entries(DEPT_LABELS).map(([cat, label]) => ({
    category: cat, label,
    revenue: periodCharges.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
    count: periodCharges.filter(e => e.category === cat).length,
  })).filter(d => d.count > 0);

  // Annual data
  const annualData = useMemo(() => computeAnnualData(bookings, allFolioEntries, sellableRooms), [bookings, allFolioEntries, sellableRooms]);
  const annualTotals = useMemo(() => {
    const t = annualData.reduce(
      (a, m) => ({ rev: a.rev + m.revenue, roomRev: a.roomRev + m.roomRevenue, anc: a.anc + m.ancillaryRevenue, bk: a.bk + m.bookings, gu: a.gu + m.guests, rns: a.rns + (m.occupancy > 0 ? Math.round(m.occupancy * totalRooms * getDaysInMonth(subMonths(new Date(), annualData.length - 1 - annualData.indexOf(m))) / 100) : 0) }),
      { rev: 0, roomRev: 0, anc: 0, bk: 0, gu: 0, rns: 0 },
    );
    const elapsedDays = Math.max(1, Math.ceil((new Date().getTime() - startOfYear(new Date()).getTime()) / 86400000));
    return { ...t, avgOcc: Math.round(annualData.reduce((s, m) => s + m.occupancy, 0) / Math.max(1, annualData.filter(m => m.bookings > 0).length)), avgAdr: t.rns > 0 ? Math.round(t.roomRev / t.rns) : 0, avgRevPar: Math.round(t.rev / (totalRooms * elapsedDays || 1)) };
  }, [annualData, totalRooms]);
  const peakMonth = annualData.reduce((best, m) => m.revenue > best.revenue ? m : best, annualData[0]!);
  const maxMonthRev = Math.max(...annualData.map(m => m.revenue));

  // Guest nationalities
  const nationalities: Record<string, number> = {};
  periodBookings.forEach(b => {
    const nat = b.guest?.nationality ?? 'Unknown';
    nationalities[nat] = (nationalities[nat] ?? 0) + 1;
  });

  // Print handler
  const handlePrint = () => {
    const hotelName = property?.name ?? 'Hotel';
    const reportLabel = REPORT_TYPES.find(r => r.id === activeReport)?.label ?? 'Report';
    const displayPeriod = activeReport === 'annual'
      ? `Full Year ${format(new Date(), 'yyyy')}`
      : `${PERIOD_LABELS[period]}: ${periodLabel}`;
    const w = window.open('', '_blank', 'width=1000,height=1200');
    if (!w) { toast.error('Pop-up blocked'); return; }

    const css = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1a1a1a; padding: 36px 40px; line-height: 1.5; font-size: 12px; }
      .header { text-align: center; border-bottom: 3px solid #0d9488; padding-bottom: 14px; margin-bottom: 20px; }
      .header h1 { font-size: 20px; font-weight: 700; }
      .header h2 { font-size: 15px; font-weight: 600; color: #0d9488; margin-top: 2px; }
      .header .period { font-size: 12px; color: #666; margin-top: 4px; }
      .header .gen { font-size: 10px; color: #999; margin-top: 2px; }
      .section { margin-bottom: 18px; page-break-inside: avoid; }
      .section h3 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #0d9488; border-bottom: 1px solid #e5e5e5; padding-bottom: 5px; margin-bottom: 8px; }
      .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
      .kpi { border: 1px solid #ddd; border-radius: 6px; padding: 10px; text-align: center; }
      .kpi .val { font-size: 22px; font-weight: 700; }
      .kpi .lbl { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.3px; }
      .kpi .change { font-size: 10px; margin-top: 2px; }
      .kpi .up { color: #16a34a; }
      .kpi .down { color: #dc2626; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 4px; }
      th { background: #f3f4f6; text-align: left; padding: 7px 8px; font-weight: 600; border-bottom: 2px solid #d1d5db; }
      td { padding: 6px 8px; border-bottom: 1px solid #eee; }
      tr:nth-child(even) td { background: #fafafa; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .badge { display: inline-block; font-size: 9px; font-weight: 600; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; }
      .badge-green { background: #dcfce7; color: #166534; }
      .badge-red { background: #fee2e2; color: #991b1b; }
      .badge-amber { background: #fef3c7; color: #92400e; }
      .badge-blue { background: #dbeafe; color: #1e40af; }
      .badge-gray { background: #f3f4f6; color: #4b5563; }
      .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
      .three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; }
      .footer { margin-top: 28px; padding-top: 12px; border-top: 2px solid #e5e5e5; text-align: center; font-size: 10px; color: #999; }
      .totals td { font-weight: 700; border-top: 2px solid #d1d5db; }
      .notes { font-size: 10px; color: #888; margin-top: 4px; font-style: italic; }
      @media print { body { padding: 16px; } }
    `;

    // Escape HTML special characters to prevent XSS in print window
    const esc = (s: string | null | undefined): string => {
      if (!s) return '';
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    };

    const statusBadge = (s: string) => {
      const map: Record<string, string> = { checked_in: 'badge-green', checked_out: 'badge-gray', confirmed: 'badge-blue', pending: 'badge-amber', cancelled: 'badge-red', no_show: 'badge-red' };
      return `<span class="badge ${map[s] ?? 'badge-gray'}">${s.replace('_', ' ')}</span>`;
    };

    const changeHtml = (val: number, suffix = '%') =>
      val !== 0 ? `<div class="change ${val > 0 ? 'up' : 'down'}">${val > 0 ? '▲' : '▼'} ${Math.abs(val).toFixed(1)}${suffix} vs prev</div>` : '';

    let body = `
      <div class="header">
        <h1>${esc(hotelName)}</h1>
        <h2>${esc(reportLabel)}</h2>
        <div class="period">${esc(displayPeriod)}</div>
        <div class="gen">Generated ${format(new Date(), 'dd/MM/yyyy HH:mm')} by Arrivé PMS</div>
      </div>
    `;

    // KPI row — always shown
    body += `
      <div class="kpi-grid">
        <div class="kpi"><div class="val">${occupancyRate}%</div><div class="lbl">Occupancy</div>${changeHtml(occupancyChange)}</div>
        <div class="kpi"><div class="val">£${totalRevenue.toFixed(0)}</div><div class="lbl">Total Revenue</div>${changeHtml(revenueChange)}</div>
        <div class="kpi"><div class="val">£${avgDailyRate.toFixed(0)}</div><div class="lbl">Avg Daily Rate</div></div>
        <div class="kpi"><div class="val">£${revPar.toFixed(0)}</div><div class="lbl">RevPAR</div></div>
      </div>
    `;

    if (activeReport === 'overview' || activeReport === 'bookings') {
      // Movement summary
      body += `
        <div class="two-col">
          <div class="section">
            <h3>Movement Summary</h3>
            <table>
              <tr><td>In-House</td><td class="text-right">${inHouse.length}</td></tr>
              <tr><td>Expected Arrivals</td><td class="text-right">${arrivals.length}</td></tr>
              <tr><td>Expected Departures</td><td class="text-right">${departures.length}</td></tr>
              <tr><td>Checked Out</td><td class="text-right">${checkedOut.length}</td></tr>
              <tr><td>No-Shows</td><td class="text-right">${noShows.length}</td></tr>
              <tr><td>Cancellations</td><td class="text-right">${cancelled.length}</td></tr>
              <tr class="totals"><td>Total Bookings</td><td class="text-right">${periodBookings.length}</td></tr>
            </table>
          </div>
          <div class="section">
            <h3>Room Inventory</h3>
            <table>
              <tr><td>Total Rooms</td><td class="text-right">${totalRooms}</td></tr>
              <tr><td>Occupied</td><td class="text-right">${occupiedRooms}</td></tr>
              <tr><td>Available</td><td class="text-right">${availableRooms}</td></tr>
              <tr><td>Maintenance / OOO</td><td class="text-right">${maintenanceRooms}</td></tr>
              <tr><td>Clean / Inspected</td><td class="text-right">${cleanRooms}</td></tr>
              <tr><td>Dirty</td><td class="text-right">${dirtyRooms}</td></tr>
            </table>
          </div>
        </div>
      `;

      // Full bookings table
      body += `
        <div class="section">
          <h3>Booking Details (${periodBookings.length})</h3>
          <table>
            <thead><tr>
              <th>Conf.</th><th>Guest</th><th>Room Type</th><th>Room</th>
              <th>Check-in</th><th>Check-out</th><th>Nights</th>
              <th class="text-right">Rate</th><th class="text-right">Total</th><th>Status</th>
            </tr></thead>
            <tbody>
              ${periodBookings.map(b => {
                const room = rooms.find(r => r.id === b.room_id);
                const rt = roomTypes.find(r => r.id === b.room_type_id);
                const n = differenceInDays(new Date(b.check_out), new Date(b.check_in));
                return `<tr>
                  <td>${esc(b.confirmation_code)}</td>
                  <td>${esc(b.guest?.first_name)} ${esc(b.guest?.last_name)}</td>
                  <td>${esc(rt?.name) ?? '—'}</td>
                  <td>${room?.room_number ?? '—'}</td>
                  <td>${format(new Date(b.check_in), 'dd/MM')}</td>
                  <td>${format(new Date(b.check_out), 'dd/MM')}</td>
                  <td class="text-center">${n}</td>
                  <td class="text-right">£${b.nightly_rate.toFixed(2)}</td>
                  <td class="text-right">£${b.total_amount.toFixed(2)}</td>
                  <td>${statusBadge(b.status)}</td>
                </tr>`;
              }).join('')}
              <tr class="totals">
                <td colspan="7">Totals</td>
                <td class="text-right">£${(periodBookings.reduce((s, b) => s + b.nightly_rate, 0) / Math.max(periodBookings.length, 1)).toFixed(2)} avg</td>
                <td class="text-right">£${bookingAmountTotal.toFixed(2)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    if (activeReport === 'overview' || activeReport === 'revenue') {
      body += `
        <div class="two-col">
          <div class="section">
            <h3>Revenue by Room Type</h3>
            <table>
              <thead><tr><th>Room Type</th><th>Bookings</th><th class="text-right">Base Rate</th><th class="text-right">Revenue</th></tr></thead>
              <tbody>
                ${revByType.map(r => `<tr>
                  <td>${r.name}</td><td class="text-center">${r.bookings}</td>
                  <td class="text-right">£${r.baseRate}</td><td class="text-right">£${r.revenue.toFixed(2)}</td>
                </tr>`).join('')}
                <tr class="totals"><td>Total</td><td class="text-center">${periodBookings.length}</td><td></td><td class="text-right">£${totalRevenue.toFixed(2)}</td></tr>
              </tbody>
            </table>
          </div>
          <div class="section">
            <h3>Revenue by Source</h3>
            <table>
              <thead><tr><th>Source</th><th>Bookings</th><th class="text-right">Revenue</th><th class="text-right">% Share</th></tr></thead>
              <tbody>
                ${revBySource.map(s => `<tr>
                  <td>${s.label}</td>
                  <td class="text-center">${s.bookings}</td>
                  <td class="text-right">£${s.revenue.toFixed(2)}</td>
                  <td class="text-right">${totalRevenue > 0 ? (s.revenue / totalRevenue * 100).toFixed(1) : 0}%</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      // Revenue by department + payments summary
      body += `
        <div class="two-col">
          <div class="section">
            <h3>Revenue by Department</h3>
            <table>
              <thead><tr><th>Department</th><th class="text-center">Entries</th><th class="text-right">Revenue</th><th class="text-right">% Share</th></tr></thead>
              <tbody>
                ${revByDept.map(d => `<tr>
                  <td>${d.label}</td>
                  <td class="text-center">${d.count}</td>
                  <td class="text-right">£${d.revenue.toFixed(2)}</td>
                  <td class="text-right">${totalRevenue > 0 ? (d.revenue / totalRevenue * 100).toFixed(1) : 0}%</td>
                </tr>`).join('')}
                <tr class="totals"><td>Total Revenue</td><td></td><td class="text-right">£${totalRevenue.toFixed(2)}</td><td class="text-right">100%</td></tr>
              </tbody>
            </table>
          </div>
          <div class="section">
            <h3>Payments & Balance</h3>
            <table>
              <tr><td>Total Charges</td><td class="text-right">£${totalRevenue.toFixed(2)}</td></tr>
              <tr><td>Payments Collected</td><td class="text-right">£${totalPaymentsCollected.toFixed(2)}</td></tr>
              <tr class="totals"><td>Outstanding Balance</td><td class="text-right">£${outstandingBalance.toFixed(2)}</td></tr>
            </table>
          </div>
        </div>
      `;
    }

    if (activeReport === 'overview' || activeReport === 'occupancy') {
      body += `
        <div class="section">
          <h3>Room Type Occupancy</h3>
          <table>
            <thead><tr><th>Room Type</th><th>Total Rooms</th><th>Occupied</th><th>Available</th><th class="text-right">Occupancy %</th><th class="text-right">RevPAR</th></tr></thead>
            <tbody>
              ${revByType.map(r => `<tr>
                <td>${r.name}</td>
                <td class="text-center">${r.roomCount}</td>
                <td class="text-center">${r.occupiedCount}</td>
                <td class="text-center">${r.roomCount - r.occupiedCount}</td>
                <td class="text-right">${r.roomCount > 0 ? Math.round(r.occupiedCount / r.roomCount * 100) : 0}%</td>
                <td class="text-right">£${r.roomCount > 0 ? (r.revenue / r.roomCount).toFixed(2) : '0.00'}</td>
              </tr>`).join('')}
              <tr class="totals">
                <td>Overall</td>
                <td class="text-center">${totalRooms}</td>
                <td class="text-center">${occupiedRooms}</td>
                <td class="text-center">${availableRooms}</td>
                <td class="text-right">${occupancyRate}%</td>
                <td class="text-right">£${revPar.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    if (activeReport === 'overview' || activeReport === 'guests') {
      body += `
        <div class="two-col">
          <div class="section">
            <h3>Guest Statistics</h3>
            <table>
              <tr><td>Unique Guests</td><td class="text-right">${uniqueGuests.size}</td></tr>
              <tr><td>Total Bookings</td><td class="text-right">${periodBookings.length}</td></tr>
              <tr><td>Average Guests per Booking</td><td class="text-right">${periodBookings.length > 0 ? (periodBookings.reduce((s, b) => s + b.num_guests, 0) / periodBookings.length).toFixed(1) : '0'}</td></tr>
              <tr><td>Special Requests</td><td class="text-right">${periodBookings.filter(b => b.special_requests).length}</td></tr>
            </table>
          </div>
          <div class="section">
            <h3>Guest Nationalities</h3>
            <table>
              <thead><tr><th>Nationality</th><th class="text-right">Guests</th></tr></thead>
              <tbody>
                ${Object.entries(nationalities).sort((a, b) => b[1] - a[1]).map(([n, c]) => `<tr><td>${n}</td><td class="text-right">${c}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      // Guest list
      body += `
        <div class="section">
          <h3>Guest List</h3>
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Nationality</th><th class="text-right">Total Stays</th><th class="text-right">Total Spend</th><th>Tags</th></tr></thead>
            <tbody>
              ${[...new Map(periodBookings.filter(b => b.guest).map(b => [b.guest_id, b.guest!])).values()]
                .map(g => `<tr>
                  <td>${g.first_name} ${g.last_name}</td>
                  <td>${g.email}</td>
                  <td>${g.phone ?? '—'}</td>
                  <td>${g.nationality ?? '—'}</td>
                  <td class="text-right">${g.total_stays}</td>
                  <td class="text-right">£${g.total_spend.toFixed(0)}</td>
                  <td>${g.tags?.map((t: string) => `<span class="badge badge-blue">${t}</span>`).join(' ') ?? ''}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    if (activeReport === 'roomType') {
      body += `
        <div class="section">
          <h3>Room Type Performance</h3>
          <table>
            <thead><tr><th>Room Type</th><th>Rooms</th><th>Occupied</th><th class="text-right">Occ %</th><th>Bookings</th><th class="text-right">Base Rate</th><th class="text-right">Revenue</th><th class="text-right">RevPAR</th><th class="text-right">% of Total Rev</th></tr></thead>
            <tbody>
              ${revByType.map(r => `<tr>
                <td>${r.name}</td>
                <td class="text-center">${r.roomCount}</td>
                <td class="text-center">${r.occupiedCount}</td>
                <td class="text-right">${r.roomCount > 0 ? Math.round(r.occupiedCount / r.roomCount * 100) : 0}%</td>
                <td class="text-center">${r.bookings}</td>
                <td class="text-right">£${r.baseRate}</td>
                <td class="text-right">£${r.revenue.toFixed(2)}</td>
                <td class="text-right">£${r.roomCount > 0 ? (r.revenue / r.roomCount).toFixed(2) : '0.00'}</td>
                <td class="text-right">${totalRevenue > 0 ? (r.revenue / totalRevenue * 100).toFixed(1) : 0}%</td>
              </tr>`).join('')}
              <tr class="totals">
                <td>Total</td>
                <td class="text-center">${totalRooms}</td>
                <td class="text-center">${occupiedRooms}</td>
                <td class="text-right">${occupancyRate}%</td>
                <td class="text-center">${periodBookings.length}</td>
                <td></td>
                <td class="text-right">£${totalRevenue.toFixed(2)}</td>
                <td class="text-right">£${revPar.toFixed(2)}</td>
                <td class="text-right">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    if (activeReport === 'annual') {
      body += `
        <div class="section">
          <h3>Month-by-Month Performance — ${format(new Date(), 'yyyy')}</h3>
          <table>
            <thead><tr>
              <th>Month</th><th class="text-right">Revenue</th><th class="text-right">Room Rev</th><th class="text-right">Ancillary</th>
              <th class="text-right">Occ %</th><th class="text-right">ADR</th><th class="text-right">RevPAR</th>
              <th class="text-right">Bookings</th><th class="text-right">Guests</th><th class="text-right">Avg Stay</th>
            </tr></thead>
            <tbody>
              ${annualData.map(m => `<tr>
                <td>${m.monthFull}</td>
                <td class="text-right">£${m.revenue.toLocaleString()}</td>
                <td class="text-right">£${m.roomRevenue.toLocaleString()}</td>
                <td class="text-right">£${m.ancillaryRevenue.toLocaleString()}</td>
                <td class="text-right">${m.occupancy}%</td>
                <td class="text-right">£${m.adr}</td>
                <td class="text-right">£${m.revpar}</td>
                <td class="text-right">${m.bookings}</td>
                <td class="text-right">${m.guests}</td>
                <td class="text-right">${m.avgStay.toFixed(1)}</td>
              </tr>`).join('')}
              <tr class="totals">
                <td>Full Year</td>
                <td class="text-right">£${annualTotals.rev.toLocaleString()}</td>
                <td class="text-right">£${annualTotals.roomRev.toLocaleString()}</td>
                <td class="text-right">£${annualTotals.anc.toLocaleString()}</td>
                <td class="text-right">${annualTotals.avgOcc}% avg</td>
                <td class="text-right">£${annualTotals.avgAdr}</td>
                <td class="text-right">£${annualTotals.avgRevPar}</td>
                <td class="text-right">${annualTotals.bk}</td>
                <td class="text-right">${annualTotals.gu}</td>
                <td class="text-right">${(annualData.reduce((s, m) => s + m.avgStay, 0) / 12).toFixed(1)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="two-col">
          <div class="section">
            <h3>Annual Summary</h3>
            <table>
              <tr><td>Total Revenue</td><td class="text-right">£${annualTotals.rev.toLocaleString()}</td></tr>
              <tr><td>Room Revenue</td><td class="text-right">£${annualTotals.roomRev.toLocaleString()}</td></tr>
              <tr><td>Ancillary Revenue</td><td class="text-right">£${annualTotals.anc.toLocaleString()}</td></tr>
              <tr><td>Average Occupancy</td><td class="text-right">${annualTotals.avgOcc}%</td></tr>
              <tr><td>Average Daily Rate</td><td class="text-right">£${annualTotals.avgAdr}</td></tr>
              <tr><td>Total Bookings</td><td class="text-right">${annualTotals.bk}</td></tr>
              <tr><td>Total Guests</td><td class="text-right">${annualTotals.gu}</td></tr>
            </table>
          </div>
          <div class="section">
            <h3>Peak Performance</h3>
            <table>
              <tr><td>Peak Month</td><td class="text-right">${peakMonth.monthFull}</td></tr>
              <tr><td>Peak Revenue</td><td class="text-right">£${peakMonth.revenue.toLocaleString()}</td></tr>
              <tr><td>Peak Occupancy</td><td class="text-right">${peakMonth.occupancy}%</td></tr>
              <tr><td>Peak ADR</td><td class="text-right">£${peakMonth.adr}</td></tr>
              <tr><td>Best Month Bookings</td><td class="text-right">${peakMonth.bookings}</td></tr>
              <tr><td>Total Rooms</td><td class="text-right">${totalRooms}</td></tr>
              <tr><td>Room Inventory</td><td class="text-right">${totalRooms * 365} room-nights/yr</td></tr>
            </table>
          </div>
        </div>
      `;
    }

    body += `
      <div class="footer">
        <p>${hotelName} — ${reportLabel} — ${displayPeriod}</p>
        <p>Generated by Arrivé Property Management System</p>
      </div>
    `;

    w.document.write(`<!DOCTYPE html><html><head><title>${esc(reportLabel)} — ${esc(hotelName)}</title><style>${css}</style></head><body>${body}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  // Format for on-screen stat cards
  const Stat = ({ label, value, change, prefix = '' }: { label: string; value: string | number; change?: number; prefix?: string }) => (
    <Card variant="dark">
      <CardContent className="py-4 text-center">
        <p className="text-2xl font-display text-white">{prefix}{value}</p>
        <p className="text-xs text-steel font-body mt-1">{label}</p>
        {change != null && change !== 0 && (
          <p className={cn('text-[10px] font-body mt-1 flex items-center justify-center gap-0.5',
            change > 0 ? 'text-emerald-400' : 'text-red-400'
          )}>
            {change > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {Math.abs(change).toFixed(1)}% vs prev
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display text-white mb-1.5 tracking-tight flex items-center gap-2">
            <BarChart3 size={24} className="text-teal" />
            Reports
          </h1>
          <p className="text-sm text-steel font-body">
            Comprehensive reporting — {periodLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline-dark" onClick={() => {
            const rows = periodBookings.map(b => ({
              Confirmation: b.confirmation_code,
              Guest: `${b.guest?.first_name ?? ''} ${b.guest?.last_name ?? ''}`,
              'Check In': b.check_in,
              'Check Out': b.check_out,
              Status: b.status,
              Source: getSourceLabel(b.source),
              'Room Type': b.room_type?.name ?? '',
              Room: b.room?.room_number ?? 'Unassigned',
              Rate: `£${b.nightly_rate.toFixed(2)}`,
              Total: `£${b.total_amount.toFixed(2)}`,
            }));
            exportCSV(rows, `report-${activeReport}-${format(new Date(), 'yyyy-MM-dd')}`);
          }}>
            <Download size={16} className="mr-2" /> Export CSV
          </Button>
          <Button variant="outline-dark" onClick={() => {
            const rows = periodBookings.map(b => ({
              Confirmation: b.confirmation_code,
              Guest: `${b.guest?.first_name ?? ''} ${b.guest?.last_name ?? ''}`,
              'Check In': b.check_in,
              'Check Out': b.check_out,
              Status: b.status,
              Source: getSourceLabel(b.source),
              Rate: `£${b.nightly_rate.toFixed(2)}`,
              Total: `£${b.total_amount.toFixed(2)}`,
            }));
            exportPrintablePDF(rows, {
              title: `${REPORT_TYPES.find(r => r.id === activeReport)?.label ?? 'Report'}`,
              subtitle: periodLabel,
              propertyName: property?.name,
              orientation: 'landscape',
            });
          }}>
            <FileText size={16} className="mr-2" /> Export PDF
          </Button>
          <Button onClick={handlePrint}>
            <Printer size={16} className="mr-2" /> Print Report
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="mb-6">
        <DashboardDatePicker
          value={dateRange}
          onChange={handleDateChange}
          presets={['today', 'week', 'month', 'year']}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Occupancy" value={`${occupancyRate}%`} change={occupancyChange} />
        <Stat label="Total Revenue" value={`${totalRevenue.toFixed(0)}`} prefix="£" change={revenueChange} />
        <Stat label="ADR" value={`${avgDailyRate.toFixed(0)}`} prefix="£" />
        <Stat label="RevPAR" value={`${revPar.toFixed(0)}`} prefix="£" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Report Selector Sidebar */}
        <div className="lg:col-span-1 space-y-1">
          <p className="text-[11px] text-steel font-body uppercase tracking-wider mb-2 px-2">Report Type</p>
          {REPORT_TYPES.map(rt => (
            <button
              key={rt.id}
              onClick={() => setActiveReport(rt.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group',
                rt.id === activeReport
                  ? 'bg-teal/10 border border-teal/20'
                  : 'hover:bg-white/[0.04]'
              )}
            >
              <rt.icon size={16} className={cn(
                rt.id === activeReport ? 'text-teal' : 'text-steel group-hover:text-silver'
              )} />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-xs font-body font-semibold truncate',
                  rt.id === activeReport ? 'text-teal' : 'text-silver'
                )}>{rt.label}</p>
                <p className="text-[10px] text-steel font-body truncate">{rt.description}</p>
              </div>
              <ChevronRight size={14} className={cn(
                'shrink-0 transition-colors',
                rt.id === activeReport ? 'text-teal' : 'text-white/[0.06] group-hover:text-steel'
              )} />
            </button>
          ))}
        </div>

        {/* Report Content */}
        <div className="lg:col-span-3 space-y-4">

          {/* === Overview === */}
          {activeReport === 'overview' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Card variant="dark">
                  <CardHeader><CardTitle className="text-white text-sm">Movement Summary</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {[
                        { l: 'In-House', v: inHouse.length, c: 'text-emerald-400' },
                        { l: 'Expected Arrivals', v: arrivals.length, c: 'text-blue-400' },
                        { l: 'Expected Departures', v: departures.length, c: 'text-amber-400' },
                        { l: 'Checked Out', v: checkedOut.length, c: 'text-silver' },
                        { l: 'No-Shows', v: noShows.length, c: 'text-red-400' },
                        { l: 'Cancelled', v: cancelled.length, c: 'text-red-400' },
                      ].map(item => (
                        <div key={item.l} className="flex items-center justify-between py-1">
                          <span className="text-xs text-steel font-body">{item.l}</span>
                          <span className={cn('text-sm font-display', item.c)}>{item.v}</span>
                        </div>
                      ))}
                      <Separator variant="dark" />
                      <div className="flex items-center justify-between py-1">
                        <span className="text-xs text-white font-body font-semibold">Total Bookings</span>
                        <span className="text-sm font-display text-white">{periodBookings.length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card variant="dark">
                  <CardHeader><CardTitle className="text-white text-sm">Room Inventory</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {[
                        { l: 'Occupied', v: occupiedRooms, c: 'text-emerald-400' },
                        { l: 'Available', v: availableRooms, c: 'text-blue-400' },
                        { l: 'Maintenance / OOO', v: maintenanceRooms, c: 'text-red-400' },
                        { l: 'Clean / Inspected', v: cleanRooms, c: 'text-teal' },
                        { l: 'Dirty', v: dirtyRooms, c: 'text-amber-400' },
                      ].map(item => (
                        <div key={item.l} className="flex items-center justify-between py-1">
                          <span className="text-xs text-steel font-body">{item.l}</span>
                          <span className={cn('text-sm font-display', item.c)}>{item.v}</span>
                        </div>
                      ))}
                      <Separator variant="dark" />
                      <div className="flex items-center justify-between py-1">
                        <span className="text-xs text-white font-body font-semibold">Total Rooms</span>
                        <span className="text-sm font-display text-white">{totalRooms}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue by Type + Source */}
              <div className="grid grid-cols-2 gap-4">
                <Card variant="dark">
                  <CardHeader><CardTitle className="text-white text-sm">Revenue by Room Type</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {revByType.map(r => (
                        <div key={r.name} className="flex items-center justify-between py-1">
                          <div>
                            <span className="text-xs text-silver font-body">{r.name}</span>
                            <span className="text-[10px] text-steel ml-2">{r.bookings} bookings</span>
                          </div>
                          <span className="text-sm font-display text-gold">£{r.revenue.toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card variant="dark">
                  <CardHeader><CardTitle className="text-white text-sm">Revenue by Source</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {revBySource.length === 0 ? (
                        <p className="text-xs text-steel font-body text-center py-4">No data for period</p>
                      ) : revBySource.map(s => (
                        <div key={s.source} className="flex items-center justify-between py-1">
                          <div>
                            <span className="text-xs text-silver font-body">{s.label}</span>
                            <span className="text-[10px] text-steel ml-2">{s.bookings} bookings</span>
                          </div>
                          <span className="text-sm font-display text-gold">£{s.revenue.toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* === Revenue === */}
          {activeReport === 'revenue' && (
            <>
              <Card variant="dark">
                <CardHeader><CardTitle className="text-white text-sm">Revenue by Room Type</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {revByType.map(r => {
                      const pct = totalRevenue > 0 ? (r.revenue / totalRevenue * 100) : 0;
                      return (
                        <div key={r.name}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-silver font-body">{r.name}</span>
                            <span className="text-xs text-gold font-display">£{r.revenue.toFixed(2)} ({pct.toFixed(1)}%)</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-teal to-teal/60 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[10px] text-steel font-body mt-0.5">{r.bookings} bookings · Base rate £{r.baseRate}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card variant="dark">
                <CardHeader><CardTitle className="text-white text-sm">Revenue by Source</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {revBySource.map(s => {
                      const pct = totalRevenue > 0 ? (s.revenue / totalRevenue * 100) : 0;
                      return (
                        <div key={s.source}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-silver font-body">{s.label}</span>
                            <span className="text-xs text-gold font-display">£{s.revenue.toFixed(2)} ({pct.toFixed(1)}%)</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-gold to-gold/60 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[10px] text-steel font-body mt-0.5">{s.bookings} bookings</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card variant="dark">
                <CardHeader><CardTitle className="text-white text-sm">Revenue by Department</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {revByDept.length === 0 ? (
                      <p className="text-xs text-steel font-body text-center py-4">No folio data for period</p>
                    ) : revByDept.map(d => {
                      const pct = totalRevenue > 0 ? (d.revenue / totalRevenue * 100) : 0;
                      return (
                        <div key={d.category}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-silver font-body">{d.label}</span>
                            <span className={cn('text-xs font-display', d.revenue >= 0 ? 'text-gold' : 'text-red-400')}>£{d.revenue.toFixed(2)} ({pct.toFixed(1)}%)</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400/60 transition-all" style={{ width: `${Math.max(0, Math.abs(pct))}%` }} />
                          </div>
                          <p className="text-[10px] text-steel font-body mt-0.5">{d.count} entries</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card variant="dark">
                <CardHeader><CardTitle className="text-white text-sm">Key Revenue Metrics</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { l: 'Total Revenue', v: `£${totalRevenue.toFixed(2)}` },
                      { l: 'Average Daily Rate', v: `£${avgDailyRate.toFixed(2)}` },
                      { l: 'Revenue per Available Room', v: `£${revPar.toFixed(2)}` },
                      { l: 'Avg Revenue per Booking', v: `£${periodBookings.length > 0 ? (totalRevenue / periodBookings.length).toFixed(2) : '0.00'}` },
                      { l: 'Payments Collected', v: `£${totalPaymentsCollected.toFixed(2)}` },
                      { l: 'Outstanding Balance', v: `£${outstandingBalance.toFixed(2)}` },
                    ].map(m => (
                      <div key={m.l} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-xs text-steel font-body">{m.l}</span>
                        <span className="text-sm font-display text-white">{m.v}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* === Occupancy === */}
          {activeReport === 'occupancy' && (
            <>
              <Card variant="dark">
                <CardHeader><CardTitle className="text-white text-sm">Occupancy by Room Type</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {revByType.map(r => {
                      const occ = r.roomCount > 0 ? Math.round(r.occupiedCount / r.roomCount * 100) : 0;
                      return (
                        <div key={r.name}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-silver font-body">{r.name}</span>
                            <span className="text-xs font-display text-white">{occ}% ({r.occupiedCount}/{r.roomCount})</span>
                          </div>
                          <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                occ >= 80 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                                occ >= 50 ? 'bg-gradient-to-r from-teal to-teal/70' :
                                'bg-gradient-to-r from-amber-500 to-amber-400'
                              )}
                              style={{ width: `${occ}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-steel font-body mt-0.5">RevPAR: £{r.roomCount > 0 ? (r.revenue / r.roomCount).toFixed(2) : '0.00'}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card variant="dark">
                  <CardHeader><CardTitle className="text-white text-sm">Room Status</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {[
                        { l: 'Occupied', v: occupiedRooms, pct: totalRooms > 0 ? Math.round(occupiedRooms / totalRooms * 100) : 0, c: 'bg-emerald-500' },
                        { l: 'Available', v: availableRooms, pct: totalRooms > 0 ? Math.round(availableRooms / totalRooms * 100) : 0, c: 'bg-blue-500' },
                        { l: 'Maintenance', v: maintenanceRooms, pct: totalRooms > 0 ? Math.round(maintenanceRooms / totalRooms * 100) : 0, c: 'bg-red-500' },
                      ].map(item => (
                        <div key={item.l} className="flex items-center gap-3 py-1">
                          <div className={cn('w-3 h-3 rounded-full shrink-0', item.c)} />
                          <span className="text-xs text-silver font-body flex-1">{item.l}</span>
                          <span className="text-xs font-display text-white">{item.v} ({item.pct}%)</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card variant="dark">
                  <CardHeader><CardTitle className="text-white text-sm">Housekeeping Status</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {[
                        { l: 'Clean', v: rooms.filter(r => r.housekeeping_status === 'clean').length, c: 'bg-emerald-500' },
                        { l: 'Inspected', v: rooms.filter(r => r.housekeeping_status === 'inspected').length, c: 'bg-teal' },
                        { l: 'Dirty', v: dirtyRooms, c: 'bg-amber-500' },
                        { l: 'Serviced', v: rooms.filter(r => r.housekeeping_status === 'serviced').length, c: 'bg-blue-500' },
                        { l: 'Out of Order', v: rooms.filter(r => r.housekeeping_status === 'out_of_order').length, c: 'bg-red-500' },
                      ].map(item => (
                        <div key={item.l} className="flex items-center gap-3 py-1">
                          <div className={cn('w-3 h-3 rounded-full shrink-0', item.c)} />
                          <span className="text-xs text-silver font-body flex-1">{item.l}</span>
                          <span className="text-xs font-display text-white">{item.v}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* === Bookings === */}
          {activeReport === 'bookings' && (
            <Card variant="dark">
              <CardHeader>
                <CardTitle className="text-white text-sm">All Bookings — {PERIOD_LABELS[period]} ({periodBookings.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {periodBookings.length === 0 ? (
                  <p className="text-sm text-steel font-body text-center py-8">No bookings for this period</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-body">
                      <thead>
                        <tr className="text-steel border-b border-white/[0.08]">
                          <th className="text-left py-2 px-2 font-semibold">Conf.</th>
                          <th className="text-left py-2 px-2 font-semibold">Guest</th>
                          <th className="text-left py-2 px-2 font-semibold">Room</th>
                          <th className="text-left py-2 px-2 font-semibold">Check-in</th>
                          <th className="text-left py-2 px-2 font-semibold">Check-out</th>
                          <th className="text-center py-2 px-2 font-semibold">Nights</th>
                          <th className="text-right py-2 px-2 font-semibold">Rate</th>
                          <th className="text-right py-2 px-2 font-semibold">Total</th>
                          <th className="text-left py-2 px-2 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {periodBookings.map(b => {
                          const room = rooms.find(r => r.id === b.room_id);
                          const n = differenceInDays(new Date(b.check_out), new Date(b.check_in));
                          const statusColors: Record<string, string> = {
                            checked_in: 'text-emerald-400',
                            checked_out: 'text-steel',
                            confirmed: 'text-blue-400',
                            pending: 'text-amber-400',
                            cancelled: 'text-red-400',
                            no_show: 'text-red-400',
                          };
                          return (
                            <tr key={b.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                              <td className="py-2 px-2 text-steel">{b.confirmation_code}</td>
                              <td className="py-2 px-2 text-silver">{b.guest?.first_name} {b.guest?.last_name}</td>
                              <td className="py-2 px-2 text-silver">{room?.room_number ?? '—'}</td>
                              <td className="py-2 px-2 text-silver">{format(new Date(b.check_in), 'dd/MM')}</td>
                              <td className="py-2 px-2 text-silver">{format(new Date(b.check_out), 'dd/MM')}</td>
                              <td className="py-2 px-2 text-center text-silver">{n}</td>
                              <td className="py-2 px-2 text-right text-silver">£{b.nightly_rate}</td>
                              <td className="py-2 px-2 text-right text-gold font-semibold">£{b.total_amount}</td>
                              <td className={cn('py-2 px-2 capitalize font-semibold', statusColors[b.status] ?? 'text-steel')}>
                                {b.status.replace('_', ' ')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-white/[0.1]">
                          <td colSpan={6} className="py-2 px-2 text-white font-semibold">Totals</td>
                          <td className="py-2 px-2 text-right text-steel">
                            £{(periodBookings.reduce((s, b) => s + b.nightly_rate, 0) / Math.max(periodBookings.length, 1)).toFixed(0)} avg
                          </td>
                          <td className="py-2 px-2 text-right text-gold font-semibold">£{bookingAmountTotal.toFixed(0)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* === Guests === */}
          {activeReport === 'guests' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Card variant="dark">
                  <CardHeader><CardTitle className="text-white text-sm">Guest Statistics</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {[
                        { l: 'Unique Guests', v: uniqueGuests.size },
                        { l: 'Total Bookings', v: periodBookings.length },
                        { l: 'Avg Guests / Booking', v: periodBookings.length > 0 ? (periodBookings.reduce((s, b) => s + b.num_guests, 0) / periodBookings.length).toFixed(1) : '0' },
                        { l: 'With Special Requests', v: periodBookings.filter(b => b.special_requests).length },
                      ].map(m => (
                        <div key={m.l} className="flex items-center justify-between py-1.5">
                          <span className="text-xs text-steel font-body">{m.l}</span>
                          <span className="text-sm font-display text-white">{m.v}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card variant="dark">
                  <CardHeader><CardTitle className="text-white text-sm">Nationalities</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(nationalities).sort((a, b) => b[1] - a[1]).map(([nat, count]) => (
                        <div key={nat} className="flex items-center justify-between py-1.5">
                          <span className="text-xs text-silver font-body">{nat}</span>
                          <span className="text-sm font-display text-white">{count}</span>
                        </div>
                      ))}
                      {Object.keys(nationalities).length === 0 && (
                        <p className="text-xs text-steel font-body text-center py-4">No data</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card variant="dark">
                <CardHeader><CardTitle className="text-white text-sm">Guest List</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-body">
                      <thead>
                        <tr className="text-steel border-b border-white/[0.08]">
                          <th className="text-left py-2 px-2 font-semibold">Name</th>
                          <th className="text-left py-2 px-2 font-semibold">Email</th>
                          <th className="text-left py-2 px-2 font-semibold">Nationality</th>
                          <th className="text-right py-2 px-2 font-semibold">Stays</th>
                          <th className="text-right py-2 px-2 font-semibold">Total Spend</th>
                          <th className="text-left py-2 px-2 font-semibold">Tags</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...new Map(periodBookings.filter(b => b.guest).map(b => [b.guest_id, b.guest!])).values()].map(g => (
                          <tr key={g.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                            <td className="py-2 px-2 text-silver">{g.first_name} {g.last_name}</td>
                            <td className="py-2 px-2 text-steel">{g.email}</td>
                            <td className="py-2 px-2 text-silver">{g.nationality ?? '—'}</td>
                            <td className="py-2 px-2 text-right text-silver">{g.total_stays}</td>
                            <td className="py-2 px-2 text-right text-gold">£{g.total_spend.toFixed(0)}</td>
                            <td className="py-2 px-2">
                              {g.tags?.map((t: string) => (
                                <span key={t} className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded bg-teal/10 text-teal mr-1">{t}</span>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* === Room Type Performance === */}
          {activeReport === 'roomType' && (
            <Card variant="dark">
              <CardHeader><CardTitle className="text-white text-sm">Room Type Performance — {PERIOD_LABELS[period]}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-5">
                  {revByType.map(r => {
                    const occ = r.roomCount > 0 ? Math.round(r.occupiedCount / r.roomCount * 100) : 0;
                    const pctRev = totalRevenue > 0 ? (r.revenue / totalRevenue * 100) : 0;
                    return (
                      <div key={r.name} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <BedDouble size={16} className="text-teal" />
                            <span className="text-sm font-display text-white">{r.name}</span>
                          </div>
                          <span className="text-xs text-steel font-body">Base rate: £{r.baseRate}/night</span>
                        </div>
                        <div className="grid grid-cols-5 gap-3">
                          <div className="text-center">
                            <p className="text-lg font-display text-white">{r.roomCount}</p>
                            <p className="text-[10px] text-steel font-body">Rooms</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-display text-emerald-400">{occ}%</p>
                            <p className="text-[10px] text-steel font-body">Occupancy</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-display text-white">{r.bookings}</p>
                            <p className="text-[10px] text-steel font-body">Bookings</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-display text-gold">£{r.revenue.toFixed(0)}</p>
                            <p className="text-[10px] text-steel font-body">Revenue</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-display text-white">{pctRev.toFixed(1)}%</p>
                            <p className="text-[10px] text-steel font-body">Rev Share</p>
                          </div>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-teal to-teal/50 transition-all" style={{ width: `${occ}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* === Annual Review === */}
          {activeReport === 'annual' && (
            <>
              {/* Annual summary KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card variant="dark">
                  <CardContent className="py-4 text-center">
                    <p className="text-2xl font-display text-gold">£{annualTotals.rev.toLocaleString()}</p>
                    <p className="text-xs text-steel font-body mt-1">Total Revenue</p>
                  </CardContent>
                </Card>
                <Card variant="dark">
                  <CardContent className="py-4 text-center">
                    <p className="text-2xl font-display text-emerald-400">{annualTotals.avgOcc}%</p>
                    <p className="text-xs text-steel font-body mt-1">Avg Occupancy</p>
                  </CardContent>
                </Card>
                <Card variant="dark">
                  <CardContent className="py-4 text-center">
                    <p className="text-2xl font-display text-white">£{annualTotals.avgAdr}</p>
                    <p className="text-xs text-steel font-body mt-1">Avg ADR</p>
                  </CardContent>
                </Card>
                <Card variant="dark">
                  <CardContent className="py-4 text-center">
                    <p className="text-2xl font-display text-teal">{annualTotals.bk.toLocaleString()}</p>
                    <p className="text-xs text-steel font-body mt-1">Total Bookings</p>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue bar chart */}
              <Card variant="dark">
                <CardHeader><CardTitle className="text-white text-sm flex items-center gap-2"><TrendingUp size={16} className="text-teal" /> Monthly Revenue — {format(new Date(), 'yyyy')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1.5 h-48">
                    {annualData.map((m) => {
                      const pct = maxMonthRev > 0 ? (m.revenue / maxMonthRev * 100) : 0;
                      const isCurrent = m.month === format(new Date(), 'MMM');
                      return (
                        <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[9px] text-steel font-body">£{Math.round(m.revenue / 1000)}k</span>
                          <div className="w-full flex flex-col justify-end" style={{ height: '140px' }}>
                            <div
                              className={cn(
                                'w-full rounded-t-md transition-all',
                                isCurrent
                                  ? 'bg-gradient-to-t from-teal to-teal/60'
                                  : 'bg-gradient-to-t from-white/[0.12] to-white/[0.06]'
                              )}
                              style={{ height: `${pct}%` }}
                            />
                          </div>
                          <span className={cn(
                            'text-[10px] font-body font-semibold',
                            isCurrent ? 'text-teal' : 'text-steel'
                          )}>{m.month}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Occupancy trend */}
              <Card variant="dark">
                <CardHeader><CardTitle className="text-white text-sm">Occupancy Trend</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1.5 h-36">
                    {annualData.map((m) => {
                      const isCurrent = m.month === format(new Date(), 'MMM');
                      return (
                        <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[9px] text-steel font-body">{m.occupancy}%</span>
                          <div className="w-full flex flex-col justify-end" style={{ height: '100px' }}>
                            <div
                              className={cn(
                                'w-full rounded-t-md transition-all',
                                m.occupancy >= 85 ? 'bg-gradient-to-t from-emerald-500 to-emerald-400/60'
                                  : m.occupancy >= 60 ? 'bg-gradient-to-t from-teal to-teal/60'
                                  : 'bg-gradient-to-t from-amber-500 to-amber-400/60'
                              )}
                              style={{ height: `${m.occupancy}%` }}
                            />
                          </div>
                          <span className={cn(
                            'text-[10px] font-body font-semibold',
                            isCurrent ? 'text-teal' : 'text-steel'
                          )}>{m.month}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Full month-by-month table */}
              <Card variant="dark">
                <CardHeader><CardTitle className="text-white text-sm">Monthly Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-body">
                      <thead>
                        <tr className="text-steel border-b border-white/[0.08]">
                          <th className="text-left py-2 px-2 font-semibold">Month</th>
                          <th className="text-right py-2 px-2 font-semibold">Revenue</th>
                          <th className="text-right py-2 px-2 font-semibold">Room Rev</th>
                          <th className="text-right py-2 px-2 font-semibold">Ancillary</th>
                          <th className="text-right py-2 px-2 font-semibold">Occ %</th>
                          <th className="text-right py-2 px-2 font-semibold">ADR</th>
                          <th className="text-right py-2 px-2 font-semibold">RevPAR</th>
                          <th className="text-right py-2 px-2 font-semibold">Bookings</th>
                          <th className="text-right py-2 px-2 font-semibold">Guests</th>
                          <th className="text-right py-2 px-2 font-semibold">Avg Stay</th>
                        </tr>
                      </thead>
                      <tbody>
                        {annualData.map((m) => {
                          const isCurrent = m.month === format(new Date(), 'MMM');
                          const isPeak = m === peakMonth;
                          return (
                            <tr key={m.month} className={cn(
                              'border-b border-white/[0.04]',
                              isCurrent ? 'bg-teal/[0.06]' : 'hover:bg-white/[0.02]',
                              isPeak && !isCurrent ? 'bg-gold/[0.04]' : ''
                            )}>
                              <td className={cn('py-2.5 px-2 font-semibold', isCurrent ? 'text-teal' : 'text-silver')}>
                                {m.monthFull}
                                {isCurrent && <span className="ml-1.5 text-[9px] text-teal/60 font-normal">(current)</span>}
                                {isPeak && <span className="ml-1.5 text-[9px] text-gold font-normal">★ peak</span>}
                              </td>
                              <td className="py-2.5 px-2 text-right text-gold font-semibold">£{m.revenue.toLocaleString()}</td>
                              <td className="py-2.5 px-2 text-right text-silver">£{m.roomRevenue.toLocaleString()}</td>
                              <td className="py-2.5 px-2 text-right text-silver">£{m.ancillaryRevenue.toLocaleString()}</td>
                              <td className="py-2.5 px-2 text-right">
                                <span className={cn(
                                  'font-semibold',
                                  m.occupancy >= 85 ? 'text-emerald-400' : m.occupancy >= 60 ? 'text-silver' : 'text-amber-400'
                                )}>{m.occupancy}%</span>
                              </td>
                              <td className="py-2.5 px-2 text-right text-silver">£{m.adr}</td>
                              <td className="py-2.5 px-2 text-right text-silver">£{m.revpar}</td>
                              <td className="py-2.5 px-2 text-right text-silver">{m.bookings}</td>
                              <td className="py-2.5 px-2 text-right text-silver">{m.guests}</td>
                              <td className="py-2.5 px-2 text-right text-silver">{m.avgStay.toFixed(1)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-white/[0.1]">
                          <td className="py-2.5 px-2 text-white font-semibold">Full Year</td>
                          <td className="py-2.5 px-2 text-right text-gold font-semibold">£{annualTotals.rev.toLocaleString()}</td>
                          <td className="py-2.5 px-2 text-right text-white font-semibold">£{annualTotals.roomRev.toLocaleString()}</td>
                          <td className="py-2.5 px-2 text-right text-white font-semibold">£{annualTotals.anc.toLocaleString()}</td>
                          <td className="py-2.5 px-2 text-right text-white font-semibold">{annualTotals.avgOcc}% avg</td>
                          <td className="py-2.5 px-2 text-right text-white font-semibold">£{annualTotals.avgAdr}</td>
                          <td className="py-2.5 px-2 text-right text-white font-semibold">£{annualTotals.avgRevPar}</td>
                          <td className="py-2.5 px-2 text-right text-white font-semibold">{annualTotals.bk}</td>
                          <td className="py-2.5 px-2 text-right text-white font-semibold">{annualTotals.gu}</td>
                          <td className="py-2.5 px-2 text-right text-white font-semibold">{(annualData.reduce((s, m) => s + m.avgStay, 0) / 12).toFixed(1)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue split + peak summary */}
              <div className="grid grid-cols-2 gap-4">
                <Card variant="dark">
                  <CardHeader><CardTitle className="text-white text-sm">Revenue Split</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(() => {
                        const roomPct = annualTotals.rev > 0 ? (annualTotals.roomRev / annualTotals.rev * 100) : 0;
                        const ancPct = annualTotals.rev > 0 ? (annualTotals.anc / annualTotals.rev * 100) : 0;
                        return (
                          <>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-silver font-body">Room Revenue</span>
                                <span className="text-xs text-gold font-display">£{annualTotals.roomRev.toLocaleString()} ({roomPct.toFixed(1)}%)</span>
                              </div>
                              <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-teal to-teal/60" style={{ width: `${roomPct}%` }} />
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-silver font-body">Ancillary Revenue</span>
                                <span className="text-xs text-gold font-display">£{annualTotals.anc.toLocaleString()} ({ancPct.toFixed(1)}%)</span>
                              </div>
                              <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-gold to-gold/60" style={{ width: `${ancPct}%` }} />
                              </div>
                            </div>
                          </>
                        );
                      })()}
                      <Separator variant="dark" />
                      <div className="flex items-center justify-between py-1">
                        <span className="text-xs text-white font-body font-semibold">Total Annual Revenue</span>
                        <span className="text-lg font-display text-gold">£{annualTotals.rev.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card variant="dark">
                  <CardHeader><CardTitle className="text-white text-sm">Peak Performance</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {[
                        { l: 'Peak Month', v: peakMonth.monthFull, c: 'text-gold' },
                        { l: 'Peak Revenue', v: `£${peakMonth.revenue.toLocaleString()}`, c: 'text-gold' },
                        { l: 'Peak Occupancy', v: `${peakMonth.occupancy}%`, c: 'text-emerald-400' },
                        { l: 'Peak ADR', v: `£${peakMonth.adr}`, c: 'text-white' },
                        { l: 'Peak Bookings', v: `${peakMonth.bookings}`, c: 'text-white' },
                        { l: 'Room Inventory', v: `${(totalRooms * 365).toLocaleString()} room-nights/yr`, c: 'text-steel' },
                      ].map(item => (
                        <div key={item.l} className="flex items-center justify-between py-1.5">
                          <span className="text-xs text-steel font-body">{item.l}</span>
                          <span className={cn('text-sm font-display', item.c)}>{item.v}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
