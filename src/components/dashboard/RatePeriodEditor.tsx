import { type FC } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ratePeriodSchema, type RatePeriodFormData } from '@/lib/validators';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/Select';
import { useRooms } from '@/hooks/useRooms';
import type { RatePeriod } from '@/types';

interface RatePeriodEditorProps {
  ratePeriod?: RatePeriod | null;
  onSubmit: (data: RatePeriodFormData) => void;
  isLoading?: boolean;
  onCancel?: () => void;
}

export const RatePeriodEditor: FC<RatePeriodEditorProps> = ({
  ratePeriod,
  onSubmit,
  isLoading,
  onCancel,
}) => {
  const { roomTypes } = useRooms();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RatePeriodFormData>({
    resolver: zodResolver(ratePeriodSchema),
    defaultValues: {
      name: ratePeriod?.name ?? '',
      room_type_id: ratePeriod?.room_type_id ?? null,
      start_date: ratePeriod?.start_date ?? '',
      end_date: ratePeriod?.end_date ?? '',
      rate: ratePeriod?.rate ?? 0,
      min_stay: ratePeriod?.min_stay ?? 1,
      is_active: ratePeriod?.is_active ?? true,
    },
  });

  const selectedRoomType = watch('room_type_id');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label variant="dark">Period Name *</Label>
        <Input variant="dark" {...register('name')} placeholder="e.g. Summer Peak" />
        {errors.name && <p className="text-xs text-danger mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <Label variant="dark">Room Type (leave blank for all)</Label>
        <Select
          value={selectedRoomType ?? ''}
          onValueChange={(v) => setValue('room_type_id', v || null)}
        >
          <SelectTrigger variant="dark">
            <SelectValue placeholder="All room types" />
          </SelectTrigger>
          <SelectContent variant="dark">
            <SelectItem value="">All Room Types</SelectItem>
            {roomTypes.map((rt) => (
              <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label variant="dark">Start Date *</Label>
          <Input variant="dark" type="date" {...register('start_date')} />
          {errors.start_date && <p className="text-xs text-danger mt-1">{errors.start_date.message}</p>}
        </div>
        <div>
          <Label variant="dark">End Date *</Label>
          <Input variant="dark" type="date" {...register('end_date')} />
          {errors.end_date && <p className="text-xs text-danger mt-1">{errors.end_date.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label variant="dark">Rate (£/night) *</Label>
          <Input variant="dark" type="number" step="0.01" min={0.01} {...register('rate', { valueAsNumber: true })} />
          {errors.rate && <p className="text-xs text-danger mt-1">{errors.rate.message}</p>}
        </div>
        <div>
          <Label variant="dark">Min Stay (nights)</Label>
          <Input variant="dark" type="number" min={1} {...register('min_stay', { valueAsNumber: true })} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="rate-active" {...register('is_active')} className="accent-gold" />
        <Label variant="dark" htmlFor="rate-active">Active</Label>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && <Button type="button" variant="ghost-dark" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving…' : ratePeriod ? 'Update Rate' : 'Create Rate Period'}
        </Button>
      </div>
    </form>
  );
};
