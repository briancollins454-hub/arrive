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
import { Search, User, Mail, Phone, Download } from 'lucide-react';
import { exportCSV } from '@/lib/exportUtils';
import { format } from 'date-fns';
import type { Guest } from '@/types';

export function GuestsPage() {
  const { guests, isLoading } = useGuests();
  const { bookings } = useBookings();
  const [search, setSearch] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [filterTag, setFilterTag] = useState<string>('all');

  if (isLoading) return <PageSpinner />;

  // Get unique tags
  const allTags = Array.from(new Set(guests.flatMap((g) => g.tags)));

  const filtered = guests.filter((g) => {
    if (filterTag !== 'all' && !g.tags.includes(filterTag)) return false;
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
                    <p className="text-white font-body text-sm font-medium truncate">
                      {guest.first_name} {guest.last_name}
                    </p>
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
            <DialogTitle className="text-white">Guest Profile</DialogTitle>
          </DialogHeader>
          {selectedGuest && <GuestProfile guest={selectedGuest} bookings={guestBookings} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
