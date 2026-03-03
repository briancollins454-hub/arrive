import { type FC } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { roomTypeSchema, type RoomTypeFormData } from '@/lib/validators';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/Select';
import { AMENITIES, BED_TYPES } from '@/lib/constants';
import { Plus, Trash2 } from 'lucide-react';
import type { RoomType } from '@/types';

interface RoomTypeEditorProps {
  roomType?: RoomType | null;
  onSubmit: (data: RoomTypeFormData) => void;
  isLoading?: boolean;
  onCancel?: () => void;
}

export const RoomTypeEditor: FC<RoomTypeEditorProps> = ({
  roomType,
  onSubmit,
  isLoading,
  onCancel,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<RoomTypeFormData>({
    resolver: zodResolver(roomTypeSchema),
    defaultValues: {
      name: roomType?.name ?? '',
      description: roomType?.description ?? '',
      base_rate: roomType?.base_rate ?? 0,
      max_occupancy: roomType?.max_occupancy ?? 2,
      amenities: roomType?.amenities ?? [],
      bed_config: roomType?.bed_config ?? [{ type: 'double', count: 1 }],
      sort_order: roomType?.sort_order ?? 0,
      is_active: roomType?.is_active ?? true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'bed_config',
  });

  const selectedAmenities = watch('amenities') ?? [];

  const toggleAmenity = (amenityId: string) => {
    const current = selectedAmenities;
    const next = current.includes(amenityId)
      ? current.filter((a) => a !== amenityId)
      : [...current, amenityId];
    setValue('amenities', next);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label variant="dark">Name *</Label>
          <Input variant="dark" {...register('name')} placeholder="e.g. Deluxe Double" />
          {errors.name && <p className="text-xs text-danger mt-1">{errors.name.message}</p>}
        </div>
        <div className="col-span-2">
          <Label variant="dark">Description</Label>
          <Textarea variant="dark" {...register('description')} placeholder="Describe this room type…" rows={3} />
        </div>
        <div>
          <Label variant="dark">Base Rate (£/night) *</Label>
          <Input variant="dark" type="number" step="0.01" min={0} {...register('base_rate', { valueAsNumber: true })} />
          {errors.base_rate && <p className="text-xs text-danger mt-1">{errors.base_rate.message}</p>}
        </div>
        <div>
          <Label variant="dark">Max Occupancy *</Label>
          <Input variant="dark" type="number" min={1} max={20} {...register('max_occupancy', { valueAsNumber: true })} />
        </div>
      </div>

      {/* Bed config */}
      <div>
        <Label variant="dark">Bed Configuration</Label>
        <div className="space-y-2 mt-1">
          {fields.map((field, idx) => (
            <div key={field.id} className="flex items-center gap-2">
              <Select
                value={watch(`bed_config.${idx}.type`)}
                onValueChange={(v) => setValue(`bed_config.${idx}.type`, v)}
              >
                <SelectTrigger variant="dark" className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent variant="dark">
                  {BED_TYPES.map((bt) => (
                    <SelectItem key={bt.id} value={bt.id}>{bt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                variant="dark"
                type="number"
                min={1}
                className="w-20"
                {...register(`bed_config.${idx}.count`, { valueAsNumber: true })}
              />
              <Button type="button" variant="ghost-dark" size="icon-sm" onClick={() => remove(idx)}>
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost-dark"
            size="sm"
            onClick={() => append({ type: 'double', count: 1 })}
          >
            <Plus size={14} className="mr-1" /> Add Bed
          </Button>
        </div>
      </div>

      {/* Amenities */}
      <div>
        <Label variant="dark">Amenities</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {AMENITIES.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => toggleAmenity(a.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-body transition-all ${
                selectedAmenities.includes(a.id)
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'bg-slate/30 text-steel border border-slate hover:border-steel'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && <Button type="button" variant="ghost-dark" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving…' : roomType ? 'Update Room Type' : 'Create Room Type'}
        </Button>
      </div>
    </form>
  );
};
