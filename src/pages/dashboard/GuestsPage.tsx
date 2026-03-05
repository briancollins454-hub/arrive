import { useState } from 'react';
import { useGuests } from '@/hooks/useGuests';
import { useBookings } from '@/hooks/useBookings';
import { GuestProfile } from '@/components/dashboard/GuestProfile';
import { PageSpinner } from '@/components/shared/LoadingSpinner';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/Dialog';
import { Search, User, Mail, Phone, Download, ShieldAlert, UserX, FileDown, AlertTriangle } from 'lucide-react';
import { exportCSV } from '@/lib/exportUtils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Guest } from '@/types';

export function GuestsPage() {
  const { guests, isLoading } = useGuests();
  const { bookings } = useBookings();
  const [search, setSearch] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [filterTag, setFilterTag] = useState<string>('all');
  const [blacklist, setBlacklist] = useState<Set<string>>(new Set());
  const [showBlacklistConfirm, setShowBlacklistConfirm] = useState<Guest | null>(null);
  const [showGdprErase, setShowGdprErase] = useState<Guest | null>(null);
  const [filterDNR, setFilterDNR] = useState(false);

  if (isLoading) return <PageSpinner />;

  // Get unique tags
  const allTags = Array.from(new Set(guests.flatMap((g) => g.tags)));

  const filtered = guests.filter((g) => {
    if (filterTag !== 'all' && !g.tags.includes(filterTag)) return false;
    if (filterDNR && !blacklist.has(g.id)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      `${g.first_name} ${g.last_name}`.toLowerCase().includes(q) ||
      (g.email?.toLowerCase().includes(q) ?? false) ||
      (g.phone?.toLowerCase().includes(q) ?? false)
    );
  });

  // Get bookings for selected guest
  const guestBookings = selectedGuest
    ? bookings.filter((b) => b.guest_id === selectedGuest.id)
    : [];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display text-white mb-1.5 tracking-tight">Guests</h1>
          <p className="text-sm text-steel font-body tracking-wide">{guests.length} registered guests</p>
        </div>
        <button
          onClick={() => {
            const rows = filtered.map(g => ({
              'Name': `${g.first_name} ${g.last_name}`,
              'Email': g.email ?? '',
              'Phone': g.phone ?? '',
              'Nationality': g.nationality ?? '',
              'Total Stays': g.total_stays,
              'Total Spend': `£${g.total_spend.toFixed(2)}`,
              'Tags': g.tags.join(', '),
              'Dietary': g.preferences?.dietary ?? '',
              'Room Pref': g.preferences?.room_pref ?? '',
              'Allergies': g.preferences?.allergies ?? '',
            }));
            exportCSV(rows, `guests-${format(new Date(), 'yyyy-MM-dd')}`);
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-body font-medium text-steel border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:text-white transition-all"
        >
          <Download size={14} /> Export
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel" />
          <Input
            variant="dark"
            placeholder="Search guests by name, email, or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {allTags.length > 0 && (
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="input-dark text-sm py-2 px-3 rounded-xl bg-charcoal border border-white/[0.06]"
          >
            <option value="all">All Tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        )}
        <button
          onClick={() => setFilterDNR(!filterDNR)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-body font-medium border transition-all',
            filterDNR
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-white/[0.03] border-white/[0.06] text-steel hover:text-silver hover:bg-white/[0.06]'
          )}
        >
          <ShieldAlert size={13} />
          DNR ({blacklist.size})
        </button>
        <span className="text-xs text-steel font-body ml-auto">
          {filtered.length} of {guests.length} guests
        </span>
      </div>

      {/* Guest Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-steel font-body">No guests found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((guest) => (
            <Card
              key={guest.id}
              variant="dark"
              className="cursor-pointer hover:border-gold/20 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 transition-all duration-300 group"
              onClick={() => setSelectedGuest(guest)}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gold/20 to-teal/10 flex items-center justify-center text-gold font-display text-sm shrink-0 ring-1 ring-gold/10 group-hover:ring-gold/25 transition-all duration-300">
                    {guest.first_name[0]}{guest.last_name[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-white font-body text-sm font-medium truncate">
                        {guest.first_name} {guest.last_name}
                      </p>
                      {blacklist.has(guest.id) && (
                        <span className="px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/25 text-[9px] font-bold text-red-400 shrink-0">
                          DNR
                        </span>
                      )}
                    </div>
                    {guest.nationality && (
                      <p className="text-steel text-xs font-body">{guest.nationality}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs min-w-0 overflow-hidden">
                    <Mail size={12} className="text-steel shrink-0" />
                    <span className="text-white/70 font-body truncate">{guest.email}</span>
                  </div>
                  {guest.phone && (
                    <div className="flex items-center gap-2 text-xs">
                      <Phone size={12} className="text-steel shrink-0" />
                      <span className="text-white/70 font-body">{guest.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs">
                    <User size={12} className="text-steel shrink-0" />
                    <span className="text-white/70 font-body">
                      {guest.total_stays ?? 0} stay{(guest.total_stays ?? 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {guest.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {guest.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            tag === 'VIP' ? 'text-gold bg-gold/10' :
                            tag === 'Returning' ? 'text-teal bg-teal/10' :
                            'text-steel bg-white/[0.05]'
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Guest Detail Dialog */}
      <Dialog open={!!selectedGuest} onOpenChange={() => setSelectedGuest(null)}>
        <DialogContent variant="dark" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              Guest Profile
              {selectedGuest && blacklist.has(selectedGuest.id) && (
                <span className="px-2 py-0.5 rounded bg-red-500/15 border border-red-500/25 text-[10px] font-bold text-red-400">
                  DO NOT RENT
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedGuest && (
            <>
              <GuestProfile guest={selectedGuest} bookings={guestBookings} />
              {/* Guest Actions — Blacklist + GDPR */}
              <div className="border-t border-white/[0.06] pt-4 mt-4 space-y-3">
                <p className="text-[11px] text-steel font-body font-semibold uppercase tracking-wider">Guest Actions</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      if (blacklist.has(selectedGuest.id)) {
                        const next = new Set(blacklist);
                        next.delete(selectedGuest.id);
                        setBlacklist(next);
                        toast.success(`${selectedGuest.first_name} ${selectedGuest.last_name} removed from DNR list`);
                      } else {
                        setShowBlacklistConfirm(selectedGuest);
                      }
                    }}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body font-semibold border transition-all',
                      blacklist.has(selectedGuest.id)
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                    )}
                  >
                    <ShieldAlert size={13} />
                    {blacklist.has(selectedGuest.id) ? 'Remove from DNR' : 'Add to DNR List'}
                  </button>
                  <button
                    onClick={() => {
                      const data = {
                        guest: {
                          name: `${selectedGuest.first_name} ${selectedGuest.last_name}`,
                          email: selectedGuest.email,
                          phone: selectedGuest.phone,
                          nationality: selectedGuest.nationality,
                          preferences: selectedGuest.preferences,
                          tags: selectedGuest.tags,
                          total_stays: selectedGuest.total_stays,
                          total_spend: selectedGuest.total_spend,
                        },
                        bookings: guestBookings.map(b => ({
                          confirmation: b.confirmation_code,
                          check_in: b.check_in,
                          check_out: b.check_out,
                          status: b.status,
                          rate: b.nightly_rate,
                        })),
                        exported_at: new Date().toISOString(),
                      };
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `guest-data-${selectedGuest.first_name}-${selectedGuest.last_name}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success('Guest data exported (GDPR data portability)');
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body font-semibold border bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all"
                  >
                    <FileDown size={13} />
                    Export Guest Data (GDPR)
                  </button>
                  <button
                    onClick={() => setShowGdprErase(selectedGuest)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body font-semibold border bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all"
                  >
                    <UserX size={13} />
                    Right to Erasure
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* DNR Confirmation Dialog */}
      <Dialog open={!!showBlacklistConfirm} onOpenChange={() => setShowBlacklistConfirm(null)}>
        <DialogContent variant="dark" className="max-w-sm">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-400/10 flex items-center justify-center mx-auto">
              <ShieldAlert size={24} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-white font-display text-lg mb-1">Add to Do-Not-Rent List?</h3>
              <p className="text-sm text-steel font-body">
                {showBlacklistConfirm?.first_name} {showBlacklistConfirm?.last_name} will be flagged as DNR.
                Future booking attempts will show a warning.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button onClick={() => setShowBlacklistConfirm(null)} className="px-4 py-2 rounded-xl text-xs font-body text-steel hover:text-silver border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-all">Cancel</button>
              <button
                onClick={() => {
                  if (showBlacklistConfirm) {
                    setBlacklist(new Set([...blacklist, showBlacklistConfirm.id]));
                    toast.success(`${showBlacklistConfirm.first_name} ${showBlacklistConfirm.last_name} added to DNR list`);
                    setShowBlacklistConfirm(null);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-body font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
              >
                Confirm DNR
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* GDPR Erasure Confirmation */}
      <Dialog open={!!showGdprErase} onOpenChange={() => setShowGdprErase(null)}>
        <DialogContent variant="dark" className="max-w-sm">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/10 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-white font-display text-lg mb-1">Right to Erasure</h3>
              <p className="text-sm text-steel font-body">
                This will anonymise all personal data for {showGdprErase?.first_name} {showGdprErase?.last_name}.
                Financial records will be retained for compliance but PII will be removed. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button onClick={() => setShowGdprErase(null)} className="px-4 py-2 rounded-xl text-xs font-body text-steel hover:text-silver border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-all">Cancel</button>
              <button
                onClick={() => {
                  toast.success(`Personal data anonymised for ${showGdprErase?.first_name} ${showGdprErase?.last_name}`);
                  setShowGdprErase(null);
                  setSelectedGuest(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-body font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
              >
                Anonymise Data
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
