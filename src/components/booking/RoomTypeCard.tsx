import { useState, type FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, BedDouble, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, calculateNights } from '@/lib/utils';
import { AMENITIES } from '@/lib/constants';
import type { AvailableRoomType } from '@/types';

interface RoomTypeCardProps {
  room: AvailableRoomType;
  slug: string;
}

export const RoomTypeCard: FC<RoomTypeCardProps> = ({ room, slug }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const checkIn = searchParams.get('check_in') ?? '';
  const checkOut = searchParams.get('check_out') ?? '';
  const nights = checkIn && checkOut ? calculateNights(checkIn, checkOut) : 1;
  const [activeImage, setActiveImage] = useState(0);

  const handleSelect = () => {
    const params = new URLSearchParams({
      check_in: checkIn,
      check_out: checkOut,
      guests: searchParams.get('guests') ?? '2',
      room_type_id: room.room_type_id,
    });
    navigate(`/book/${slug}/checkout?${params.toString()}`);
  };

  const getAmenityLabel = (id: string) =>
    AMENITIES.find((a) => a.id === id)?.label ?? id;

  return (
    <div className="card-light flex flex-col sm:flex-row gap-5">
      {/* Photos */}
      <div className="sm:w-64 shrink-0 flex flex-col gap-2">
        <div className="h-48 sm:h-44 rounded-lg bg-gradient-to-br from-snow to-cloud flex items-center justify-center overflow-hidden">
          {room.images.length > 0 ? (
            <img
              src={room.images[Math.min(activeImage, room.images.length - 1)]}
              alt={room.room_type_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <BedDouble size={48} className="text-cloud" />
          )}
        </div>
        {room.images.length > 1 && (
          <div className="flex gap-1.5">
            {room.images.slice(0, 4).map((src, i) => (
              <button
                key={`${src.slice(0, 24)}-${i}`}
                type="button"
                onClick={() => setActiveImage(i)}
                className={`relative h-12 w-full rounded-md overflow-hidden border transition-all ${
                  activeImage === i ? 'border-gold ring-1 ring-gold' : 'border-cloud hover:border-steel'
                }`}
                aria-label={`View photo ${i + 1}`}
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
                {i === 3 && room.images.length > 4 && (
                  <span className="absolute inset-0 bg-midnight/60 text-white text-xs font-body flex items-center justify-center">
                    +{room.images.length - 4}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-lg font-display text-midnight">
              {room.room_type_name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1 text-xs text-steel font-body">
                <Users size={12} /> Up to {room.max_occupancy} guests
              </span>
              <Badge variant={room.available_rooms > 2 ? 'success' : 'warning'}>
                {room.available_rooms} left
              </Badge>
            </div>
          </div>
        </div>

        {room.description && (
          <p className="text-sm text-steel font-body mb-3">
            {room.description}
          </p>
        )}

        {/* Amenities */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {room.amenities.slice(0, 6).map((a) => (
            <span
              key={a}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-snow rounded text-[11px] text-steel font-body"
            >
              <Check size={10} className="text-teal" />
              {getAmenityLabel(a)}
            </span>
          ))}
          {room.amenities.length > 6 && (
            <span className="text-[11px] text-steel font-body px-2 py-0.5">
              +{room.amenities.length - 6} more
            </span>
          )}
        </div>

        {/* Bed config */}
        <div className="flex items-center gap-2 text-xs text-steel font-body mb-4">
          <BedDouble size={12} />
          {room.bed_config.map((bc, i) => (
            <span key={i}>
              {bc.count}× {bc.type.charAt(0).toUpperCase() + bc.type.slice(1)}
              {i < room.bed_config.length - 1 ? ', ' : ''}
            </span>
          ))}
        </div>

        {/* Price & CTA */}
        <div className="mt-auto flex items-end justify-between pt-3 border-t border-cloud">
          <div>
            <span className="text-2xl font-bold text-midnight font-body">
              {formatCurrency(room.effective_rate)}
            </span>
            <span className="text-sm text-steel font-body"> / night</span>
            {nights > 1 && (
              <p className="text-xs text-steel font-body mt-0.5">
                {formatCurrency(room.effective_rate * nights)} total · {nights} nights
              </p>
            )}
          </div>
          <Button onClick={handleSelect} disabled={room.available_rooms === 0}>
            {room.available_rooms === 0 ? 'Sold Out' : 'Select Room'}
          </Button>
        </div>
      </div>
    </div>
  );
};
