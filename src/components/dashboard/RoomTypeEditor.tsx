import { type FC, useRef, useState } from 'react';
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
import { Plus, Trash2, ImagePlus, Star, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { RoomType } from '@/types';

/**
 * Read an image File and return a downscaled, compressed data URL.
 * Storing data URLs in the room_types.images text[] column keeps photos
 * working identically in demo mode (in-memory) and real Supabase mode,
 * with no storage bucket to provision. Raster images are resized to keep
 * the encoded string small; vector/animated formats pass through untouched.
 */
async function fileToDataUrl(file: File, maxDim = 1280, quality = 0.82): Promise<string> {
  const original = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });

  if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) return original;

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(original);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(original);
    img.src = original;
  });
}

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
      images: roomType?.images ?? [],
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

  // ---- Photos ----
  const images = watch('images') ?? [];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const setImages = (next: string[]) => setValue('images', next, { shouldDirty: true });

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) {
      toast.error('Please choose image files');
      return;
    }
    setIsProcessing(true);
    try {
      const dataUrls = await Promise.all(files.map((f) => fileToDataUrl(f)));
      setImages([...images, ...dataUrls]);
      toast.success(`${dataUrls.length} photo${dataUrls.length !== 1 ? 's' : ''} added`);
    } catch {
      toast.error('Could not process one or more images');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (idx: number) => setImages(images.filter((_, i) => i !== idx));

  const makeCover = (idx: number) => {
    const picked = images[idx];
    if (idx === 0 || picked === undefined) return;
    setImages([picked, ...images.filter((_, i) => i !== idx)]);
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

      {/* Photos */}
      <div>
        <Label variant="dark">Photos</Label>
        <p className="text-xs text-steel font-body mt-0.5 mb-2">
          Add photos guests will see when booking this room. The first photo is used as the cover.
        </p>

        {images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
            {images.map((src, idx) => (
              <div
                key={`${src.slice(0, 24)}-${idx}`}
                className="group relative aspect-[4/3] rounded-lg overflow-hidden border border-slate bg-slate/30"
              >
                <img src={src} alt={`Room photo ${idx + 1}`} className="w-full h-full object-cover" />

                {idx === 0 && (
                  <span className="absolute top-1 left-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gold/90 text-midnight text-[10px] font-body font-semibold">
                    <Star size={10} className="fill-current" /> Cover
                  </span>
                )}

                <div className="absolute inset-0 bg-midnight/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                  {idx !== 0 && (
                    <button
                      type="button"
                      onClick={() => makeCover(idx)}
                      title="Set as cover"
                      className="p-1.5 rounded-md bg-white/10 text-white hover:bg-gold hover:text-midnight transition-colors"
                    >
                      <Star size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    title="Remove photo"
                    className="p-1.5 rounded-md bg-white/10 text-white hover:bg-danger hover:text-white transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <button
          type="button"
          disabled={isProcessing}
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-lg border border-dashed border-slate hover:border-gold/50 bg-slate/20 hover:bg-slate/30 text-steel hover:text-silver transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <><Loader2 size={20} className="animate-spin" /> <span className="text-sm font-body">Processing…</span></>
          ) : (
            <>
              <ImagePlus size={20} />
              <span className="text-sm font-body font-medium">Upload photos</span>
              <span className="text-xs font-body text-steel/70">Click to choose images from your device</span>
            </>
          )}
        </button>
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
