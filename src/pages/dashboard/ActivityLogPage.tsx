import { useState } from 'react';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { PageSpinner } from '@/components/shared/LoadingSpinner';
import {
  LogIn, LogOut, BookOpen, Users, BedDouble, SprayCan,
  CreditCard, Banknote, Moon, Settings, MessageSquare,
  PoundSterling, AlertTriangle, Clock, Filter, Search,
  ChevronDown, ChevronRight, User, Download,
} from 'lucide-react';
import { exportCSV } from '@/lib/exportUtils';
import { format, isToday, isYesterday, startOfDay } from 'date-fns';
import type { ActivityAction, ActivityLogEntry } from '@/types';

// ============================================================
// Icon mapping
// ============================================================

const actionIcons: Record<ActivityAction, React.ElementType> = {
  booking_created: BookOpen,
  booking_confirmed: BookOpen,
  booking_modified: BookOpen,
  booking_cancelled: AlertTriangle,
  booking_checked_in: LogIn,
  booking_checked_out: LogOut,
  booking_no_show: AlertTriangle,
  room_assigned: BedDouble,
  room_upgraded: BedDouble,
  room_status_changed: BedDouble,
  housekeeping_updated: SprayCan,
  folio_charge_posted: CreditCard,
  folio_payment_received: Banknote,
  folio_refund_issued: Banknote,
  folio_entry_voided: AlertTriangle,
  guest_created: Users,
  guest_updated: Users,
  rate_created: PoundSterling,
  rate_updated: PoundSterling,
  rate_deleted: PoundSterling,
  night_audit_run: Moon,
  message_sent: MessageSquare,
  settings_updated: Settings,
  staff_login: User,
  staff_logout: User,
};

const actionColors: Record<string, string> = {
  booking_created: 'text-blue-400 bg-blue-400/10',
  booking_confirmed: 'text-emerald-400 bg-emerald-400/10',
  booking_modified: 'text-amber-400 bg-amber-400/10',
  booking_cancelled: 'text-rose-400 bg-rose-400/10',
  booking_checked_in: 'text-teal bg-teal/10',
  booking_checked_out: 'text-orange-400 bg-orange-400/10',
  booking_no_show: 'text-rose-400 bg-rose-400/10',
  room_assigned: 'text-violet-400 bg-violet-400/10',
  room_upgraded: 'text-purple-400 bg-purple-400/10',
  room_status_changed: 'text-sky-400 bg-sky-400/10',
  housekeeping_updated: 'text-cyan-400 bg-cyan-400/10',
  folio_charge_posted: 'text-gold bg-gold/10',
  folio_payment_received: 'text-emerald-400 bg-emerald-400/10',
  folio_entry_voided: 'text-rose-400 bg-rose-400/10',
  guest_created: 'text-blue-400 bg-blue-400/10',
  guest_updated: 'text-blue-400 bg-blue-400/10',
  rate_created: 'text-gold bg-gold/10',
  rate_updated: 'text-gold bg-gold/10',
  rate_deleted: 'text-rose-400 bg-rose-400/10',
  night_audit_run: 'text-indigo-400 bg-indigo-400/10',
  message_sent: 'text-teal bg-teal/10',
  settings_updated: 'text-steel bg-white/[0.05]',
  staff_login: 'text-emerald-400 bg-emerald-400/10',
  staff_logout: 'text-steel bg-white/[0.05]',
};

const entityTypeLabels: Record<string, string> = {
  booking: 'Bookings',
  room: 'Rooms',
  guest: 'Guests',
  folio: 'Billing',
  system: 'System',
  staff: 'Staff',
  rate: 'Rates',
};

// ============================================================
// Component
// ============================================================

export function ActivityLogPage() {
  const { entries, isLoading } = useActivityLog();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set(['today', 'yesterday']));

  if (isLoading) return <PageSpinner />;

  // Filter
  const filtered = entries.filter((e) => {
    if (filterEntity !== 'all' && e.entity_type !== filterEntity) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        e.description.toLowerCase().includes(q) ||
        e.performed_by.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Group by date
  const grouped: { label: string; key: string; entries: ActivityLogEntry[] }[] = [];
  const dateMap = new Map<string, ActivityLogEntry[]>();

  for (const entry of filtered) {
    const d = startOfDay(new Date(entry.created_at));
    const key = d.toISOString();
    if (!dateMap.has(key)) dateMap.set(key, []);
    dateMap.get(key)!.push(entry);
  }

  for (const [key, dayEntries] of dateMap) {
    const d = new Date(key);
    let label: string;
    if (isToday(d)) label = 'Today';
    else if (isYesterday(d)) label = 'Yesterday';
    else label = format(d, 'EEEE, d MMMM yyyy');

    const groupKey = isToday(d) ? 'today' : isYesterday(d) ? 'yesterday' : key;
    grouped.push({ label, key: groupKey, entries: dayEntries });
  }

  const toggleDate = (key: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleEntryClick = (entry: ActivityLogEntry) => {
    if (entry.entity_type === 'booking' && entry.entity_id) {
      navigate(`/dashboard/bookings/${entry.entity_id}`);
    } else if (entry.entity_type === 'room') {
      navigate('/dashboard/rooms');
    } else if (entry.entity_type === 'guest') {
      navigate('/dashboard/guests');
    } else if (entry.entity_type === 'folio' && entry.entity_id) {
      navigate(`/dashboard/bookings/${entry.entity_id}`);
    } else if (entry.entity_type === 'rate') {
      navigate('/dashboard/rates');
    }
  };

  // Entity type counts for filter badges
  const entityCounts = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.entity_type] = (acc[e.entity_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-white mb-1.5 tracking-tight">Activity Log</h1>
          <p className="text-sm text-steel font-body">
            Full audit trail of all actions across the property
          </p>
        </div>
        <button
          onClick={() => {
            const rows = filtered.map(e => ({
              'Date': format(new Date(e.created_at), 'dd/MM/yyyy HH:mm'),
              'Action': e.action.replace(/_/g, ' '),
              'User': e.performed_by ?? '',
              'Details': e.description ?? '',
              'Entity Type': e.entity_type ?? '',
              'Entity ID': e.entity_id ?? '',
            }));
            exportCSV(rows, `activity-log-${format(new Date(), 'yyyy-MM-dd')}`);
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-body font-medium text-steel border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:text-white transition-all"
        >
          <Download size={14} /> Export
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel" />
          <input
            type="text"
            placeholder="Search log..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-dark w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-charcoal border border-white/[0.06] placeholder:text-white/20 placeholder:italic"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-steel" />
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="input-dark text-sm py-1.5 px-3 rounded-xl bg-charcoal border border-white/[0.06]"
          >
            <option value="all">All Categories</option>
            {Object.entries(entityTypeLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label} ({entityCounts[key] || 0})
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-steel font-body ml-auto">
          {filtered.length} event{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Timeline */}
      {grouped.length === 0 ? (
        <Card variant="dark">
          <CardContent className="p-12 text-center">
            <Clock size={40} className="mx-auto mb-3 text-steel/30" />
            <p className="text-white font-display mb-1">No activity found</p>
            <p className="text-sm text-steel font-body">Try adjusting your search or filter criteria</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ label, key, entries: dayEntries }) => {
            const isExpanded = expandedDates.has(key);
            return (
              <Card key={key} variant="dark">
                <CardContent className="p-0">
                  {/* Date header */}
                  <button
                    onClick={() => toggleDate(key)}
                    className="w-full flex items-center gap-2 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                  >
                    {isExpanded ? <ChevronDown size={14} className="text-steel" /> : <ChevronRight size={14} className="text-steel" />}
                    <span className="text-sm font-display text-white">{label}</span>
                    <span className="text-xs text-steel font-body">
                      {dayEntries.length} event{dayEntries.length !== 1 ? 's' : ''}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-white/[0.04]">
                      {dayEntries.map((entry, idx) => {
                        const Icon = actionIcons[entry.action] || Clock;
                        const colorClass = actionColors[entry.action] || 'text-steel bg-white/[0.03]';
                        const isClickable = ['booking', 'room', 'guest', 'folio', 'rate'].includes(entry.entity_type);

                        return (
                          <div
                            key={entry.id}
                            className={`flex items-start gap-3 px-4 py-3 ${idx > 0 ? 'border-t border-white/[0.03]' : ''} ${isClickable ? 'cursor-pointer hover:bg-white/[0.02]' : ''} transition-colors`}
                            onClick={() => isClickable && handleEntryClick(entry)}
                          >
                            {/* Icon */}
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
                              <Icon size={14} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white font-body leading-relaxed">
                                {entry.description}
                              </p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-steel font-body">
                                  {format(new Date(entry.created_at), 'HH:mm')}
                                </span>
                                <span className="text-xs text-steel font-body">
                                  by {entry.performed_by}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${colorClass}`}>
                                  {entry.action.replace(/_/g, ' ')}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
