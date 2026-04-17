import { useMemo, useState } from 'react';
import { Send, Mail, MessageSquareHeart, Megaphone, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useBookings } from '@/hooks/useBookings';
import { useGuests } from '@/hooks/useGuests';
import { useProperty } from '@/hooks/useProperty';
import {
  useGuestCommunications,
  buildPreArrivalEmail,
  buildPostStayReviewEmail,
  buildMarketingEmail,
} from '@/hooks/useGuestCommunications';
import { PageSpinner } from '@/components/shared/LoadingSpinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Booking, Guest } from '@/types';

export function GuestLifecyclePage() {
  const { property, propertyId } = useProperty();
  const { bookings, isLoading: loadingB } = useBookings();
  const { guests, isLoading: loadingG } = useGuests();
  const { communications, sendEmail } = useGuestCommunications();

  if (loadingB || loadingG) return <PageSpinner />;

  const guestsById = new Map(guests.map((g) => [g.id, g] as const));

  // Pre-arrival: status=confirmed, check-in within next 3 days, guest has email,
  // and no pre_arrival comm sent for this booking yet.
  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const sentPreArrivalBookingIds = new Set(
    communications.filter((c) => c.kind === 'pre_arrival' && c.status === 'sent').map((c) => c.booking_id),
  );
  const sentReviewBookingIds = new Set(
    communications.filter((c) => c.kind === 'post_stay_review' && c.status === 'sent').map((c) => c.booking_id),
  );

  const preArrivalQueue = bookings.filter((b) => {
    if (b.status !== 'confirmed') return false;
    const ci = new Date(b.check_in);
    if (ci < now || ci > in3Days) return false;
    const g = b.guest ?? guestsById.get(b.guest_id);
    if (!g?.email) return false;
    return !sentPreArrivalBookingIds.has(b.id);
  });

  // Post-stay: checked_out in last 48h, guest has email, not yet sent
  const last48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const postStayQueue = bookings.filter((b) => {
    if (b.status !== 'checked_out') return false;
    const co = b.checked_out_at ? new Date(b.checked_out_at) : new Date(b.check_out);
    if (co < last48h || co > now) return false;
    const g = b.guest ?? guestsById.get(b.guest_id);
    if (!g?.email) return false;
    return !sentReviewBookingIds.has(b.id);
  });

  const totalPending = preArrivalQueue.length + postStayQueue.length;

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display text-white mb-1.5 tracking-tight">Guest Lifecycle</h1>
          <p className="text-sm text-steel font-body tracking-wide">
            {totalPending > 0
              ? `${totalPending} email${totalPending === 1 ? '' : 's'} ready to send`
              : 'Automated pre-arrival, post-stay and marketing emails'}
          </p>
        </div>
      </div>

      <Tabs defaultValue="pre">
        <TabsList className="mb-6">
          <TabsTrigger value="pre" className="gap-2">
            <Mail className="w-4 h-4" /> Pre-arrival
            {preArrivalQueue.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-gold/20 text-gold text-[10px] rounded-md">{preArrivalQueue.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="post" className="gap-2">
            <MessageSquareHeart className="w-4 h-4" /> Post-stay reviews
            {postStayQueue.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-teal/20 text-teal text-[10px] rounded-md">{postStayQueue.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-2">
            <Megaphone className="w-4 h-4" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="w-4 h-4" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pre">
          <LifecycleQueue
            emptyLabel="No pre-arrival emails pending. Bookings with a check-in within the next 3 days will appear here automatically."
            items={preArrivalQueue}
            guestsById={guestsById}
            kindLabel="Pre-arrival"
            onSend={async (booking, guest) => {
              if (!guest.email) return;
              const checkinUrl = property?.slug
                ? `${window.location.origin}/book/${property.slug}/checkin?code=${encodeURIComponent(booking.confirmation_code)}`
                : undefined;
              const { subject, html } = buildPreArrivalEmail({ property, booking, guest, checkinUrl });
              await sendEmail.mutateAsync({
                to: guest.email, subject, html, kind: 'pre_arrival',
                booking_id: booking.id, guest_id: guest.id,
              });
            }}
            onSendAll={async () => {
              for (const b of preArrivalQueue) {
                const g = b.guest ?? guestsById.get(b.guest_id);
                if (!g?.email) continue;
                const checkinUrl = property?.slug
                  ? `${window.location.origin}/book/${property.slug}/checkin?code=${encodeURIComponent(b.confirmation_code)}`
                  : undefined;
                const { subject, html } = buildPreArrivalEmail({ property, booking: b, guest: g, checkinUrl });
                try {
                  await sendEmail.mutateAsync({
                    to: g.email, subject, html, kind: 'pre_arrival',
                    booking_id: b.id, guest_id: g.id,
                  });
                } catch {
                  // Toast handled by hook
                }
              }
            }}
          />
        </TabsContent>

        <TabsContent value="post">
          <LifecycleQueue
            emptyLabel="No review requests pending. Guests who check out appear here for 48 hours."
            items={postStayQueue}
            guestsById={guestsById}
            kindLabel="Post-stay"
            onSend={async (booking, guest) => {
              if (!guest.email) return;
              const { subject, html } = buildPostStayReviewEmail({ property, booking, guest });
              await sendEmail.mutateAsync({
                to: guest.email, subject, html, kind: 'post_stay_review',
                booking_id: booking.id, guest_id: guest.id,
              });
            }}
            onSendAll={async () => {
              for (const b of postStayQueue) {
                const g = b.guest ?? guestsById.get(b.guest_id);
                if (!g?.email) continue;
                const { subject, html } = buildPostStayReviewEmail({ property, booking: b, guest: g });
                try {
                  await sendEmail.mutateAsync({
                    to: g.email, subject, html, kind: 'post_stay_review',
                    booking_id: b.id, guest_id: g.id,
                  });
                } catch { /* toast handled */ }
              }
            }}
          />
        </TabsContent>

        <TabsContent value="campaigns">
          <CampaignComposer guests={guests} propertyId={propertyId ?? undefined} />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTable communications={communications} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Queue renderer ───────────────────────────────────────────

function LifecycleQueue({
  items, guestsById, onSend, onSendAll, emptyLabel, kindLabel,
}: {
  items: Booking[];
  guestsById: Map<string, Guest>;
  kindLabel: string;
  emptyLabel: string;
  onSend: (booking: Booking, guest: Guest) => Promise<void>;
  onSendAll: () => Promise<void>;
}) {
  const [sending, setSending] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-charcoal border border-white/[0.06] p-10 text-center">
        <CheckCircle2 className="w-10 h-10 text-teal mx-auto mb-3 opacity-60" />
        <p className="text-silver text-sm">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-steel">{items.length} pending</div>
        <button
          onClick={async () => { setSendingAll(true); try { await onSendAll(); } finally { setSendingAll(false); } }}
          disabled={sendingAll}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold text-midnight font-medium hover:bg-gold/90 disabled:opacity-50 text-sm"
        >
          <Send className="w-4 h-4" /> {sendingAll ? 'Sending…' : `Send all (${items.length})`}
        </button>
      </div>
      <div className="rounded-2xl bg-charcoal border border-white/[0.06] overflow-hidden">
        <table className="w-full">
          <thead className="bg-midnight/60 border-b border-white/[0.06]">
            <tr className="text-left text-[11px] uppercase tracking-wider text-steel">
              <th className="px-4 py-3">Guest</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">{kindLabel === 'Pre-arrival' ? 'Arrival' : 'Checked out'}</th>
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {items.map((b) => {
              const g = b.guest ?? guestsById.get(b.guest_id);
              if (!g) return null;
              const dateToShow = kindLabel === 'Pre-arrival'
                ? format(new Date(b.check_in), 'EEE d MMM')
                : format(new Date(b.checked_out_at ?? b.check_out), 'EEE d MMM');
              return (
                <tr key={b.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white text-sm">{g.first_name} {g.last_name}</td>
                  <td className="px-4 py-3 text-silver text-sm">{g.email}</td>
                  <td className="px-4 py-3 text-silver text-sm">{dateToShow}</td>
                  <td className="px-4 py-3 text-steel text-xs font-mono">{b.confirmation_code}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={async () => {
                        setSending(b.id);
                        try { await onSend(b, g); } finally { setSending(null); }
                      }}
                      disabled={sending === b.id}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-silver hover:text-white text-xs disabled:opacity-50"
                    >
                      {sending === b.id ? 'Sending…' : 'Send'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Campaign composer ────────────────────────────────────────

function CampaignComposer({ guests, propertyId }: { guests: Guest[]; propertyId: string | undefined }) {
  const { property } = useProperty();
  const { sendEmail } = useGuestCommunications();
  const [segment, setSegment] = useState<'all' | 'repeat' | 'recent' | 'high_spend'>('all');
  const [headline, setHeadline] = useState('A special offer just for you');
  const [bodyText, setBodyText] = useState('As one of our valued past guests we wanted to offer you 10% off your next stay with us. Use the code RETURN10 at the booking page.');
  const [ctaLabel, setCtaLabel] = useState('Book now');
  const [ctaUrl, setCtaUrl] = useState(() => property?.slug ? `${window.location.origin}/book/${property.slug}` : '');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);

  const segmentedGuests = useMemo(() => {
    const withEmail = guests.filter((g) => g.email);
    switch (segment) {
      case 'repeat':    return withEmail.filter((g) => (g.total_stays ?? 0) >= 2);
      case 'recent':    return withEmail.filter((g) => {
        if (!g.updated_at) return false;
        const daysSince = (Date.now() - new Date(g.updated_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= 180;
      });
      case 'high_spend': return withEmail.filter((g) => (g.total_spend ?? 0) >= 500);
      default:          return withEmail;
    }
  }, [guests, segment]);

  const sendCampaign = async () => {
    if (!propertyId || sending || segmentedGuests.length === 0) return;
    const confirmed = window.confirm(
      `Send this campaign to ${segmentedGuests.length} guest${segmentedGuests.length === 1 ? '' : 's'}?`
    );
    if (!confirmed) return;
    setSending(true);
    setProgress(0);
    let done = 0;
    for (const g of segmentedGuests) {
      if (!g.email) continue;
      const { subject, html } = buildMarketingEmail(
        { property, guest: g },
        { headline, body: bodyText, ctaLabel, ctaUrl },
      );
      try {
        await sendEmail.mutateAsync({
          to: g.email, subject, html, kind: 'marketing', guest_id: g.id,
        });
      } catch { /* toast handled */ }
      done += 1;
      setProgress(done);
    }
    setSending(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-2xl bg-charcoal border border-white/[0.06] p-6 space-y-4">
        <h3 className="text-lg font-display text-white">Compose campaign</h3>

        <div>
          <label className="text-xs uppercase tracking-wider text-steel mb-2 block">Segment</label>
          <div className="grid grid-cols-2 gap-2">
            {(['all','repeat','recent','high_spend'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSegment(s)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm border transition',
                  segment === s
                    ? 'bg-gold/10 border-gold/40 text-gold'
                    : 'bg-white/[0.02] border-white/[0.06] text-silver hover:bg-white/[0.04]'
                )}
              >
                {s === 'all' && 'All guests'}
                {s === 'repeat' && 'Repeat (2+)'}
                {s === 'recent' && 'Last 6 months'}
                {s === 'high_spend' && 'High spend (£500+)'}
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-steel">
            {segmentedGuests.length} recipient{segmentedGuests.length === 1 ? '' : 's'} will receive this email
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-steel mb-2 block">Subject / headline</label>
          <input value={headline} onChange={(e) => setHeadline(e.target.value)}
            className="w-full bg-midnight border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white focus:border-gold/40 outline-none" />
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-steel mb-2 block">Body</label>
          <textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={5}
            className="w-full bg-midnight border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white focus:border-gold/40 outline-none resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-steel mb-2 block">Button label</label>
            <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)}
              className="w-full bg-midnight border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white focus:border-gold/40 outline-none" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-steel mb-2 block">Button URL</label>
            <input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)}
              className="w-full bg-midnight border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white focus:border-gold/40 outline-none" />
          </div>
        </div>

        <button
          onClick={sendCampaign}
          disabled={sending || segmentedGuests.length === 0}
          className="w-full py-3 rounded-xl bg-gold text-midnight font-medium hover:bg-gold/90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          {sending ? `Sending ${progress}/${segmentedGuests.length}…` : `Send to ${segmentedGuests.length} recipient${segmentedGuests.length === 1 ? '' : 's'}`}
        </button>
      </div>

      <div className="rounded-2xl bg-white border border-white/[0.06] p-6 overflow-hidden">
        <div className="text-[10px] uppercase tracking-widest text-steel mb-4 font-medium">Live preview</div>
        <div className="text-xs text-slate-500 mb-1">Subject</div>
        <div className="font-semibold text-slate-900 mb-4">{headline}</div>
        <div className="border-t border-slate-200 pt-4 text-slate-900 text-sm">
          <p className="mb-3">Hi {segmentedGuests[0]?.first_name ?? 'there'},</p>
          {bodyText.split('\n').map((line, i) => <p key={i} className="mb-3">{line}</p>)}
          {ctaUrl && ctaLabel && (
            <div className="text-center my-6">
              <span className="inline-block bg-gold text-midnight px-6 py-3 rounded-lg font-medium">{ctaLabel}</span>
            </div>
          )}
          <p className="text-slate-500 mt-4">Warm regards,<br />The team at {property?.name ?? 'Your Hotel'}</p>
        </div>
      </div>
    </div>
  );
}

// ── History table ─────────────────────────────────────────────

function HistoryTable({ communications }: { communications: ReturnType<typeof useGuestCommunications>['communications'] }) {
  if (communications.length === 0) {
    return (
      <div className="rounded-2xl bg-charcoal border border-white/[0.06] p-10 text-center">
        <Mail className="w-10 h-10 text-steel mx-auto mb-3 opacity-40" />
        <p className="text-silver text-sm">No emails sent yet.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-charcoal border border-white/[0.06] overflow-hidden">
      <table className="w-full">
        <thead className="bg-midnight/60 border-b border-white/[0.06]">
          <tr className="text-left text-[11px] uppercase tracking-wider text-steel">
            <th className="px-4 py-3">Sent</th>
            <th className="px-4 py-3">Kind</th>
            <th className="px-4 py-3">To</th>
            <th className="px-4 py-3">Subject</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {communications.map((c) => (
            <tr key={c.id} className="hover:bg-white/[0.02]">
              <td className="px-4 py-3 text-silver text-xs">{c.sent_at ? format(new Date(c.sent_at), 'd MMM HH:mm') : '—'}</td>
              <td className="px-4 py-3 text-silver text-xs">{c.kind.replace(/_/g, ' ')}</td>
              <td className="px-4 py-3 text-silver text-sm">{c.to_email}</td>
              <td className="px-4 py-3 text-white text-sm truncate max-w-xs">{c.subject}</td>
              <td className="px-4 py-3">
                {c.status === 'sent' && <span className="inline-flex items-center gap-1 text-teal text-xs"><CheckCircle2 className="w-3 h-3" /> Sent</span>}
                {c.status === 'failed' && <span className="inline-flex items-center gap-1 text-red-400 text-xs" title={c.error ?? ''}><AlertCircle className="w-3 h-3" /> Failed</span>}
                {c.status === 'queued' && <span className="inline-flex items-center gap-1 text-steel text-xs"><Clock className="w-3 h-3" /> Queued</span>}
                {c.status === 'skipped' && <span className="inline-flex items-center gap-1 text-steel text-xs">Skipped</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
