import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useBookingProperty } from '@/hooks/useBookingProperty';
import { useRooms } from '@/hooks/useRooms';
import { useRatePeriods } from '@/hooks/useRatePeriods';
import { useBookings } from '@/hooks/useBookings';
import { useStripePayment } from '@/hooks/useStripePayment';
import { CheckoutForm } from '@/components/booking/CheckoutForm';
import { Card, CardContent } from '@/components/ui/Card';
import { Separator } from '@/components/ui/Separator';
import { differenceInDays, format } from 'date-fns';
import { Calendar, BedDouble, Users, Shield, Tag, Plus, Check } from 'lucide-react';
import type { CheckoutFormData } from '@/lib/validators';
import { isDemoMode } from '@/lib/supabase';

// Available add-ons — shown only in demo mode until managed from DB
const DEMO_ADDONS = [
  { id: 'breakfast', name: 'Full Breakfast', description: 'Cooked English breakfast each morning', pricePerNight: 15 },
  { id: 'parking', name: 'Parking', description: 'On-site secure parking', pricePerNight: 10 },
  { id: 'late-checkout', name: 'Late Check-out (2pm)', description: 'Guaranteed late departure', priceFlat: 25 },
  { id: 'airport', name: 'Airport Transfer', description: 'Private car to/from airport', priceFlat: 45 },
  { id: 'welcome', name: 'Welcome Package', description: 'Champagne & chocolates in room', priceFlat: 35 },
];
const ADDONS = isDemoMode ? DEMO_ADDONS : [];

export function CheckoutPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { property } = useBookingProperty();
  const { roomTypes } = useRooms();
  const { ratePeriods } = useRatePeriods();
  const { createBooking } = useBookings();

  const checkIn = searchParams.get('check_in') || '';
  const checkOut = searchParams.get('check_out') || '';
  const guests = Number(searchParams.get('guests') || 2);
  const roomTypeId = searchParams.get('room_type_id') || '';

  const roomType = roomTypes.find((rt) => rt.id === roomTypeId);

  // Use effective seasonal rate if an active rate period exists; otherwise use base_rate
  const rate = (() => {
    if (!roomType) return 0;
    const now = new Date();
    const activePeriod = ratePeriods.find(rp =>
      rp.room_type_id === roomType.id && rp.is_active &&
      new Date(rp.start_date) <= now && new Date(rp.end_date) >= now
    );
    return activePeriod ? activePeriod.rate : roomType.base_rate;
  })();
  const nights = checkIn && checkOut
    ? Math.max(1, differenceInDays(new Date(checkOut), new Date(checkIn)))
    : 1;
  const total = rate * nights;

  const TAX_RATE = property?.settings?.tax_rate ?? 0.20;

  const { createPaymentIntent, isStripeConfigured: stripeReady } = useStripePayment();
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoError, setPromoError] = useState('');

  // Add-ons state
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());

  const addonsTotal = ADDONS.filter(a => selectedAddons.has(a.id)).reduce((sum, a) => {
    if (a.priceFlat) return sum + a.priceFlat;
    if (a.pricePerNight) return sum + a.pricePerNight * nights;
    return sum;
  }, 0);

  const promoDiscount = appliedPromo?.discount ?? 0;
  const subtotalAfterPromo = Math.max(0, total - promoDiscount) + addonsTotal;
  const taxAmount = subtotalAfterPromo * TAX_RATE;
  const totalWithTax = subtotalAfterPromo + taxAmount;

  const handleApplyPromo = () => {
    setPromoError('');
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    // Demo promo codes — only work in demo mode
    if (isDemoMode && code === 'WELCOME10') {
      setAppliedPromo({ code, discount: total * 0.10 });
    } else if (isDemoMode && code === 'SAVE20') {
      setAppliedPromo({ code, discount: 20 });
    } else {
      setPromoError('Invalid promo code');
    }
  };

  // Create a Stripe PaymentIntent when the page loads (if Stripe is configured)
  useEffect(() => {
    if (!stripeReady || totalWithTax <= 0 || clientSecret) return;
    createPaymentIntent({
      bookingId: `pending-${Date.now()}`,
      amount: totalWithTax,
      description: `Booking at ${property?.name ?? 'hotel'} — ${nights} night${nights !== 1 ? 's' : ''}`,
    }).then(result => {
      if (result) setClientSecret(result.clientSecret);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripeReady, totalWithTax]);

  const handleCheckout = (data: CheckoutFormData, _paymentIntentId?: string) => {
    const confirmationCode = `AR-${Date.now().toString(36).toUpperCase().slice(-6)}`;

    // Create the booking in the system
    createBooking.mutate({
      property_id: property?.id ?? '',
      room_type_id: roomTypeId,
      room_id: null,
      check_in: checkIn,
      check_out: checkOut,
      num_guests: guests,
      nightly_rate: rate,
      source: 'direct',
      special_requests: data.special_requests ?? '',
      guest: {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone || '',
      },
    }, {
      onSuccess: () => {
        const params = new URLSearchParams({
          code: confirmationCode,
          check_in: checkIn,
          check_out: checkOut,
          guests: String(guests),
          roomType: roomType?.name || 'Room',
          total: String(totalWithTax),
          name: `${data.first_name} ${data.last_name}`,
          email: data.email,
        });
        navigate(`/book/${slug || property?.slug || 'hotel'}/confirmation?${params.toString()}`);
      },
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-display text-midnight mb-6">Complete Your Booking</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-2">
          <CheckoutForm onSubmit={handleCheckout} isLoading={false} totalAmount={totalWithTax} currency="GBP" clientSecret={clientSecret} />
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-24">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-display text-midnight text-lg">Booking Summary</h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <BedDouble size={16} className="text-teal shrink-0" />
                  <div>
                    <p className="text-sm font-body text-midnight font-medium">
                      {roomType?.name || 'Selected Room'}
                    </p>
                    <p className="text-xs text-charcoal/60 font-body">
                      {property?.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-teal shrink-0" />
                  <div>
                    <p className="text-sm font-body text-charcoal/70">
                      {checkIn && format(new Date(checkIn), 'EEE, MMM d')} –{' '}
                      {checkOut && format(new Date(checkOut), 'EEE, MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-charcoal/50 font-body">
                      {nights} night{nights !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users size={16} className="text-teal shrink-0" />
                  <p className="text-sm font-body text-charcoal/70">
                    {guests} guest{guests !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm font-body">
                  <span className="text-charcoal/60">
                    £{rate} × {nights} night{nights !== 1 ? 's' : ''}
                  </span>
                  <span className="text-midnight">£{total.toFixed(2)}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-sm font-body">
                    <span className="text-emerald-600 flex items-center gap-1"><Tag size={12} /> {appliedPromo.code}</span>
                    <span className="text-emerald-600">-£{appliedPromo.discount.toFixed(2)}</span>
                  </div>
                )}
                {selectedAddons.size > 0 && ADDONS.filter(a => selectedAddons.has(a.id)).map(addon => (
                  <div key={addon.id} className="flex justify-between text-sm font-body">
                    <span className="text-charcoal/60">{addon.name}</span>
                    <span className="text-midnight">£{(addon.priceFlat ?? (addon.pricePerNight ?? 0) * nights).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-body">
                  <span className="text-charcoal/60">Taxes & fees ({Math.round(TAX_RATE * 100)}%)</span>
                  <span className="text-midnight">£{taxAmount.toFixed(2)}</span>
                </div>
              </div>

              <Separator />

              {/* Promo Code */}
              <div>
                <p className="text-xs font-body font-semibold text-midnight mb-1.5">Promo Code</p>
                <div className="flex gap-1.5">
                  <input
                    value={promoCode}
                    onChange={e => { setPromoCode(e.target.value); setPromoError(''); }}
                    placeholder="Enter code"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-charcoal/15 text-xs font-body focus:outline-none focus:ring-1 focus:ring-teal/30"
                    disabled={!!appliedPromo}
                  />
                  {appliedPromo ? (
                    <button onClick={() => { setAppliedPromo(null); setPromoCode(''); }} className="px-3 py-1.5 rounded-lg text-xs font-body text-red-500 border border-red-200 hover:bg-red-50 transition-all">
                      Remove
                    </button>
                  ) : (
                    <button onClick={handleApplyPromo} className="px-3 py-1.5 rounded-lg text-xs font-body font-semibold text-white bg-teal hover:bg-teal/90 transition-all">
                      Apply
                    </button>
                  )}
                </div>
                {promoError && <p className="text-[10px] text-red-500 font-body mt-1">{promoError}</p>}
                {appliedPromo && <p className="text-[10px] text-emerald-600 font-body mt-1 flex items-center gap-1"><Check size={10} /> Code applied!</p>}
              </div>

              <Separator />

              {/* Add-ons */}
              <div>
                <p className="text-xs font-body font-semibold text-midnight mb-1.5">Enhance Your Stay</p>
                <div className="space-y-1.5">
                  {ADDONS.map(addon => (
                    <button
                      key={addon.id}
                      onClick={() => {
                        const next = new Set(selectedAddons);
                        if (next.has(addon.id)) next.delete(addon.id); else next.add(addon.id);
                        setSelectedAddons(next);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg border text-left transition-all text-xs ${
                        selectedAddons.has(addon.id)
                          ? 'bg-teal/5 border-teal/30'
                          : 'border-charcoal/10 hover:border-charcoal/20'
                      }`}
                    >
                      <div>
                        <p className="font-body font-medium text-midnight">{addon.name}</p>
                        <p className="text-[10px] text-charcoal/50 font-body">{addon.description}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-body font-semibold text-midnight">
                          £{addon.priceFlat ?? `${addon.pricePerNight}/nt`}
                        </span>
                        {selectedAddons.has(addon.id) ? (
                          <Check size={14} className="text-teal" />
                        ) : (
                          <Plus size={14} className="text-charcoal/30" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="font-body font-semibold text-midnight">Total</span>
                <span className="font-display text-xl text-midnight">
                  £{totalWithTax.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-charcoal/50 font-body">
                <Shield size={14} className="text-teal" />
                Free cancellation up to 48 hours before check-in
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
