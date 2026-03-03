import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBookings } from '@/hooks/useBookings';
import { useRooms } from '@/hooks/useRooms';
import { useAllFolios, getFolioBalance } from '@/hooks/useFolios';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Separator } from '@/components/ui/Separator';
import {
  Moon, Play, CheckCircle, Clock, AlertTriangle, Users,
  BedDouble, DollarSign, FileText, XCircle, Printer,
} from 'lucide-react';
import { format, isSameDay, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useProperty } from '@/hooks/useProperty';
import type { FolioEntry } from '@/types';

type AuditStep = {
  id: string;
  label: string;
  description: string;
  icon: typeof Moon;
  status: 'pending' | 'running' | 'done' | 'skipped';
  result?: string;
};

export function NightAuditPage() {
  const queryClient = useQueryClient();
  const { bookings, updateStatus } = useBookings();
  const { rooms, updateHousekeepingStatus } = useRooms();
  const { property } = useProperty();
  const { allEntries: folioEntries } = useAllFolios(bookings.map(b => b.id));
  const [isRunning, setIsRunning] = useState(false);
  const [auditComplete, setAuditComplete] = useState(false);
  const auditRunningRef = useRef(false);
  const [steps, setSteps] = useState<AuditStep[]>([
    { id: 'no-shows', label: 'Process No-Shows', description: 'Mark confirmed bookings that did not check in today', icon: XCircle, status: 'pending' },
    { id: 'overdue-checkout', label: 'Overdue Check-outs', description: 'Flag guests past their check-out date', icon: AlertTriangle, status: 'pending' },
    { id: 'post-charges', label: 'Post Room Charges', description: 'Apply nightly rates for all in-house guests', icon: DollarSign, status: 'pending' },
    { id: 'housekeeping', label: 'Reset Housekeeping', description: 'Set all occupied rooms to "dirty" status', icon: BedDouble, status: 'pending' },
    { id: 'report', label: 'Generate Report', description: 'Compile daily revenue and occupancy statistics', icon: FileText, status: 'pending' },
  ]);

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // Pre-audit stats
  const inHouseGuests = bookings.filter(b => b.status === 'checked_in');
  // Guests staying TONIGHT — exclude those departing today (checkout date = morning they leave)
  const guestsToCharge = inHouseGuests.filter(b => format(new Date(b.check_out), 'yyyy-MM-dd') > todayStr);
  const todayArrivals = bookings.filter(b => isSameDay(new Date(b.check_in), today) && b.status === 'confirmed');
  const overdueCheckouts = bookings.filter(b => b.status === 'checked_in' && isBefore(new Date(b.check_out), today) && !isSameDay(new Date(b.check_out), today));
  const occupiedRooms = rooms.filter(r => r.status === 'occupied');
  const sellableRooms = rooms.filter(r => r.status !== 'maintenance' && r.status !== 'blocked');
  const todayRevenue = guestsToCharge.reduce((acc, b) => acc + b.nightly_rate, 0);
  const occupancyRate = sellableRooms.length > 0 ? Math.round((occupiedRooms.length / sellableRooms.length) * 100) : 0;

  const updateStep = (id: string, update: Partial<AuditStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...update } : s));
  };

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  const runNightAudit = async () => {
    if (auditRunningRef.current) return;
    auditRunningRef.current = true;
    setIsRunning(true);
    setAuditComplete(false);

    // Reset all steps
    setSteps(prev => prev.map(s => ({ ...s, status: 'pending' as const, result: undefined })));

    // Step 1: No-shows
    updateStep('no-shows', { status: 'running' });
    await sleep(1200);
    // Only mark as no-show if it's past the cutoff time (18:00)
    const cutoffHour = 18;
    const now = new Date();
    if (now.getHours() < cutoffHour) {
      updateStep('no-shows', { status: 'done', result: `Skipped — no-show processing starts after ${cutoffHour}:00` });
    } else {
      const noShowCount = todayArrivals.length;
      todayArrivals.forEach(b => {
        updateStatus.mutate({ bookingId: b.id, status: 'no_show' });
      });
      updateStep('no-shows', { status: 'done', result: noShowCount > 0 ? `${noShowCount} booking(s) marked as no-show` : 'No no-shows today' });
    }

    // Step 2: Overdue check-outs
    updateStep('overdue-checkout', { status: 'running' });
    await sleep(1000);
    const overdueCount = overdueCheckouts.length;
    let overdueCheckedOut = 0;
    let overdueSkipped = 0;
    overdueCheckouts.forEach(b => {
      const bal = getFolioBalance(queryClient, b.id);
      if (bal > 0.01) {
        overdueSkipped++;
        return;
      }
      overdueCheckedOut++;
      updateStatus.mutate({ bookingId: b.id, status: 'checked_out' });
    });
    updateStep('overdue-checkout', { status: 'done', result: overdueCount > 0 ? `${overdueCheckedOut} guest(s) checked out${overdueSkipped > 0 ? `, ${overdueSkipped} skipped (outstanding balance)` : ''}` : 'No overdue check-outs' });

    // Step 3: Post room charges — actually add folio entries for each in-house guest staying tonight
    updateStep('post-charges', { status: 'running' });
    await sleep(1500);
    let chargedCount = 0;
    guestsToCharge.forEach(b => {
      // Double-post guard: skip if a night-audit room charge for today already exists
      const existing = folioEntries.filter(e => e.booking_id === b.id && e.category === 'room' && !e.is_voided && e.posted_by === 'Night Audit');
      const alreadyPosted = existing.some(e => e.description.includes(format(today, 'dd/MM/yyyy')));
      if (alreadyPosted) return;

      chargedCount++;
      const room = rooms.find(r => r.id === b.room_id);
      const roomLabel = room ? `Room ${room.room_number}` : 'Room charge';
      const newEntry: FolioEntry = {
        id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        booking_id: b.id,
        type: 'charge',
        category: 'room',
        description: `${roomLabel} — Night audit (${format(today, 'dd/MM/yyyy')})`,
        amount: b.nightly_rate,
        quantity: 1,
        unit_price: b.nightly_rate,
        posted_by: 'Night Audit',
        posted_at: new Date().toISOString(),
        is_voided: false,
      };
      queryClient.setQueryData<FolioEntry[]>(['folio', b.id], old => [...(old ?? []), newEntry]);
    });
    updateStep('post-charges', { status: 'done', result: chargedCount > 0 ? `£${todayRevenue.toFixed(2)} posted for ${chargedCount} room(s)` : 'Already posted — skipped' });

    // Step 4: Housekeeping reset
    updateStep('housekeeping', { status: 'running' });
    await sleep(1000);
    occupiedRooms.forEach(r => {
      updateHousekeepingStatus.mutate({ roomId: r.id, status: 'dirty' });
    });
    updateStep('housekeeping', { status: 'done', result: `${occupiedRooms.length} room(s) set to dirty` });

    // Step 5: Generate report
    updateStep('report', { status: 'running' });
    await sleep(1200);
    updateStep('report', { status: 'done', result: `Report generated — ${occupancyRate}% occupancy, £${todayRevenue.toFixed(2)} revenue` });

    setIsRunning(false);
    auditRunningRef.current = false;
    setAuditComplete(true);
    toast.success('Night audit completed successfully');
  };

  const handlePrintReport = () => {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const hotelName = property?.name ?? 'Hotel';
    const totalRooms = rooms.length;
    const availableRooms = rooms.filter(r => r.status === 'available' && r.housekeeping_status !== 'out_of_order').length;
    const maintenanceRooms = rooms.filter(r => r.status === 'maintenance').length;
    const dirtyRooms = rooms.filter(r => r.housekeeping_status === 'dirty').length;
    const cleanRooms = rooms.filter(r => r.housekeeping_status === 'clean' || r.housekeeping_status === 'inspected').length;
    const todayCheckIns = bookings.filter(b => isSameDay(new Date(b.check_in), today) && ['confirmed', 'pending', 'checked_in'].includes(b.status));
    const todayCheckOuts = bookings.filter(b => isSameDay(new Date(b.check_out), today) && b.status === 'checked_in');
    const noShows = bookings.filter(b => b.status === 'no_show' && isSameDay(new Date(b.check_in), today));
    const cancellations = bookings.filter(b => b.status === 'cancelled');
    const totalRevenueAll = folioEntries
      .filter(e => e.type === 'charge' && !e.is_voided)
      .reduce((sum, e) => sum + e.amount, 0);

    const w = window.open('', '_blank', 'width=900,height=1100');
    if (!w) { toast.error('Pop-up blocked'); return; }

    w.document.write(`<!DOCTYPE html><html><head><title>Night Audit Report — ${format(today, 'dd/MM/yyyy')}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a1a; padding: 40px; line-height: 1.5; }
      .header { text-align: center; border-bottom: 3px solid #0d9488; padding-bottom: 16px; margin-bottom: 24px; }
      .header h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
      .header h2 { font-size: 16px; font-weight: 600; color: #0d9488; margin-bottom: 4px; }
      .header p { font-size: 12px; color: #666; }
      .section { margin-bottom: 20px; }
      .section h3 { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #0d9488; border-bottom: 1px solid #e5e5e5; padding-bottom: 6px; margin-bottom: 10px; }
      .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
      .stat-card { border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px; text-align: center; }
      .stat-card .value { font-size: 24px; font-weight: 700; }
      .stat-card .label { font-size: 11px; color: #666; text-transform: uppercase; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 6px; }
      th { background: #f5f5f5; text-align: left; padding: 8px 10px; font-weight: 600; border-bottom: 2px solid #ddd; }
      td { padding: 7px 10px; border-bottom: 1px solid #eee; }
      tr:nth-child(even) td { background: #fafafa; }
      .badge { display: inline-block; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 4px; }
      .badge-green { background: #dcfce7; color: #166534; }
      .badge-red { background: #fee2e2; color: #991b1b; }
      .badge-amber { background: #fef3c7; color: #92400e; }
      .badge-blue { background: #dbeafe; color: #1e40af; }
      .footer { margin-top: 30px; padding-top: 16px; border-top: 2px solid #e5e5e5; text-align: center; font-size: 11px; color: #999; }
      .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      .step-result { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 12px; }
      .step-check { color: #16a34a; font-weight: 700; }
      @media print { body { padding: 20px; } .no-print { display: none; } }
    </style></head><body>
      <div class="header">
        <h1>${esc(hotelName)}</h1>
        <h2>Night Audit Report</h2>
        <p>${format(today, 'EEEE, MMMM d, yyyy')} — Generated at ${format(new Date(), 'HH:mm')}</p>
      </div>

      <!-- KPI Summary -->
      <div class="stats-grid">
        <div class="stat-card"><div class="value">${occupancyRate}%</div><div class="label">Occupancy</div></div>
        <div class="stat-card"><div class="value">${inHouseGuests.length}</div><div class="label">In-House Guests</div></div>
        <div class="stat-card"><div class="value">£${todayRevenue.toFixed(2)}</div><div class="label">Revenue Posted</div></div>
        <div class="stat-card"><div class="value">${overdueCheckouts.length}</div><div class="label">Overdue Check-outs</div></div>
      </div>

      <!-- Audit Steps -->
      <div class="section">
        <h3>Audit Steps Completed</h3>
        ${steps.map(s => `
          <div class="step-result">
            <span class="step-check">✓</span>
            <strong>${esc(s.label)}</strong>
            <span style="color:#666; margin-left:auto;">${esc(String(s.result ?? '—'))}</span>
          </div>
        `).join('')}
      </div>

      <div class="two-col">
        <!-- Room Inventory -->
        <div class="section">
          <h3>Room Inventory</h3>
          <table>
            <tr><td>Total Rooms</td><td style="text-align:right;font-weight:600">${totalRooms}</td></tr>
            <tr><td>Occupied</td><td style="text-align:right;font-weight:600">${occupiedRooms.length}</td></tr>
            <tr><td>Available</td><td style="text-align:right;font-weight:600">${availableRooms}</td></tr>
            <tr><td>Maintenance / OOO</td><td style="text-align:right;font-weight:600">${maintenanceRooms}</td></tr>
            <tr><td>Clean / Inspected</td><td style="text-align:right;font-weight:600">${cleanRooms}</td></tr>
            <tr><td>Dirty</td><td style="text-align:right;font-weight:600">${dirtyRooms}</td></tr>
          </table>
        </div>

        <!-- Movement Summary -->
        <div class="section">
          <h3>Movement Summary</h3>
          <table>
            <tr><td>Today's Arrivals</td><td style="text-align:right;font-weight:600">${todayCheckIns.length}</td></tr>
            <tr><td>Today's Departures</td><td style="text-align:right;font-weight:600">${todayCheckOuts.length}</td></tr>
            <tr><td>No-Shows</td><td style="text-align:right;font-weight:600">${noShows.length}</td></tr>
            <tr><td>Cancellations</td><td style="text-align:right;font-weight:600">${cancellations.length}</td></tr>
            <tr><td>Today's Room Revenue</td><td style="text-align:right;font-weight:600">£${totalRevenueAll.toFixed(2)}</td></tr>
          </table>
        </div>
      </div>

      <!-- In-House Guest List -->
      <div class="section">
        <h3>In-House Guest List (${inHouseGuests.length})</h3>
        ${inHouseGuests.length === 0 ? '<p style="font-size:12px;color:#999;">No in-house guests</p>' : `
          <table>
            <thead><tr><th>Guest</th><th>Room</th><th>Check-in</th><th>Check-out</th><th>Nights</th><th style="text-align:right">Rate</th></tr></thead>
            <tbody>
              ${inHouseGuests.map(b => {
                const room = rooms.find(r => r.id === b.room_id);
                const n = Math.ceil((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000);
                return `<tr>
                  <td>${esc((b.guest?.first_name ?? '') + ' ' + (b.guest?.last_name ?? ''))}</td>
                  <td>${room ? room.room_number : 'Unassigned'}</td>
                  <td>${format(new Date(b.check_in), 'dd/MM')}</td>
                  <td>${format(new Date(b.check_out), 'dd/MM')}</td>
                  <td>${n}</td>
                  <td style="text-align:right">£${b.nightly_rate.toFixed(2)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        `}
      </div>

      <div class="footer">
        <p>${esc(hotelName)} — Night Audit Report — ${format(today, 'dd/MM/yyyy')}</p>
        <p>This report was automatically generated by the Arrivé PMS</p>
      </div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display text-white mb-1.5 tracking-tight flex items-center gap-2">
            <Moon size={24} className="text-teal" />
            Night Audit
          </h1>
          <p className="text-sm text-steel font-body">
            End-of-day processing — {format(today, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {auditComplete && (
            <Button
              variant="outline-dark"
              onClick={handlePrintReport}
            >
              <Printer size={16} className="mr-2" /> Print Report
            </Button>
          )}
          <Button
            onClick={runNightAudit}
            disabled={isRunning}
            className={cn(isRunning && 'animate-pulse')}
          >
            {isRunning ? (
              <><Clock size={16} className="mr-2 animate-spin" /> Running…</>
            ) : auditComplete ? (
              <><CheckCircle size={16} className="mr-2" /> Run Again</>
            ) : (
              <><Play size={16} className="mr-2" /> Run Night Audit</>
            )}
          </Button>
        </div>
      </div>

      {/* Pre-Audit Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card variant="dark">
          <CardContent className="py-4 text-center">
            <Users size={20} className="text-teal mx-auto mb-2" />
            <p className="text-2xl font-display text-white">{inHouseGuests.length}</p>
            <p className="text-xs text-steel font-body">In-House Guests</p>
          </CardContent>
        </Card>
        <Card variant="dark">
          <CardContent className="py-4 text-center">
            <BedDouble size={20} className="text-gold mx-auto mb-2" />
            <p className="text-2xl font-display text-white">{occupancyRate}%</p>
            <p className="text-xs text-steel font-body">Occupancy</p>
          </CardContent>
        </Card>
        <Card variant="dark">
          <CardContent className="py-4 text-center">
            <DollarSign size={20} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-2xl font-display text-white">£{todayRevenue.toFixed(0)}</p>
            <p className="text-xs text-steel font-body">Today&apos;s Revenue</p>
          </CardContent>
        </Card>
        <Card variant="dark">
          <CardContent className="py-4 text-center">
            <AlertTriangle size={20} className={cn('mx-auto mb-2', overdueCheckouts.length > 0 ? 'text-amber-400' : 'text-steel')} />
            <p className="text-2xl font-display text-white">{overdueCheckouts.length}</p>
            <p className="text-xs text-steel font-body">Overdue Check-outs</p>
          </CardContent>
        </Card>
      </div>

      {/* Audit Steps */}
      <Card variant="dark" className="mb-6">
        <CardHeader>
          <CardTitle className="text-white text-base">Audit Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {steps.map((step, i) => (
              <div key={step.id}>
                <div className="flex items-center gap-4 py-3">
                  {/* Step Number / Status Icon */}
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-all',
                    step.status === 'done' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                    step.status === 'running' ? 'bg-teal/10 border-teal/30 text-teal animate-pulse' :
                    'bg-white/[0.04] border-white/[0.08] text-steel'
                  )}>
                    {step.status === 'done' ? <CheckCircle size={16} /> :
                     step.status === 'running' ? <Clock size={16} className="animate-spin" /> :
                     <step.icon size={16} />}
                  </div>

                  {/* Step Info */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-body font-medium',
                      step.status === 'done' ? 'text-emerald-400' :
                      step.status === 'running' ? 'text-white' :
                      'text-silver'
                    )}>
                      {step.label}
                    </p>
                    <p className="text-xs text-steel font-body">{step.description}</p>
                  </div>

                  {/* Result */}
                  {step.result && (
                    <p className="text-xs text-silver/80 font-body text-right max-w-[250px]">{step.result}</p>
                  )}

                  {/* Status Badge */}
                  <span className={cn(
                    'text-[10px] font-body font-semibold px-2 py-1 rounded-full border shrink-0',
                    step.status === 'done' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' :
                    step.status === 'running' ? 'text-teal bg-teal/10 border-teal/20' :
                    'text-steel bg-white/[0.03] border-white/[0.06]'
                  )}>
                    {step.status === 'done' ? 'Complete' : step.status === 'running' ? 'Running' : 'Pending'}
                  </span>
                </div>
                {i < steps.length - 1 && <Separator variant="dark" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Completion Summary */}
      {auditComplete && (
        <Card variant="dark" className="animate-in slide-in-from-bottom-3 duration-300 border-emerald-500/20">
          <CardContent className="py-6 text-center">
            <CheckCircle size={32} className="text-emerald-400 mx-auto mb-3" />
            <h3 className="text-lg font-display text-white mb-1">Night Audit Complete</h3>
            <p className="text-sm text-steel font-body mb-4">
              All steps processed for {format(today, 'EEEE, MMMM d, yyyy')}
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-5">
              <div>
                <p className="text-lg font-display text-white">{guestsToCharge.length}</p>
                <p className="text-[11px] text-steel font-body">Rooms Charged</p>
              </div>
              <div>
                <p className="text-lg font-display text-white">£{todayRevenue.toFixed(0)}</p>
                <p className="text-[11px] text-steel font-body">Revenue Posted</p>
              </div>
              <div>
                <p className="text-lg font-display text-white">{occupancyRate}%</p>
                <p className="text-[11px] text-steel font-body">Occupancy</p>
              </div>
            </div>
            <button
              onClick={handlePrintReport}
              className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg text-xs font-body font-semibold bg-teal/10 border border-teal/20 text-teal hover:bg-teal/20 transition-all"
            >
              <Printer size={14} />
              Print Night Audit Report
            </button>
          </CardContent>
        </Card>
      )}

      {/* Pre-audit detail: Today's in-house guests */}
      <Card variant="dark" className="mt-6">
        <CardHeader>
          <CardTitle className="text-white text-base">In-House Guests</CardTitle>
        </CardHeader>
        <CardContent>
          {inHouseGuests.length === 0 ? (
            <p className="text-sm text-steel font-body text-center py-4">No in-house guests</p>
          ) : (
            <div className="space-y-2">
              {inHouseGuests.map(b => {
                const room = rooms.find(r => r.id === b.room_id);
                return (
                  <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-gold font-display text-xs">
                      {b.guest?.first_name[0]}{b.guest?.last_name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white font-body">{b.guest?.first_name} {b.guest?.last_name}</p>
                      <p className="text-xs text-steel font-body">
                        {room ? `Room ${room.room_number}` : 'Unassigned'} · Check-out: {format(new Date(b.check_out), 'MMM d')}
                      </p>
                    </div>
                    <p className="text-sm text-gold font-body">£{b.nightly_rate}/night</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
