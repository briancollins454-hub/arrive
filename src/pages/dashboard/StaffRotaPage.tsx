import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Clock, Plus, Users, CalendarDays,
  Copy, Trash2, UserCircle, Sun, Moon, Sunrise, Coffee,
  Download, AlertTriangle, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  format, addDays, startOfWeek, isSameDay, subWeeks,
} from 'date-fns';
import type { StaffRole } from '@/types';
import { exportCSV } from '@/lib/exportUtils';
import { ROLE_DEFINITIONS, getRoleLabel } from '@/lib/roles';
import { DashboardDatePicker, getPresetRange } from '@/components/shared/DashboardDatePicker';
import type { DateRange } from '@/components/shared/DashboardDatePicker';

// ── Shift definitions ────────────────────────────────────────────
type ShiftType = 'morning' | 'afternoon' | 'night' | 'day_off' | 'holiday';

interface ShiftDef {
  id: ShiftType;
  label: string;
  shortLabel: string;
  hours: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof Sun;
  durationHours: number;
}

const SHIFTS: ShiftDef[] = [
  { id: 'morning', label: 'Morning', shortLabel: 'AM', hours: '06:00–14:00', color: 'text-amber-400', bgColor: 'bg-amber-500/15', borderColor: 'border-amber-500/20', icon: Sunrise, durationHours: 8 },
  { id: 'afternoon', label: 'Afternoon', shortLabel: 'PM', hours: '14:00–22:00', color: 'text-blue-400', bgColor: 'bg-blue-500/15', borderColor: 'border-blue-500/20', icon: Sun, durationHours: 8 },
  { id: 'night', label: 'Night', shortLabel: 'NT', hours: '22:00–06:00', color: 'text-purple-400', bgColor: 'bg-purple-500/15', borderColor: 'border-purple-500/20', icon: Moon, durationHours: 8 },
  { id: 'day_off', label: 'Day Off', shortLabel: 'OFF', hours: '—', color: 'text-steel', bgColor: 'bg-white/[0.03]', borderColor: 'border-white/[0.04]', icon: Coffee, durationHours: 0 },
  { id: 'holiday', label: 'Holiday', shortLabel: 'HOL', hours: '—', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/15', icon: CalendarDays, durationHours: 0 },
];

const SHIFT_MAP = Object.fromEntries(SHIFTS.map(s => [s.id, s]));

// ── Demo staff ───────────────────────────────────────────────────
interface StaffWithShifts {
  id: string;
  name: string;
  role: StaffRole;
  email: string;
  contractHours: number;
  shifts: Record<string, ShiftType>; // date string → shift type
}

function generateDemoStaff(): StaffWithShifts[] {
  const staff: StaffWithShifts[] = [
    { id: 's1', name: 'Sophie Williams', role: 'general_manager', email: 'sophie@hotel.com', contractHours: 40, shifts: {} },
    { id: 's2', name: 'James Henderson', role: 'receptionist', email: 'james@hotel.com', contractHours: 40, shifts: {} },
    { id: 's3', name: 'Priya Patel', role: 'receptionist', email: 'priya@hotel.com', contractHours: 32, shifts: {} },
    { id: 's4', name: 'Tom O\'Brien', role: 'front_office_manager', email: 'tom@hotel.com', contractHours: 40, shifts: {} },
    { id: 's5', name: 'Maria Santos', role: 'housekeeping', email: 'maria@hotel.com', contractHours: 35, shifts: {} },
    { id: 's6', name: 'Ewa Kowalska', role: 'housekeeping', email: 'ewa@hotel.com', contractHours: 35, shifts: {} },
    { id: 's7', name: 'David Chen', role: 'housekeeping_manager', email: 'david@hotel.com', contractHours: 24, shifts: {} },
    { id: 's8', name: 'Alex Morgan', role: 'night_auditor', email: 'alex@hotel.com', contractHours: 40, shifts: {} },
  ];

  // Auto-generate shifts for ±2 weeks
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const rangeStart = subWeeks(weekStart, 1);

  for (const member of staff) {
    for (let d = 0; d < 28; d++) {
      const date = addDays(rangeStart, d);
      const key = format(date, 'yyyy-MM-dd');
      const dow = date.getDay();
      const hash = (member.id.charCodeAt(1) * 7 + d * 13) % 20;

      if (dow === 0 || (dow === 6 && hash < 6)) {
        member.shifts[key] = 'day_off';
      } else if (hash === 0) {
        member.shifts[key] = 'holiday';
      } else if (member.role === 'housekeeping' || member.role === 'housekeeping_manager') {
        member.shifts[key] = 'morning';
      } else if (member.role === 'general_manager' || member.role === 'front_office_manager' || member.role === 'revenue_manager') {
        member.shifts[key] = hash % 3 === 0 ? 'afternoon' : 'morning';
      } else {
        // Receptionist rotation
        const rotation: ShiftType[] = ['morning', 'afternoon', 'night'];
        member.shifts[key] = rotation[(d + member.id.charCodeAt(1)) % 3] as ShiftType;
      }
    }
  }

  return staff;
}

const ROLE_COLORS: Record<StaffRole, { bg: string; text: string; border: string }> = {
  owner: { bg: 'bg-gold/15', text: 'text-gold', border: 'border-gold/20' },
  general_manager: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/20' },
  front_office_manager: { bg: 'bg-teal/15', text: 'text-teal', border: 'border-teal/20' },
  receptionist: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/20' },
  concierge: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/20' },
  revenue_manager: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  housekeeping_manager: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  housekeeping: { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/20' },
  maintenance: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/20' },
  night_auditor: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  finance: { bg: 'bg-lime-500/15', text: 'text-lime-400', border: 'border-lime-500/20' },
  readonly: { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/20' },
};

export function StaffRotaPage() {
  const [staff, setStaff] = useState<StaffWithShifts[]>(() => generateDemoStaff());
  const [editingCell, setEditingCell] = useState<{ staffId: string; dateKey: string } | null>(null);
  const [roleFilter, setRoleFilter] = useState<StaffRole | 'all'>('all');
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<StaffRole>('receptionist');
  const [dateRange, setDateRange] = useState<DateRange>(getPresetRange('week'));

  const weekStart = useMemo(() => {
    return startOfWeek(dateRange.start, { weekStartsOn: 1 });
  }, [dateRange]);

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
  [weekStart]);

  const today = new Date();

  const filteredStaff = useMemo(() =>
    roleFilter === 'all' ? staff : staff.filter(s => s.role === roleFilter),
  [staff, roleFilter]);

  // ── Shift assignment ──────────────────────────────────────────
  const assignShift = useCallback((staffId: string, dateKey: string, shift: ShiftType) => {
    setStaff(prev => prev.map(s => {
      if (s.id !== staffId) return s;
      return { ...s, shifts: { ...s.shifts, [dateKey]: shift } };
    }));
    setEditingCell(null);
  }, []);

  const clearShift = useCallback((staffId: string, dateKey: string) => {
    setStaff(prev => prev.map(s => {
      if (s.id !== staffId) return s;
      const { [dateKey]: _, ...rest } = s.shifts;
      return { ...s, shifts: rest };
    }));
    setEditingCell(null);
  }, []);

  // ── Copy previous week ────────────────────────────────────────
  const copyPrevWeek = useCallback(() => {
    const prevWeekStart = subWeeks(weekStart, 1);
    setStaff(prev => prev.map(s => {
      const newShifts = { ...s.shifts };
      for (let i = 0; i < 7; i++) {
        const prevKey = format(addDays(prevWeekStart, i), 'yyyy-MM-dd');
        const currKey = format(addDays(weekStart, i), 'yyyy-MM-dd');
        if (s.shifts[prevKey]) {
          newShifts[currKey] = s.shifts[prevKey];
        }
      }
      return { ...s, shifts: newShifts };
    }));
  }, [weekStart]);

  // ── Week stats ────────────────────────────────────────────────
  const weekStats = useMemo(() => {
    const staffHours = filteredStaff.map(s => {
      let hours = 0;
      for (const d of weekDays) {
        const key = format(d, 'yyyy-MM-dd');
        const shift = s.shifts[key];
        if (shift) hours += SHIFT_MAP[shift]?.durationHours ?? 0;
      }
      return { ...s, weekHours: hours, overUnder: hours - s.contractHours };
    });

    const coverageByDay = weekDays.map(d => {
      const key = format(d, 'yyyy-MM-dd');
      const onDuty = staff.filter(s => {
        const shift = s.shifts[key];
        return shift && shift !== 'day_off' && shift !== 'holiday';
      });
      return { date: d, count: onDuty.length, roles: onDuty.map(s => s.role) };
    });

    const gaps = coverageByDay.filter(c => {
      const hasReceptionist = c.roles.includes('receptionist');
      const hasHK = c.roles.includes('housekeeping');
      return !hasReceptionist || !hasHK || c.count < 3;
    });

    return { staffHours, coverageByDay, gaps };
  }, [filteredStaff, weekDays, staff]);

  // ── Add staff ─────────────────────────────────────────────────
  const handleAddStaff = () => {
    if (!newName.trim()) return;
    const id = `s${Date.now()}`;
    setStaff(prev => [...prev, {
      id, name: newName.trim(), role: newRole,
      email: `${newName.trim().toLowerCase().replace(/\s+/g, '.')}@hotel.com`,
      contractHours: 40, shifts: {},
    }]);
    setNewName('');
    setShowAddStaff(false);
  };

  const removeStaff = (id: string) => {
    if (!window.confirm('Remove this staff member from the rota?')) return;
    setStaff(prev => prev.filter(s => s.id !== id));
  };

  // ── Export ─────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = filteredStaff.flatMap(s =>
      weekDays.map(d => ({
        Staff: s.name,
        Role: s.role,
        Date: format(d, 'yyyy-MM-dd'),
        Day: format(d, 'EEE'),
        Shift: s.shifts[format(d, 'yyyy-MM-dd')] ?? 'unassigned',
        Hours: SHIFT_MAP[s.shifts[format(d, 'yyyy-MM-dd')] as ShiftType]?.durationHours ?? 0,
      }))
    );
    exportCSV(rows, `staff-rota-${format(weekStart, 'yyyy-MM-dd')}`);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Staff Rota</h1>
          <p className="text-sm text-steel font-body tracking-wide mt-1">
            Week of {format(weekStart, 'd MMM')} — {format(addDays(weekStart, 6), 'd MMM yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Week navigation */}
          <DashboardDatePicker
            value={dateRange}
            onChange={setDateRange}
            presets={['week']}
          />

          {/* Role filter */}
          <div className="flex flex-wrap gap-1 glass-panel rounded-xl p-1">
            {(['all', ...(Object.keys(ROLE_DEFINITIONS) as StaffRole[])] as const).map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(r as StaffRole | 'all')}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg text-[11px] font-body font-medium transition-all duration-200',
                  roleFilter === r ? 'bg-teal/15 text-teal' : 'text-steel hover:text-silver hover:bg-white/[0.04]'
                )}
              >
                {r === 'all' ? 'All Roles' : getRoleLabel(r as StaffRole)}
              </button>
            ))}
          </div>

          <Button variant="outline-dark" size="sm" onClick={copyPrevWeek} title="Copy last week's rota">
            <Copy size={14} className="mr-1" /> Copy Week
          </Button>
          <Button variant="outline-dark" size="sm" onClick={handleExport}>
            <Download size={14} className="mr-1" /> Export
          </Button>
          <Button size="sm" onClick={() => setShowAddStaff(true)}>
            <Plus size={14} className="mr-1" /> Add Staff
          </Button>
        </div>
      </div>

      {/* Shift Legend */}
      <div className="flex items-center gap-3 text-xs flex-wrap">
        {SHIFTS.map(s => (
          <span key={s.id} className={cn('flex items-center gap-1.5 px-2 py-1 rounded-lg border', s.bgColor, s.borderColor)}>
            <s.icon size={11} className={s.color} />
            <span className={s.color}>{s.label}</span>
            <span className="text-steel">{s.hours}</span>
          </span>
        ))}
      </div>

      {/* Coverage warnings */}
      {weekStats.gaps.length > 0 && (
        <div className="glass-panel rounded-xl p-4 border-amber-500/20 bg-amber-500/[0.03] flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">Coverage gaps detected</p>
            <p className="text-xs text-steel mt-0.5">
              {weekStats.gaps.map(g => format(g.date, 'EEE d')).join(', ')} — insufficient staffing or missing role coverage
            </p>
          </div>
        </div>
      )}

      {/* ── Main Rota Grid ───────────────────────────────────────── */}
      <div className="glass-panel rounded-xl">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full border-collapse" style={{ minWidth: '900px' }}>
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-midnight/95 backdrop-blur border-b border-r border-white/[0.06] px-4 py-3 text-left text-xs font-medium text-silver w-52 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <Users size={14} />
                    Staff Member
                  </div>
                </th>
                {weekDays.map(d => {
                  const isToday = isSameDay(d, today);
                  const isSun = d.getDay() === 0;
                  const isSat = d.getDay() === 6;
                  const coverage = weekStats.coverageByDay.find(c => isSameDay(c.date, d));
                  const isGap = weekStats.gaps.some(g => isSameDay(g.date, d));
                  return (
                    <th
                      key={format(d, 'yyyy-MM-dd')}
                      className={cn(
                        'border-b border-r border-white/[0.06] px-2 py-3 text-center min-w-[100px]',
                        isToday ? 'bg-teal/[0.06]' : (isSat || isSun) ? 'bg-white/[0.02]' : ''
                      )}
                    >
                      <div className={cn('text-[10px] uppercase font-medium', isToday ? 'text-teal' : 'text-steel')}>
                        {format(d, 'EEE')}
                      </div>
                      <div className={cn('text-sm font-semibold', isToday ? 'text-teal' : 'text-white')}>
                        {format(d, 'd MMM')}
                      </div>
                      <div className={cn(
                        'text-[9px] mt-0.5',
                        isGap ? 'text-amber-400' : 'text-steel'
                      )}>
                        {coverage?.count ?? 0} on duty
                      </div>
                    </th>
                  );
                })}
                <th className="border-b border-white/[0.06] px-3 py-3 text-center text-xs font-medium text-silver min-w-[80px]">
                  <div className="flex items-center justify-center gap-1">
                    <Clock size={12} />
                    Hours
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {weekStats.staffHours.filter(s =>
                roleFilter === 'all' || s.role === roleFilter
              ).map(member => {
                const roleColor = ROLE_COLORS[member.role];
                return (
                  <tr key={member.id} className="group hover:bg-white/[0.02]">
                    {/* Staff name */}
                    <td className="sticky left-0 z-10 bg-midnight/95 backdrop-blur border-b border-r border-white/[0.06] px-4 py-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/[0.08] to-white/[0.03] flex items-center justify-center text-[10px] font-bold text-silver border border-white/[0.06]">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-white truncate">{member.name}</div>
                          <Badge variant="outline" className={cn('text-[9px] mt-0.5', roleColor.bg, roleColor.text, roleColor.border)}>
                            {getRoleLabel(member.role)}
                          </Badge>
                        </div>
                        <button
                          onClick={() => removeStaff(member.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-steel hover:text-red-400 transition-all"
                          title="Remove staff"
                          aria-label="Remove staff member"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>

                    {/* Day cells */}
                    {weekDays.map(d => {
                      const key = format(d, 'yyyy-MM-dd');
                      const shift = member.shifts[key];
                      const shiftDef = shift ? SHIFT_MAP[shift] : null;
                      const isEditing = editingCell?.staffId === member.id && editingCell?.dateKey === key;
                      const isToday = isSameDay(d, today);

                      return (
                        <td
                          key={key}
                          className={cn(
                            'border-b border-r border-white/[0.06] p-1 text-center relative',
                            isToday && 'bg-teal/[0.03]'
                          )}
                        >
                          {isEditing ? (
                            <>
                              {/* Click-outside backdrop */}
                              <div className="fixed inset-0 z-40" onClick={() => setEditingCell(null)} />
                              <div className="absolute left-1/2 top-full -translate-x-1/2 z-50 bg-midnight border border-white/[0.12] rounded-lg shadow-2xl shadow-black/60 p-1.5 flex flex-col gap-1 min-w-[80px] w-max">
                                {SHIFTS.map(s => (
                                  <button
                                    key={s.id}
                                    onClick={() => assignShift(member.id, key, s.id)}
                                    className={cn(
                                      'text-[10px] font-medium py-1.5 px-2 rounded border transition-all flex items-center gap-1.5',
                                      s.bgColor, s.borderColor, s.color,
                                      'hover:opacity-80'
                                    )}
                                  >
                                    <s.icon size={11} />
                                    {s.shortLabel}
                                  </button>
                                ))}
                                <button
                                  onClick={() => { clearShift(member.id, key); }}
                                  className="text-[10px] font-medium py-1.5 px-2 rounded border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center gap-1.5"
                                >
                                  <X size={11} />
                                  Clear
                                </button>
                              </div>
                            </>
                          ) : null}

                          <button
                            onClick={() => setEditingCell({ staffId: member.id, dateKey: key })}
                            className={cn(
                              'w-full py-2 rounded-lg border transition-all duration-200',
                              shiftDef
                                ? cn(shiftDef.bgColor, shiftDef.borderColor, 'hover:opacity-80')
                                : 'border-dashed border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.02]'
                            )}
                            title={shiftDef ? `${shiftDef.label} (${shiftDef.hours})` : 'Click to assign shift'}
                          >
                            {shiftDef ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <shiftDef.icon size={12} className={shiftDef.color} />
                                <span className={cn('text-[10px] font-semibold', shiftDef.color)}>{shiftDef.shortLabel}</span>
                              </div>
                            ) : (
                              <Plus size={12} className="text-steel/30 mx-auto" />
                            )}
                          </button>
                        </td>
                      );
                    })}

                    {/* Hours total */}
                    <td className="border-b border-white/[0.06] px-3 py-2 text-center">
                      <div className={cn(
                        'text-sm font-bold',
                        member.overUnder > 0 ? 'text-amber-400' :
                        member.overUnder < 0 ? 'text-red-400' :
                        'text-emerald-400'
                      )}>
                        {member.weekHours}h
                      </div>
                      <div className={cn(
                        'text-[9px]',
                        member.overUnder > 0 ? 'text-amber-400' :
                        member.overUnder < 0 ? 'text-red-400' :
                        'text-steel'
                      )}>
                        {member.overUnder === 0 ? 'On target' :
                         member.overUnder > 0 ? `+${member.overUnder}h over` :
                         `${member.overUnder}h under`}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Weekly Summary ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(() => {
          const totalHours = weekStats.staffHours.reduce((s, m) => s + m.weekHours, 0);
          const totalContract = weekStats.staffHours.reduce((s, m) => s + m.contractHours, 0);
          const overStaff = weekStats.staffHours.filter(m => m.overUnder > 0).length;
          const underStaff = weekStats.staffHours.filter(m => m.overUnder < 0).length;
          return [
            { label: 'Total Hours', value: `${totalHours}h`, sub: `of ${totalContract}h contracted`, icon: Clock, accent: 'text-teal' },
            { label: 'Staff Count', value: filteredStaff.length, sub: `${staff.length} total`, icon: Users, accent: 'text-blue-400' },
            { label: 'Over Hours', value: overStaff, sub: 'staff over contracted', icon: AlertTriangle, accent: 'text-amber-400' },
            { label: 'Under Hours', value: underStaff, sub: 'staff under contracted', icon: AlertTriangle, accent: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="glass-panel rounded-xl p-5 text-center">
              <s.icon size={18} className={cn(s.accent, 'mx-auto mb-2')} />
              <div className="text-xl font-bold text-white font-display">{s.value}</div>
              <div className="text-xs text-silver">{s.label}</div>
              <div className="text-[10px] text-steel mt-0.5">{s.sub}</div>
            </div>
          ));
        })()}
      </div>

      {/* ── Add Staff Dialog ─────────────────────────────────────── */}
      {showAddStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAddStaff(false)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm rounded-2xl bg-[#0f1724] border border-white/[0.1] shadow-2xl p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal/15 flex items-center justify-center">
                <UserCircle size={20} className="text-teal" />
              </div>
              <div>
                <h3 className="text-base font-display font-semibold text-white">Add Staff Member</h3>
                <p className="text-xs text-steel">Add to the weekly rota</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-silver font-body mb-1 block">Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Sarah Johnson"
                  className="input-dark w-full px-3 py-2 rounded-xl text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-silver font-body mb-1 block">Role</label>
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(ROLE_DEFINITIONS) as StaffRole[]).filter(r => r !== 'owner' && r !== 'readonly').map(r => (
                    <button
                      key={r}
                      onClick={() => setNewRole(r)}
                      className={cn(
                        'px-3 py-2 rounded-xl text-xs font-body font-medium border transition-all',
                        newRole === r
                          ? cn(ROLE_COLORS[r].bg, ROLE_COLORS[r].text, ROLE_COLORS[r].border)
                          : 'border-white/[0.06] text-steel hover:bg-white/[0.04]'
                      )}
                    >
                      {getRoleLabel(r)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowAddStaff(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-body text-steel border border-white/[0.08] hover:bg-white/[0.04] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStaff}
                disabled={!newName.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-body font-semibold text-charcoal bg-teal hover:bg-teal/80 transition-all disabled:opacity-50"
              >
                Add Staff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
