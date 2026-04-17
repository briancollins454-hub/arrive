import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useBookingProperty } from '@/hooks/useBookingProperty';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { CheckCircle2, Calendar, Clock, Search, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface LookupResult {
  booking_id: string;
  confirmation_code: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  status: string;
  special_requests: string | null;
  estimated_arrival_time: string | null;
  pre_checkin_completed_at: string | null;
  guest_first_name: string;
  guest_last_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  property_name: string;
  property_check_in_time: string | null;
}

export function SelfCheckInPage() {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const prefilledCode = params.get('code') ?? '';
  const { property } = useBookingProperty();

  const [code, setCode] = useState(prefilledCode);
  const [lastName, setLastName] = useState('');
  const [looking, setLooking] = useState(false);
  const [booking, setBooking] = useState<LookupResult | null>(null);
  const [error, setError] = useState('');

  // Check-in form state
  const [arrivalTime, setArrivalTime] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [idType, setIdType] = useState('passport');
  const [idNumber, setIdNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleLookup = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!slug) return;
    setError('');
    setLooking(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('lookup_booking_for_checkin', {
        p_slug: slug,
        p_confirmation_code: code.trim(),
        p_last_name: lastName.trim(),
      });
      if (rpcError) throw rpcError;
      const result = data as LookupResult;
      setBooking(result);
      setArrivalTime(result.estimated_arrival_time ?? result.property_check_in_time ?? '15:00');
      setSpecialRequests(result.special_requests ?? '');
      if (result.pre_checkin_completed_at) {
        setCompleted(true);
      }
    } catch {
      setError('We could not find a booking with that confirmation code and last name. Please check and try again.');
      setBooking(null);
    } finally {
      setLooking(false);
    }
  };

  // Auto-lookup if code came from URL and guest types last name
  useEffect(() => {
    if (prefilledCode && prefilledCode !== code) setCode(prefilledCode);
  }, [prefilledCode, code]);

  const handleCheckin = async () => {
    if (!slug || !booking) return;
    setSubmitting(true);
    try {
      const { error: rpcError } = await supabase.rpc('self_checkin', {
        p_slug: slug,
        p_confirmation_code: booking.confirmation_code,
        p_last_name: lastName.trim(),
        p_estimated_arrival_time: arrivalTime,
        p_special_requests: specialRequests,
        p_checkin_data: {
          id_type: idType,
          id_number: idNumber,
          submitted_at: new Date().toISOString(),
        },
      });
      if (rpcError) throw rpcError;
      setCompleted(true);
      toast.success('Check-in complete. See you soon.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit check-in');
    } finally {
      setSubmitting(false);
    }
  };

  const nightCount = useMemo(() => {
    if (!booking) return 0;
    const d1 = new Date(booking.check_in);
    const d2 = new Date(booking.check_out);
    return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
  }, [booking]);

  // Step 1: Lookup form
  if (!booking) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 text-gold text-xs uppercase tracking-widest mb-4">
            <Sparkles className="w-3 h-3" /> Online check-in
          </div>
          <h1 className="text-3xl font-display text-midnight mb-2">
            Welcome {property?.name ? `to ${property.name}` : ''}
          </h1>
          <p className="text-steel text-sm">
            Find your booking to complete check-in before arrival.
          </p>
        </div>

        <Card>
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleLookup} className="space-y-5">
              <div>
                <Label htmlFor="code">Confirmation code</Label>
                <Input id="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. ARR-12345" required />
              </div>
              <div>
                <Label htmlFor="last">Last name</Label>
                <Input id="last" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="As it appears on your booking" required />
              </div>
              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
              <Button type="submit" disabled={looking || !code || !lastName} className="w-full">
                <Search className="w-4 h-4 mr-2" /> {looking ? 'Looking up…' : 'Find my booking'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Already completed
  if (completed) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-14 h-14 text-teal mx-auto mb-4" />
            <h2 className="text-2xl font-display text-midnight mb-2">You're all checked in</h2>
            <p className="text-steel text-sm mb-6">
              Thank you, {booking.guest_first_name}. We'll see you on {format(new Date(booking.check_in), 'EEEE d MMMM')}.
            </p>
            <div className="bg-cloud/30 rounded-lg p-4 text-left text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-steel">Confirmation</span><span className="font-mono text-midnight">{booking.confirmation_code}</span></div>
              <div className="flex justify-between"><span className="text-steel">Arrival</span><span className="text-midnight">{format(new Date(booking.check_in), 'd MMM yyyy')}</span></div>
              <div className="flex justify-between"><span className="text-steel">Departure</span><span className="text-midnight">{format(new Date(booking.check_out), 'd MMM yyyy')}</span></div>
              <div className="flex justify-between"><span className="text-steel">Arrival time</span><span className="text-midnight">{arrivalTime}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 3: Check-in form
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-display text-midnight mb-2">
          Hi {booking.guest_first_name}, let's get you checked in
        </h1>
        <p className="text-steel text-sm">A few quick details to speed up your arrival.</p>
      </div>

      {/* Booking summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Your booking at {booking.property_name}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-steel mb-1">Confirmation</div>
            <div className="font-mono text-midnight">{booking.confirmation_code}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-steel mb-1">Nights</div>
            <div className="text-midnight">{nightCount}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-steel mb-1">Check-in</div>
            <div className="text-midnight flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gold" /> {format(new Date(booking.check_in), 'EEE d MMM')}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-steel mb-1">Check-out</div>
            <div className="text-midnight flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gold" /> {format(new Date(booking.check_out), 'EEE d MMM')}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-steel mb-1">Guests</div>
            <div className="text-midnight">{booking.num_guests}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-steel mb-1">Status</div>
            <div className="text-midnight capitalize">{booking.status.replace('_', ' ')}</div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-gold" /> Estimated arrival time</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-steel mb-3">
            Check-in opens from {booking.property_check_in_time ?? '15:00'}. Letting us know when you plan to arrive helps us get your room ready.
          </p>
          <Input type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} className="max-w-xs" />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">ID details (optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-steel">
            Providing your ID details now saves time on arrival. Your details are encrypted and visible only to reception.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <Label htmlFor="idType">Document type</Label>
              <select id="idType" value={idType} onChange={(e) => setIdType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-cloud bg-white px-3 py-2 text-sm">
                <option value="passport">Passport</option>
                <option value="driving_license">Driving license</option>
                <option value="national_id">National ID</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="idNumber">Document number</Label>
              <Input id="idNumber" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="Leave blank to skip" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Anything we should know?</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            placeholder="Dietary requirements, room preferences, celebrating something special — we'd love to know."
            rows={4}
          />
        </CardContent>
      </Card>

      <Button onClick={handleCheckin} disabled={submitting} className="w-full" size="lg">
        {submitting ? 'Submitting…' : 'Complete check-in'}
      </Button>
      <p className="text-center text-xs text-steel mt-3">You can still make changes up until your arrival.</p>
    </div>
  );
}
