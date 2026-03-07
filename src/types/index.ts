// ============================================================
// ARRIVÉ — Core Application Types
// ============================================================

// These types mirror the database schema.
// After running `npx supabase gen types typescript`, you can
// replace these with auto-generated types from database.ts

export type RoomStatus = 'available' | 'occupied' | 'reserved' | 'maintenance' | 'blocked';
export type HousekeepingStatus = 'clean' | 'dirty' | 'inspected' | 'serviced' | 'service_refused' | 'out_of_order';
export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
export type BookingSource = 'direct' | 'phone' | 'walk_in' | 'booking_com' | 'expedia' | 'hotels_com' | 'airbnb' | 'agoda' | 'tripadvisor' | 'travel_agent' | 'corporate' | 'other';
export type MessageChannel = 'email' | 'sms' | 'whatsapp' | 'system';
export type MessageDirection = 'inbound' | 'outbound';
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'opened';
export type MessageTrigger = 'booking_confirmed' | 'pre_arrival' | 'check_in_reminder' | 'check_out_reminder' | 'post_stay' | 'cancellation' | 'no_show' | 'custom';
export type StaffRole = 'owner' | 'general_manager' | 'front_office_manager' | 'receptionist' | 'concierge' | 'revenue_manager' | 'housekeeping_manager' | 'housekeeping' | 'maintenance' | 'night_auditor' | 'finance' | 'readonly';

// ============================================================
// PROPERTY
// ============================================================

export interface PropertyAddress {
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
}

export interface PropertyContact {
  phone: string;
  email: string;
  website?: string;
}

export interface PropertySettings {
  check_in_time: string;
  check_out_time: string;
  currency: string;
  timezone: string;
  cancellation_hours: number;
  deposit_percentage: number;
  tax_rate: number;
  allow_same_day_booking: boolean;
  max_advance_days: number;
}

export interface PropertyBranding {
  primary_color: string;
  accent_color: string;
  logo_url: string | null;
  cover_images: string[];
}

export interface Property {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: PropertyAddress;
  contact: PropertyContact;
  settings: PropertySettings;
  branding: PropertyBranding;
  stripe_account_id: string | null;
  stripe_publishable_key: string | null;
  stripe_secret_key: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// ROOM TYPES & ROOMS
// ============================================================

export interface BedConfig {
  type: string;
  count: number;
}

export interface RoomType {
  id: string;
  property_id: string;
  name: string;
  description: string | null;
  base_rate: number;
  max_occupancy: number;
  amenities: string[];
  images: string[];
  bed_config: BedConfig[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  property_id: string;
  room_type_id: string;
  room_number: string;
  floor: number | null;
  status: RoomStatus;
  housekeeping_status: HousekeepingStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  room_type?: RoomType;
}

// ============================================================
// RATE PERIODS
// ============================================================

export interface RatePeriod {
  id: string;
  property_id: string;
  room_type_id: string | null;
  name: string;
  start_date: string;
  end_date: string;
  rate: number;
  min_stay: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// GUESTS
// ============================================================

export interface GuestPreferences {
  dietary?: string;
  room_pref?: string;
  allergies?: string;
  notes?: string;
}

export interface Guest {
  id: string;
  property_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  preferences: GuestPreferences;
  total_stays: number;
  total_spend: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// ============================================================
// BOOKINGS
// ============================================================

export interface Booking {
  id: string;
  property_id: string;
  guest_id: string;
  room_type_id: string;
  room_id: string | null;
  confirmation_code: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  status: BookingStatus;
  source: BookingSource;
  nightly_rate: number;
  total_amount: number;
  deposit_amount: number;
  amount_paid: number;
  stripe_payment_id: string | null;
  special_requests: string | null;
  internal_notes: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  created_at: string;
  updated_at: string;
  group_id?: string | null;
  // Joined relations
  guest?: Guest;
  room_type?: RoomType;
  room?: Room;
}

// ============================================================
// MESSAGES
// ============================================================

export interface Message {
  id: string;
  property_id: string;
  booking_id: string | null;
  guest_id: string | null;
  channel: MessageChannel;
  direction: MessageDirection;
  template_id: string | null;
  subject: string | null;
  body: string;
  status: MessageStatus;
  sent_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  property_id: string;
  trigger: MessageTrigger;
  channel: MessageChannel;
  name: string;
  subject: string | null;
  body: string;
  send_offset_hours: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// STAFF
// ============================================================

export interface StaffMember {
  id: string;
  property_id: string;
  name: string;
  email: string;
  role: StaffRole;
  permissions: Record<string, boolean>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// AVAILABILITY (API response type)
// ============================================================

export interface AvailableRoomType {
  room_type_id: string;
  room_type_name: string;
  description: string | null;
  base_rate: number;
  effective_rate: number;
  max_occupancy: number;
  amenities: string[];
  images: string[];
  bed_config: BedConfig[];
  total_rooms: number;
  booked_rooms: number;
  available_rooms: number;
}

// ============================================================
// FORM TYPES
// ============================================================

export interface CreateBookingInput {
  property_id: string;
  room_type_id: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  guest: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  special_requests?: string;
  source?: BookingSource;
  nightly_rate?: number;          // override room-type base rate (e.g. group/negotiated rate)
  room_id?: string | null;        // pre-assign a room at creation
}

export interface AvailabilityQuery {
  property_slug: string;
  check_in: string;
  check_out: string;
  guests: number;
}

// ============================================================
// FOLIO / BILLING
// ============================================================

export type FolioChargeCategory =
  | 'room'        // Nightly room charge
  | 'food'        // Restaurant, room service
  | 'beverage'    // Bar, minibar
  | 'spa'         // Spa & wellness
  | 'laundry'     // Dry cleaning, laundry
  | 'parking'     // Car park
  | 'phone'       // Phone calls
  | 'damage'      // Damage charges
  | 'tax'         // Taxes & levies
  | 'discount'    // Discounts / adjustments (negative)
  | 'city_ledger' // Billback / transfer to company account
  | 'other';      // Miscellaneous

export type FolioEntryType = 'charge' | 'payment' | 'refund' | 'adjustment';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'online' | 'other';

export interface FolioEntry {
  id: string;
  booking_id: string;
  type: FolioEntryType;
  category: FolioChargeCategory;
  description: string;
  amount: number;         // positive for charges, negative for payments/refunds
  quantity: number;
  unit_price: number;
  payment_method?: PaymentMethod;
  posted_by: string;      // staff name
  posted_at: string;      // ISO timestamp
  is_voided: boolean;
  voided_by?: string;
  voided_at?: string;
  notes?: string;
}

// ============================================================
// ACTIVITY LOG
// ============================================================

export type ActivityAction =
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_checked_in'
  | 'booking_checked_out'
  | 'booking_cancelled'
  | 'booking_no_show'
  | 'booking_modified'
  | 'room_assigned'
  | 'room_upgraded'
  | 'room_status_changed'
  | 'housekeeping_updated'
  | 'folio_charge_posted'
  | 'folio_payment_received'
  | 'folio_refund_issued'
  | 'folio_entry_voided'
  | 'guest_created'
  | 'guest_updated'
  | 'rate_created'
  | 'rate_updated'
  | 'rate_deleted'
  | 'night_audit_run'
  | 'message_sent'
  | 'settings_updated'
  | 'staff_login'
  | 'staff_logout';

export interface ActivityLogEntry {
  id: string;
  property_id: string;
  action: ActivityAction;
  entity_type: 'booking' | 'room' | 'guest' | 'folio' | 'rate' | 'system' | 'staff';
  entity_id: string | null;
  description: string;
  performed_by: string;    // staff name
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export type NotificationType =
  | 'new_booking'
  | 'check_in_due'
  | 'check_out_overdue'
  | 'housekeeping_complete'
  | 'payment_received'
  | 'cancellation'
  | 'vip_arrival'
  | 'maintenance_alert'
  | 'night_audit_reminder'
  | 'system';

export interface Notification {
  id: string;
  property_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;           // route to navigate to
  is_read: boolean;
  created_at: string;
}

// ============================================================
// GROUP / BLOCK BOOKINGS
// ============================================================

export type GroupStatus = 'tentative' | 'definite' | 'cancelled';

export interface GroupBooking {
  id: string;
  property_id: string;
  name: string;                 // "Smith Wedding", "Acme Corp Conference"
  organiser_name: string;
  organiser_email: string | null;
  organiser_phone: string | null;
  status: GroupStatus;
  check_in: string;
  check_out: string;
  rooms_blocked: number;        // total rooms in block
  rate_agreed: number;           // negotiated group rate
  cutoff_date: string;           // unbooked rooms released after this
  booking_ids: string[];         // linked individual bookings
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// PACKAGES & ADD-ONS
// ============================================================

export interface Package {
  id: string;
  property_id: string;
  name: string;                // "Bed & Breakfast", "Romance Package"
  description: string | null;
  included_items: string[];    // ["Full breakfast", "Bottle of champagne"]
  price_per_night: number;     // surcharge on top of room rate
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// MAINTENANCE / WORK ORDERS
// ============================================================

export type WorkOrderStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'urgent';
export type WorkOrderCategory = 'plumbing' | 'electrical' | 'hvac' | 'furniture' | 'cleaning' | 'appliance' | 'structural' | 'other';

export interface WorkOrder {
  id: string;
  property_id: string;
  room_id: string | null;
  title: string;
  description: string;
  category: WorkOrderCategory;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  reported_by: string;
  assigned_to: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// LOST & FOUND
// ============================================================

export type LostFoundStatus = 'found' | 'claimed' | 'disposed' | 'shipped';

export interface LostFoundItem {
  id: string;
  property_id: string;
  room_id: string | null;
  guest_id: string | null;
  description: string;
  found_location: string;
  found_by: string;
  status: LostFoundStatus;
  claimed_by: string | null;
  claimed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// CONCIERGE / GUEST REQUESTS
// ============================================================

export type GuestRequestStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type GuestRequestCategory = 'housekeeping' | 'dining' | 'transport' | 'amenity' | 'information' | 'complaint' | 'wake_up' | 'other';

export interface GuestRequest {
  id: string;
  property_id: string;
  booking_id: string | null;
  guest_id: string | null;
  room_id: string | null;
  category: GuestRequestCategory;
  description: string;
  status: GuestRequestStatus;
  priority: WorkOrderPriority;
  assigned_to: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// TAX CONFIGURATION
// ============================================================

export interface TaxRule {
  id: string;
  property_id: string;
  name: string;                 // "VAT", "City Tourism Tax", "Service Charge"
  rate: number;                 // percentage (e.g. 20 for 20%)
  applies_to: FolioChargeCategory[];  // which charge categories it applies to
  is_inclusive: boolean;        // true = tax included in price, false = added on top
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// CANCELLATION POLICY
// ============================================================

export type CancellationPolicyType = 'free' | 'moderate' | 'strict' | 'custom';

export interface CancellationPolicy {
  id: string;
  property_id: string;
  name: string;
  type: CancellationPolicyType;
  free_cancellation_hours: number;    // hours before check-in for free cancellation
  penalty_type: 'fixed' | 'percentage' | 'first_night';
  penalty_amount: number;             // fixed amount or percentage
  no_show_penalty_type: 'fixed' | 'percentage' | 'full_stay';
  no_show_penalty_amount: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// DEPOSIT
// ============================================================

export interface DepositRecord {
  id: string;
  booking_id: string;
  amount: number;
  method: PaymentMethod;
  status: 'held' | 'applied' | 'refunded';
  taken_at: string;
  applied_at: string | null;
  refunded_at: string | null;
  notes: string | null;
}

// ============================================================
// ROOM MOVE / UPGRADE
// ============================================================

export interface RoomMoveRecord {
  id: string;
  booking_id: string;
  from_room_id: string;
  to_room_id: string;
  from_room_number: string;
  to_room_number: string;
  reason: string;
  is_upgrade: boolean;
  rate_change: number;          // positive = more expensive, negative = cheaper, 0 = same
  moved_by: string;
  moved_at: string;
}

// ============================================================
// OVERBOOKING / WAITLIST
// ============================================================

export type WaitlistStatus = 'waiting' | 'offered' | 'confirmed' | 'expired' | 'cancelled';

export interface WaitlistEntry {
  id: string;
  property_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  room_type_id: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  status: WaitlistStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// NIGHT AUDIT
// ============================================================

export interface NightAuditReport {
  id: string;
  property_id: string;
  audit_date: string;
  run_at: string;
  run_by: string;
  room_charges_posted: number;
  room_revenue: number;
  total_revenue: number;
  occupancy_pct: number;
  rooms_occupied: number;
  rooms_available: number;
  arrivals: number;
  departures: number;
  no_shows: number;
  adr: number;                  // average daily rate
  revpar: number;               // revenue per available room
  notes: string | null;
}

// ============================================================
// INVOICE
// ============================================================

export interface Invoice {
  id: string;
  booking_id: string;
  invoice_number: string;       // e.g. "INV-2026-0001"
  guest_name: string;
  guest_email: string | null;
  property_name: string;
  property_address: PropertyAddress;
  check_in: string;
  check_out: string;
  room_number: string;
  room_type: string;
  line_items: InvoiceLineItem[];
  subtotal: number;
  taxes: InvoiceTax[];
  total: number;
  amount_paid: number;
  balance_due: number;
  issued_at: string;
  due_date: string | null;
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'void';
  notes: string | null;
}

export interface InvoiceLineItem {
  description: string;
  category: FolioChargeCategory;
  quantity: number;
  unit_price: number;
  amount: number;
  date: string;
}

export interface InvoiceTax {
  name: string;
  rate: number;
  amount: number;
}

// ============================================================
// MULTI-PROPERTY / GROUP VIEW
// ============================================================

/** Junction between staff and the properties they can access */
export interface StaffPropertyAccess {
  staff_id: string;
  property_id: string;
  role: StaffRole;
  is_primary: boolean;          // the default property loaded on login
}

/** Summary KPIs for a single property — used in group dashboard */
export interface PropertySummary {
  property: Property;
  totalRooms: number;
  occupiedRooms: number;
  occupancyPct: number;
  arrivals: number;
  departures: number;
  inHouse: number;
  todayRevenue: number;
  adr: number;
  revpar: number;
}
