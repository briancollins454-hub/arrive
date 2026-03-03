import { useState } from 'react';
import { useBookings } from '@/hooks/useBookings';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Separator } from '@/components/ui/Separator';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  Search, Calendar, BedDouble, Users, Mail, Phone, Pencil,
  Clock, AlertTriangle, Check, X, MessageSquare, ArrowLeft,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import type { Booking } from '@/types';

export function ManageBookingPage() {
  const { bookings, modifyBooking, updateStatus } = useBookings();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [found, setFound] = useState<Booking | null>(null);
  const [error, setError] = useState('');

  // Self-service edit states
  const [showModifyDates, setShowModifyDates] = useState(false);
  const [newCheckIn, setNewCheckIn] = useState('');
  const [newCheckOut, setNewCheckOut] = useState('');
  const [showEditRequests, setShowEditRequests] = useState(false);
  const [requestsText, setRequestsText] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const match = bookings.find(
      (b) =>
        b.confirmation_code.toLowerCase() === code.toLowerCase() &&
        b.guest?.email?.toLowerCase() === email.toLowerCase()
    );
    if (match) {
      setFound(match);
      setRequestsText(match.special_requests ?? '');
    } else {
      setError('No booking found with that confirmation code and email');
      setFound(null);
    }
  };

  const canModify = found && ['pending', 'confirmed'].includes(found.status);
  const canCancel = found && ['pending', 'confirmed'].includes(found.status);
  const checkInDate = found ? new Date(found.check_in) : new Date();
  const hoursUntilCheckIn = found
    ? Math.max(0, (checkInDate.getTime() - Date.now()) / 3_600_000)
    : 0;
  const nights = found
    ? differenceInDays(new Date(found.check_out), new Date(found.check_in))
    : 0;

  const handleModifyDates = () => {
    if (!found || !newCheckIn || !newCheckOut) return;
    if (new Date(newCheckOut) <= new Date(newCheckIn)) {
      toast.error('Check-out must be after check-in');
      return;
    }
    const newNights = differenceInDays(new Date(newCheckOut), new Date(newCheckIn));
    modifyBooking.mutate({
      bookingId: found.id,
      updates: {
        check_in: newCheckIn,
        check_out: newCheckOut,
        total_amount: found.nightly_rate * newNights,
      },
    });
    setShowModifyDates(false);
    // Refresh the found booking
    const updated = bookings.find(b => b.id === found.id);
    if (updated) setFound({ ...updated, check_in: newCheckIn, check_out: newCheckOut, total_amount: found.nightly_rate * newNights });
    toast.success('Dates updated successfully');
  };

  const handleUpdateRequests = () => {
    if (!found) return;
    modifyBooking.mutate({
      bookingId: found.id,
      updates: { special_requests: requestsText || null },
    });
    setShowEditRequests(false);
    setFound({ ...found, special_requests: requestsText || null });
    toast.success('Special requests updated');
  };

  const handleCancel = () => {
    if (!found) return;
    updateStatus.mutate({ bookingId: found.id, status: 'cancelled' });
    setFound({ ...found, status: 'cancelled' });
    setShowCancelConfirm(false);
    toast.success('Booking cancelled');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-display text-midnight mb-2">Manage Your Booking</h1>
      <p className="text-charcoal/60 font-body mb-8">
        Enter your confirmation code and email to view or modify your booking
      </p>

      {!found ? (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <Label>Confirmation Code</Label>
                <Input
                  placeholder="e.g. ARR-2024-001"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="text-red-600 text-sm font-body">{error}</p>
              )}
              <Button type="submit" className="w-full">
                <Search size={16} className="mr-2" /> Find My Booking
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Booking Found */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-midnight">
                {found.confirmation_code}
              </CardTitle>
              <StatusBadge status={found.status} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-teal shrink-0" />
                  <div>
                    <p className="text-xs text-charcoal/50 font-body">Check-in</p>
                    <p className="text-sm font-body text-midnight">
                      {format(new Date(found.check_in), 'EEE, MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-teal shrink-0" />
                  <div>
                    <p className="text-xs text-charcoal/50 font-body">Check-out</p>
                    <p className="text-sm font-body text-midnight">
                      {format(new Date(found.check_out), 'EEE, MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <BedDouble size={16} className="text-teal shrink-0" />
                  <div>
                    <p className="text-xs text-charcoal/50 font-body">Room</p>
                    <p className="text-sm font-body text-midnight">
                      {found.room_type?.name ?? 'Room'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users size={16} className="text-teal shrink-0" />
                  <div>
                    <p className="text-xs text-charcoal/50 font-body">Guests</p>
                    <p className="text-sm font-body text-midnight">
                      {found.num_guests} guest{found.num_guests !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-charcoal/50 font-body">
                <Clock size={12} />
                {nights} night{nights !== 1 ? 's' : ''} · £{found.nightly_rate.toFixed(2)}/night
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="font-body text-charcoal/60">Total</span>
                <span className="font-display text-xl text-midnight">
                  £{found.total_amount.toFixed(2)}
                </span>
              </div>

              {/* Special Requests */}
              {!showEditRequests ? (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-charcoal/50 font-body">Special Requests</p>
                      {canModify && (
                        <button
                          onClick={() => setShowEditRequests(true)}
                          className="text-xs text-teal hover:text-teal-dark font-body flex items-center gap-1"
                        >
                          <Pencil size={11} /> Edit
                        </button>
                      )}
                    </div>
                    <p className="text-sm font-body text-charcoal/70">
                      {found.special_requests || 'No special requests'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Separator />
                  <div>
                    <Label>Special Requests</Label>
                    <Textarea
                      value={requestsText}
                      onChange={(e) => setRequestsText(e.target.value)}
                      placeholder="e.g. Late check-in, extra pillows, dietary requirements..."
                      rows={3}
                    />
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" onClick={handleUpdateRequests}>
                        <Check size={14} className="mr-1" /> Save
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowEditRequests(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Guest Contact */}
              {found.guest && (
                <div className="space-y-2">
                  {found.guest.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail size={14} className="text-steel" />
                      <span className="font-body text-charcoal/70">{found.guest.email}</span>
                    </div>
                  )}
                  {found.guest.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone size={14} className="text-steel" />
                      <span className="font-body text-charcoal/70">{found.guest.phone}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Self-service Actions */}
          {canModify && (
            <Card>
              <CardHeader>
                <CardTitle className="text-midnight text-base">Manage Your Stay</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Modify Dates */}
                {!showModifyDates ? (
                  <button
                    onClick={() => {
                      setShowModifyDates(true);
                      setNewCheckIn(found.check_in.split('T')[0] ?? '');
                      setNewCheckOut(found.check_out.split('T')[0] ?? '');
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-charcoal/10 hover:border-teal/30 hover:bg-teal/5 transition-all text-left"
                  >
                    <Calendar size={18} className="text-teal shrink-0" />
                    <div>
                      <p className="text-sm font-body font-medium text-midnight">Change Dates</p>
                      <p className="text-xs text-charcoal/50 font-body">Modify your check-in or check-out dates</p>
                    </div>
                  </button>
                ) : (
                  <div className="p-4 border border-teal/20 rounded-lg bg-teal/5 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>New Check-in</Label>
                        <Input
                          type="date"
                          value={newCheckIn}
                          onChange={(e) => setNewCheckIn(e.target.value)}
                          min={format(new Date(), 'yyyy-MM-dd')}
                        />
                      </div>
                      <div>
                        <Label>New Check-out</Label>
                        <Input
                          type="date"
                          value={newCheckOut}
                          onChange={(e) => setNewCheckOut(e.target.value)}
                        />
                      </div>
                    </div>
                    {newCheckIn && newCheckOut && new Date(newCheckOut) > new Date(newCheckIn) && (
                      <p className="text-xs text-charcoal/60 font-body">
                        {differenceInDays(new Date(newCheckOut), new Date(newCheckIn))} nights ·
                        New total: £{(found.nightly_rate * differenceInDays(new Date(newCheckOut), new Date(newCheckIn))).toFixed(2)}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleModifyDates}>
                        <Check size={14} className="mr-1" /> Confirm Changes
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowModifyDates(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Cancel Booking */}
                {canCancel && !showCancelConfirm && (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-charcoal/10 hover:border-red-300 hover:bg-red-50 transition-all text-left"
                  >
                    <AlertTriangle size={18} className="text-red-500 shrink-0" />
                    <div>
                      <p className="text-sm font-body font-medium text-midnight">Cancel Booking</p>
                      <p className="text-xs text-charcoal/50 font-body">
                        {hoursUntilCheckIn > 48
                          ? 'Free cancellation available'
                          : 'Cancellation fees may apply'}
                      </p>
                    </div>
                  </button>
                )}

                {showCancelConfirm && (
                  <div className="p-4 border border-red-200 rounded-lg bg-red-50 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className="text-red-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-body font-medium text-red-800">
                          Are you sure you want to cancel?
                        </p>
                        <p className="text-xs text-red-600/70 font-body mt-1">
                          {hoursUntilCheckIn > 48
                            ? 'Your booking qualifies for free cancellation.'
                            : 'Your booking is within the cancellation window. Fees may apply.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={handleCancel}
                      >
                        <X size={14} className="mr-1" /> Yes, Cancel Booking
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowCancelConfirm(false)}>
                        Keep Booking
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Status messages */}
          {found.status === 'cancelled' && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 flex items-center gap-3">
                <X size={18} className="text-red-500" />
                <p className="text-sm font-body text-red-800">
                  This booking has been cancelled.
                </p>
              </CardContent>
            </Card>
          )}

          {found.status === 'checked_in' && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="p-4 flex items-center gap-3">
                <Check size={18} className="text-emerald-500" />
                <p className="text-sm font-body text-emerald-800">
                  You are currently checked in. Enjoy your stay!
                </p>
              </CardContent>
            </Card>
          )}

          {found.status === 'checked_out' && (
            <Card className="border-slate-200 bg-slate-50">
              <CardContent className="p-4 flex items-center gap-3">
                <MessageSquare size={18} className="text-slate-500" />
                <p className="text-sm font-body text-slate-700">
                  Thank you for your stay! We hope to see you again.
                </p>
              </CardContent>
            </Card>
          )}

          <Button variant="outline" onClick={() => { setFound(null); setCode(''); setEmail(''); setShowModifyDates(false); setShowEditRequests(false); setShowCancelConfirm(false); }}>
            <ArrowLeft size={14} className="mr-1" /> Look Up Another Booking
          </Button>
        </div>
      )}
    </div>
  );
}
