import type { FC } from 'react';
import type { Property } from '@/types';
import { MapPin } from 'lucide-react';

interface HotelHeroProps {
  property: Property;
}

export const HotelHero: FC<HotelHeroProps> = ({ property }) => {
  return (
    <div className="relative bg-midnight text-white overflow-hidden">
      {/* Background gradient fallback */}
      <div className="absolute inset-0 bg-gradient-to-br from-midnight via-charcoal to-slate" />

      {/* Cover image */}
      {property.branding.cover_images.length > 0 && (
        <img
          src={property.branding.cover_images[0]}
          alt={property.name}
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
      )}

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <h1 className="text-3xl sm:text-5xl font-display mb-3">
          {property.name}
        </h1>

        {property.address && (
          <p className="flex items-center justify-center gap-2 text-silver text-sm sm:text-base font-body mb-4">
            <MapPin size={16} />
            {property.address.city}, {property.address.country}
          </p>
        )}

        {property.description && (
          <p className="text-silver font-body max-w-xl mx-auto text-sm sm:text-base">
            {property.description}
          </p>
        )}
      </div>
    </div>
  );
};
