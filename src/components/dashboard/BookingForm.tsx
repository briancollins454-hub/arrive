import { type FC, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { bookingSchema, type BookingFormData } from '@/lib/validators';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/Select';
import { BOOKING_SOURCES } from '@/lib/constants';
import { useProperty } from '@/hooks/useProperty';
import { useRooms } from '@/hooks/useRooms';
import { useRatePeriods } from '@/hooks/useRatePeriods';
import { Gift } from 'lucide-react';
import { parseISO } from 'date-fns';

interface BookingFormProps {
  onSubmit: (data: BookingFormData) => void;
  isLoading?: boolean;
  onCancel?: () => void;
}

export const BookingForm: FC<BookingFormProps> = ({ onSubmit, isLoading, onCancel }) => {
  const { propertyId } = useProperty();
  const { roomTypes } = useRooms();
  const { ratePeriods } = useRatePeriods();
  const [isComp, setIsComp] = useState(false);
  const [rateOverride, setRateOverride] = useState<string>('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      property_id: propertyId ?? '',
      num_guests: 1,
      source: 'direct',
      guest: { first_name: '', last_name: '', email: '', phone: '' },
    },
  });

  const selectedSource = watch('source');
  const checkInValue = watch('check_in');
  const selectedRoomTypeId = watch('room_type_id');

  // Calculate effective rate when room type changes
  const selectedRoomType = roomTypes.find(rt => rt.id === selectedRoomTypeId);
  const effectiveRate = (() => {
    if (!selectedRoomType) return 0;
    const now = new Date();
    const activePeriod = ratePeriods.find(rp =>
      rp.room_type_id === selectedRoomType.id && rp.is_active &&
      parseISO(rp.start_date) <= now && parseISO(rp.end_date) >= now
    );
    return activePeriod ? activePeriod.rate : selectedRoomType.base_rate;
  })();

  // Update rate override display when room type changes
  useEffect(() => {
    if (selectedRoomType && !isComp) {
      setRateOverride(String(effectiveRate));
      setValue('nightly_rate', effectiveRate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomTypeId, effectiveRate]);

  // Handle comp toggle
  useEffect(() => {
    if (isComp) {
      setRateOverride('0');
      setValue('nightly_rate', 0);
    } else if (selectedRoomType) {
      setRateOverride(String(effectiveRate));
      setValue('nightly_rate', effectiveRate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComp]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Guest Details */}
      <div>
        <h3 className="text-sm font-semibold text-white font-body mb-3">Guest Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label variant="dark">First Name *</Label>
            <Input variant="dark" {...register('guest.first_name')} placeholder="Enter first name" />
            {errors.guest?.first_name && (
              <p className="text-xs text-danger mt-1">{errors.guest.first_name.message}</p>
            )}
          </div>
          <div>
            <Label variant="dark">Last Name *</Label>
            <Input variant="dark" {...register('guest.last_name')} placeholder="Enter last name" />
            {errors.guest?.last_name && (
              <p className="text-xs text-danger mt-1">{errors.guest.last_name.message}</p>
            )}
          </div>
          <div>
            <Label variant="dark">Email</Label>
            <Input variant="dark" type="email" {...register('guest.email')} placeholder="guest@example.com" />
          </div>
          <div>
            <Label variant="dark">Phone</Label>
            <Input variant="dark" {...register('guest.phone')} placeholder="+44 7700 000000" />
          </div>
        </div>
      </div>

      {/* Booking Details */}
      <div>
        <h3 className="text-sm font-semibold text-white font-body mb-3">Booking Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label variant="dark">Room Type *</Label>
            <Select onValueChange={(v) => setValue('room_type_id', v)}>
              <SelectTrigger variant="dark">
                <SelectValue placeholder="Select room type" />
              </SelectTrigger>
              <SelectContent variant="dark">
                {roomTypes.map((rt) => (
                  <SelectItem key={rt.id} value={rt.id}>
                    {rt.name} — £{rt.base_rate}/night
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.room_type_id && (
              <p className="text-xs text-danger mt-1">{errors.room_type_id.message}</p>
            )}
          </div>
          <div>
            <Label variant="dark">Guests *</Label>
            <Input
              variant="dark"
              type="number"
              min={1}
              max={20}
              {...register('num_guests', { valueAsNumber: true })}
            />
          </div>

          {/* Nightly Rate Override */}
          <div>
            <Label variant="dark">Nightly Rate (£) *</Label>
            <div className="relative">
              <Input
                variant="dark"
                type="number"
                min={0}
                step={0.01}
                value={rateOverride}
                onChange={(e) => {
                  const val = e.target.value;
                  setRateOverride(val);
                  const num = parseFloat(val);
                  if (!isNaN(num) && num >= 0) {
                    setValue('nightly_rate', num);
                    if (num === 0) setIsComp(true);
                    else setIsComp(false);
                  }
                }}
                disabled={isComp}
                placeholder={selectedRoomType ? String(effectiveRate) : '0.00'}
                className={isComp ? 'opacity-50' : ''}
              />
              {selectedRoomType && !isComp && rateOverride && parseFloat(rateOverride) !== effectiveRate && (
                <button
                  type="button"
                  onClick={() => {
                    setRateOverride(String(effectiveRate));
                    setValue('nightly_rate', effectiveRate);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gold hover:text-gold/80 font-body"
                >
                  Reset
                </button>
              )}
            </div>
            {errors.nightly_rate && (
              <p className="text-xs text-danger mt-1">{errors.nightly_rate.message}</p>
            )}
          </div>

          {/* Comp Room Toggle */}
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={() => setIsComp(!isComp)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-body transition-all ${
                isComp
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-white/[0.03] border-white/[0.08] text-steel hover:border-white/[0.15] hover:text-silver'
              }`}
            >
              <Gift size={14} />
              Complimentary Room
              {isComp && <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded">£0.00/night</span>}
            </button>
          </div>
          <div>
            <Label variant="dark">Check-in *</Label>
            <Input variant="dark" type="date" min={new Date().toISOString().split('T')[0]} {...register('check_in')} />
            {errors.check_in && (
              <p className="text-xs text-danger mt-1">{errors.check_in.message}</p>
            )}
          </div>
          <div>
            <Label variant="dark">Check-out *</Label>
            <Input variant="dark" type="date" min={checkInValue || new Date().toISOString().split('T')[0]} {...register('check_out')} />
            {errors.check_out && (
              <p className="text-xs text-danger mt-1">{errors.check_out.message}</p>
            )}
          </div>
          <div>
            <Label variant="dark">Source</Label>
            <Select
              value={selectedSource}
              onValueChange={(v) => setValue('source', v as BookingFormData['source'])}
            >
              <SelectTrigger variant="dark">
                <SelectValue />
              </SelectTrigger>
              <SelectContent variant="dark">
                {BOOKING_SOURCES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label variant="dark">Special Requests</Label>
        <Textarea variant="dark" {...register('special_requests')} placeholder="Any special requests…" rows={3} />
      </div>
      <div>
        <Label variant="dark">Internal Notes</Label>
        <Textarea variant="dark" {...register('internal_notes')} placeholder="Staff notes…" rows={2} />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost-dark" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating…' : 'Create Booking'}
        </Button>
      </div>
    </form>
  );
};
