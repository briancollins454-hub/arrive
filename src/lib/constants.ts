// ============================================================
// ARRIVÉ — Application Constants
// ============================================================

export const APP_NAME = 'Arrivé';
export const APP_TAGLINE = 'The all-in-one booking platform for boutique hotels';
export const COMPANY_NAME = 'The Supports Desk';

// Booking source display labels
export const SOURCE_LABELS: Record<string, string> = {
  direct: 'Direct',
  phone: 'Phone',
  walk_in: 'Walk-In',
  booking_com: 'Booking.com',
  expedia: 'Expedia',
  hotels_com: 'Hotels.com',
  airbnb: 'Airbnb',
  agoda: 'Agoda',
  tripadvisor: 'TripAdvisor',
  travel_agent: 'Travel Agent',
  corporate: 'Corporate',
  other: 'Other',
};

export function getSourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

// ============================================================
// BRAND COLOURS (mirrors tailwind.config.ts)
// ============================================================

export const COLORS = {
  midnight: '#0F172A',
  charcoal: '#1E293B',
  slate: '#334155',
  steel: '#64748B',
  silver: '#94A3B8',
  mist: '#CBD5E1',
  cloud: '#E2E8F0',
  snow: '#F1F5F9',
  white: '#FFFFFF',
  gold: '#D4A853',
  goldLight: '#E8C97A',
  goldDark: '#B8892E',
  goldSubtle: '#F5ECD7',
  teal: '#0D9488',
  tealLight: '#14B8A6',
  tealDark: '#0F766E',
  success: '#059669',
  warning: '#D97706',
  danger: '#E11D48',
  info: '#2563EB',
} as const;

// ============================================================
// ROOM AMENITIES
// ============================================================

export const AMENITIES = [
  { id: 'wifi', label: 'Free WiFi', icon: 'Wifi' },
  { id: 'tv', label: 'Smart TV', icon: 'Tv' },
  { id: 'minibar', label: 'Minibar', icon: 'Wine' },
  { id: 'sea_view', label: 'Sea View', icon: 'Waves' },
  { id: 'garden_view', label: 'Garden View', icon: 'Trees' },
  { id: 'balcony', label: 'Balcony', icon: 'DoorOpen' },
  { id: 'bath', label: 'Bath', icon: 'Bath' },
  { id: 'rainfall_shower', label: 'Rainfall Shower', icon: 'Droplets' },
  { id: 'air_con', label: 'Air Conditioning', icon: 'Snowflake' },
  { id: 'safe', label: 'In-Room Safe', icon: 'Lock' },
  { id: 'tea_coffee', label: 'Tea & Coffee', icon: 'Coffee' },
  { id: 'iron', label: 'Iron & Board', icon: 'Shirt' },
  { id: 'hairdryer', label: 'Hairdryer', icon: 'Wind' },
  { id: 'desk', label: 'Work Desk', icon: 'Monitor' },
  { id: 'parking', label: 'Free Parking', icon: 'Car' },
  { id: 'pet_friendly', label: 'Pet Friendly', icon: 'PawPrint' },
  { id: 'accessible', label: 'Accessible', icon: 'Accessibility' },
  { id: 'living_area', label: 'Living Area', icon: 'Sofa' },
  { id: 'kitchen', label: 'Kitchenette', icon: 'ChefHat' },
] as const;

// ============================================================
// BED TYPES
// ============================================================

export const BED_TYPES = [
  { id: 'single', label: 'Single' },
  { id: 'double', label: 'Double' },
  { id: 'king', label: 'King' },
  { id: 'super_king', label: 'Super King' },
  { id: 'twin', label: 'Twin' },
  { id: 'bunk', label: 'Bunk Bed' },
  { id: 'sofa_bed', label: 'Sofa Bed' },
  { id: 'cot', label: 'Cot / Crib' },
] as const;

// ============================================================
// BOOKING SOURCES
// ============================================================

export const BOOKING_SOURCES = [
  { id: 'direct', label: 'Direct (Website)' },
  { id: 'phone', label: 'Phone' },
  { id: 'walk_in', label: 'Walk-In' },
  { id: 'booking_com', label: 'Booking.com' },
  { id: 'expedia', label: 'Expedia' },
  { id: 'hotels_com', label: 'Hotels.com' },
  { id: 'airbnb', label: 'Airbnb' },
  { id: 'agoda', label: 'Agoda' },
  { id: 'tripadvisor', label: 'TripAdvisor' },
  { id: 'travel_agent', label: 'Travel Agent' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'other', label: 'Other' },
] as const;

// ============================================================
// MESSAGE TEMPLATE VARIABLES
// ============================================================

export const TEMPLATE_VARIABLES = [
  { variable: '{{guest_name}}', description: 'Guest full name' },
  { variable: '{{guest_first_name}}', description: 'Guest first name' },
  { variable: '{{confirmation_code}}', description: 'Booking confirmation code' },
  { variable: '{{check_in}}', description: 'Check-in date (formatted)' },
  { variable: '{{check_out}}', description: 'Check-out date (formatted)' },
  { variable: '{{check_in_time}}', description: 'Property check-in time' },
  { variable: '{{check_out_time}}', description: 'Property check-out time' },
  { variable: '{{room_type}}', description: 'Room type name' },
  { variable: '{{num_nights}}', description: 'Number of nights' },
  { variable: '{{total_amount}}', description: 'Total booking amount' },
  { variable: '{{property_name}}', description: 'Hotel/property name' },
  { variable: '{{property_phone}}', description: 'Hotel phone number' },
  { variable: '{{property_email}}', description: 'Hotel email address' },
] as const;
