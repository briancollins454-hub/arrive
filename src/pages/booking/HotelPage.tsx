import { useParams } from 'react-router-dom';
import { useBookingProperty } from '@/hooks/useBookingProperty';
import { HotelHero } from '@/components/booking/HotelHero';
import { BookingBar } from '@/components/booking/BookingBar';
import { DirectBookingBadge } from '@/components/booking/DirectBookingBadge';
import { PageSpinner } from '@/components/shared/LoadingSpinner';
import { Star, MapPin, Phone, Mail, Wifi, Car, Coffee, Waves } from 'lucide-react';

const DEFAULT_HIGHLIGHTS = [
  { icon: Wifi, label: 'Free Wi-Fi' },
  { icon: Car, label: 'Parking' },
  { icon: Coffee, label: 'Restaurant' },
  { icon: Waves, label: 'Spa & Wellness' },
];

export function HotelPage() {
  const { slug } = useParams<{ slug: string }>();
  const { property, isLoading } = useBookingProperty();

  if (isLoading) return <PageSpinner />;
  if (!property) return <div className="text-center py-20 text-charcoal/60 font-body">Property not found</div>;

  const starRating = (property as { star_rating?: number }).star_rating ?? 4;
  const highlights = (property as { highlights?: typeof DEFAULT_HIGHLIGHTS }).highlights ?? DEFAULT_HIGHLIGHTS;

  return (
    <div>
      {/* Hero */}
      <HotelHero property={property} />

      {/* Booking Bar */}
      <div className="max-w-5xl mx-auto px-4 -mt-8 relative z-10">
        <BookingBar slug={slug || property.slug} />
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* About */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <DirectBookingBadge />
              </div>
              <h2 className="text-3xl font-display text-midnight mb-4">
                Welcome to {property.name}
              </h2>
              <p className="text-charcoal/70 font-body leading-relaxed">
                {property.description ||
                  `Experience the finest hospitality at ${property.name}. Located in the heart of ${property.address.city}, our hotel offers a perfect blend of luxury and comfort. Book directly for the best rates and exclusive perks.`}
              </p>
            </div>

            {/* Highlights */}
            <div>
              <h3 className="text-xl font-display text-midnight mb-4">Hotel Highlights</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {highlights.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-stone/20 bg-stone/5"
                  >
                    <Icon size={24} className="text-teal" />
                    <span className="text-sm font-body text-charcoal">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div>
              <h3 className="text-xl font-display text-midnight mb-4">Guest Rating</h3>
              <div className="flex items-center gap-3">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={20}
                      className={i < starRating ? 'fill-gold text-gold' : 'text-stone/30'}
                    />
                  ))}
                </div>
                <span className="text-sm text-charcoal/60 font-body">{starRating}-star hotel</span>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-cream rounded-2xl p-6 border border-stone/20">
              <h3 className="font-display text-midnight text-lg mb-4">Contact</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="text-teal mt-0.5 shrink-0" />
                  <p className="text-sm font-body text-charcoal/70">
                    {[property.address.line1, property.address.city, property.address.postcode]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
                {property.contact.phone && (
                  <div className="flex items-center gap-3">
                    <Phone size={16} className="text-teal shrink-0" />
                    <a
                      href={`tel:${property.contact.phone}`}
                      className="text-sm font-body text-charcoal/70 hover:text-teal transition-colors"
                    >
                      {property.contact.phone}
                    </a>
                  </div>
                )}
                {property.contact.email && (
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-teal shrink-0" />
                    <a
                      href={`mailto:${property.contact.email}`}
                      className="text-sm font-body text-charcoal/70 hover:text-teal transition-colors"
                    >
                      {property.contact.email}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-midnight rounded-2xl p-6 text-white">
              <h3 className="font-display text-lg mb-3">Why Book Direct?</h3>
              <ul className="space-y-2 text-sm font-body text-white/70">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                  Best rate guarantee
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                  Free cancellation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                  Complimentary welcome drink
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                  No hidden fees
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
