import { type FC } from 'react';
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

interface BookingFormProps {
  onSubmit: (data: BookingFormData) => void;
  isLoading?: boolean;
  onCancel?: () => void;
}

export const BookingForm: FC<BookingFormProps> = ({ onSubmit, isLoading, onCancel }) => {
  const { propertyId } = useProperty();
  const { roomTypes } = useRooms();

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
