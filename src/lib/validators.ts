import { z } from 'zod';

// ============================================================
// ARRIVÉ — Zod Validation Schemas
// ============================================================

// ---- Guest ----
export const guestSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  nationality: z.string().max(100).optional().or(z.literal('')),
  preferences: z.object({
    dietary: z.string().optional(),
    room_pref: z.string().optional(),
    allergies: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
  tags: z.array(z.string()).optional(),
});

export type GuestFormData = z.infer<typeof guestSchema>;

// ---- Booking ----
export const bookingSchema = z.object({
  property_id: z.string().min(1, 'Property is required'),
  room_type_id: z.string().min(1, 'Select a room type'),
  room_id: z.string().optional().nullable(),
  check_in: z.string().min(1, 'Check-in date is required'),
  check_out: z.string().min(1, 'Check-out date is required'),
  num_guests: z.number().min(1, 'At least 1 guest').max(20),
  nightly_rate: z.number().min(0, 'Rate cannot be negative').optional(),
  source: z.enum(['direct', 'phone', 'walk_in', 'booking_com', 'expedia', 'hotels_com', 'airbnb', 'agoda', 'tripadvisor', 'travel_agent', 'corporate', 'other']).optional(),
  special_requests: z.string().max(1000).optional().or(z.literal('')),
  internal_notes: z.string().max(1000).optional().or(z.literal('')),
  guest: guestSchema,
}).refine(
  (data) => new Date(data.check_out) > new Date(data.check_in),
  { message: 'Check-out must be after check-in', path: ['check_out'] }
);

export type BookingFormData = z.infer<typeof bookingSchema>;

// ---- Room Type ----
export const roomTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional().or(z.literal('')),
  base_rate: z.number().min(0, 'Rate must be positive'),
  max_occupancy: z.number().min(1).max(20),
  amenities: z.array(z.string()).optional(),
  bed_config: z.array(z.object({
    type: z.string(),
    count: z.number().min(1),
  })).optional(),
  sort_order: z.number().optional(),
  is_active: z.boolean().optional(),
});

export type RoomTypeFormData = z.infer<typeof roomTypeSchema>;

// ---- Room ----
export const roomSchema = z.object({
  room_type_id: z.string().min(1, 'Select a room type'),
  room_number: z.string().min(1, 'Room number is required').max(20),
  floor: z.number().optional().nullable(),
  status: z.enum(['available', 'occupied', 'reserved', 'maintenance', 'blocked']).optional(),
  notes: z.string().max(500).optional().or(z.literal('')),
});

export type RoomFormData = z.infer<typeof roomSchema>;

// ---- Rate Period ----
export const ratePeriodSchema = z.object({
  room_type_id: z.string().optional().nullable(),
  name: z.string().min(1, 'Name is required').max(200),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  rate: z.number().min(0.01, 'Rate must be positive'),
  min_stay: z.number().min(1).optional(),
  is_active: z.boolean().optional(),
}).refine(
  (data) => new Date(data.end_date) >= new Date(data.start_date),
  { message: 'End date must be on or after start date', path: ['end_date'] }
);

export type RatePeriodFormData = z.infer<typeof ratePeriodSchema>;

// ---- Message Template ----
export const messageTemplateSchema = z.object({
  trigger: z.enum(['booking_confirmed', 'pre_arrival', 'check_in_reminder', 'check_out_reminder', 'post_stay', 'cancellation', 'no_show', 'custom']),
  channel: z.enum(['email', 'sms', 'whatsapp', 'system']),
  name: z.string().min(1, 'Name is required').max(200),
  subject: z.string().max(500).optional().or(z.literal('')),
  body: z.string().min(1, 'Message body is required').max(5000),
  send_offset_hours: z.number().optional(),
  is_active: z.boolean().optional(),
});

export type MessageTemplateFormData = z.infer<typeof messageTemplateSchema>;

// ---- Property Settings ----
export const propertySettingsSchema = z.object({
  name: z.string().min(1, 'Property name is required').max(200),
  description: z.string().max(2000).optional().or(z.literal('')),
  address: z.object({
    line1: z.string().min(1, 'Address is required'),
    line2: z.string().optional().or(z.literal('')),
    city: z.string().min(1, 'City is required'),
    county: z.string().optional().or(z.literal('')),
    postcode: z.string().min(1, 'Postcode is required'),
    country: z.string().min(1, 'Country is required'),
  }),
  contact: z.object({
    phone: z.string().min(1, 'Phone is required'),
    email: z.string().email('Invalid email'),
    website: z.string().url().optional().or(z.literal('')),
  }),
  settings: z.object({
    check_in_time: z.string(),
    check_out_time: z.string(),
    currency: z.string(),
    timezone: z.string(),
    cancellation_hours: z.number().min(0),
    deposit_percentage: z.number().min(0).max(100),
    allow_same_day_booking: z.boolean(),
    max_advance_days: z.number().min(1).max(730),
  }),
});

export type PropertySettingsFormData = z.infer<typeof propertySettingsSchema>;

// ---- Availability Query ----
export const availabilityQuerySchema = z.object({
  check_in: z.string().min(1, 'Check-in date is required'),
  check_out: z.string().min(1, 'Check-out date is required'),
  guests: z.number().min(1).max(20),
}).refine(
  (data) => new Date(data.check_out) > new Date(data.check_in),
  { message: 'Check-out must be after check-in', path: ['check_out'] }
);

export type AvailabilityQueryFormData = z.infer<typeof availabilityQuerySchema>;

// ---- Guest Checkout (Booking Engine) ----
export const checkoutSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(1, 'Phone number is required'),
  special_requests: z.string().max(1000).optional().or(z.literal('')),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;

// ---- Login ----
export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
