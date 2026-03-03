# Arrivé — Hotel Booking Platform

> **Arrivé by The Supports Desk** — The all-in-one booking platform for boutique hotels.

## 🏨 What Is This?

Arrivé is a modern hotel booking and management platform built for boutique hotels (10–50 rooms). It replaces the fragmented mess of legacy PMS systems, expensive OTA commissions, and disconnected tools with one beautiful, integrated platform.

**Three core products in one:**
- **Staff Dashboard** (dark theme) — Room management, calendar, bookings, guest profiles
- **Booking Engine** (light theme) — Guest-facing, mobile-first direct booking
- **Automated Comms** — Email/SMS confirmations, reminders, post-stay follow-ups

---

## 🛠 Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React 18 + TypeScript | Core skill. Type safety at scale. |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid, consistent, beautiful UI. |
| **State** | Zustand + TanStack Query | Lightweight global state + server state caching. |
| **Routing** | React Router v6 | Industry standard. Nested layouts. |
| **Backend** | Supabase (BaaS) | Auth, DB, realtime, storage, edge functions. |
| **Database** | PostgreSQL (Supabase) | Relational, robust. RLS for security. |
| **Realtime** | Supabase Realtime | Live availability via WebSocket. |
| **Email** | Resend + React Email | Modern API. Beautiful templates. |
| **SMS** | Twilio | Reliable. Pay per message. |
| **Payments** | Stripe Connect | PCI compliant. Hotel gets paid directly. |
| **Hosting** | Vercel + Supabase | Zero-config deploys. Edge CDN. |
| **Build** | Vite | Lightning fast HMR and builds. |
| **PWA** | vite-plugin-pwa | Installable. Offline fallback. |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** or **pnpm** (pnpm preferred for speed)
- **Supabase CLI** — `npm install -g supabase`
- **VS Code** with extensions: ES7+ React, Tailwind CSS IntelliSense, Prettier, ESLint

### 1. Clone & Install

```bash
# Clone the repo (or create from this scaffold)
cd arrive
npm install
```

### 2. Supabase Setup

```bash
# Login to Supabase
npx supabase login

# Create a new project at https://supabase.com/dashboard
# Then link it:
npx supabase link --project-ref YOUR_PROJECT_REF

# Run the database migration
npx supabase db push
```

### 3. Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Stripe (add when ready for payments)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx

# Resend (add when ready for emails)
RESEND_API_KEY=re_xxx

# Twilio (add when ready for SMS)
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+44xxx
```

### 4. Run Development Server

```bash
npm run dev
```

Open `http://localhost:5173` — you're live!

---

## 📁 Project Structure

```
arrive/
├── public/                     # Static assets, PWA icons
│   ├── favicon.svg
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── ui/                 # shadcn/ui base components (Button, Input, Card, etc.)
│   │   ├── dashboard/          # Staff dashboard components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── DashboardStats.tsx
│   │   │   ├── BookingCalendar.tsx
│   │   │   ├── BookingCard.tsx
│   │   │   ├── BookingForm.tsx
│   │   │   ├── GuestProfile.tsx
│   │   │   ├── RoomTypeEditor.tsx
│   │   │   ├── RatePeriodEditor.tsx
│   │   │   └── MessageComposer.tsx
│   │   ├── booking/            # Guest-facing booking engine components
│   │   │   ├── HotelHero.tsx
│   │   │   ├── BookingBar.tsx
│   │   │   ├── RoomTypeCard.tsx
│   │   │   ├── CheckoutForm.tsx
│   │   │   ├── BookingConfirmation.tsx
│   │   │   └── DirectBookingBadge.tsx
│   │   └── shared/             # Shared components (both themes)
│   │       ├── Logo.tsx
│   │       ├── LoadingSpinner.tsx
│   │       ├── StatusBadge.tsx
│   │       └── DateRangePicker.tsx
│   ├── hooks/
│   │   ├── useAuth.ts          # Authentication hook
│   │   ├── useProperty.ts     # Current property context
│   │   ├── useBookings.ts     # Booking CRUD + realtime
│   │   ├── useRooms.ts        # Room/room type queries
│   │   ├── useGuests.ts       # Guest directory queries
│   │   ├── useAvailability.ts # Availability check logic
│   │   └── useMessages.ts     # Messaging hooks
│   ├── lib/
│   │   ├── supabase.ts        # Supabase client init
│   │   ├── stripe.ts          # Stripe client init
│   │   ├── utils.ts           # Utility functions
│   │   ├── constants.ts       # App-wide constants
│   │   └── validators.ts      # Zod schemas for form validation
│   ├── pages/
│   │   ├── dashboard/
│   │   │   ├── DashboardHome.tsx
│   │   │   ├── CalendarPage.tsx
│   │   │   ├── BookingsPage.tsx
│   │   │   ├── BookingDetailPage.tsx
│   │   │   ├── GuestsPage.tsx
│   │   │   ├── RoomsPage.tsx
│   │   │   ├── RatesPage.tsx
│   │   │   ├── MessagesPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── booking/
│   │   │   ├── HotelPage.tsx
│   │   │   ├── RoomSelectPage.tsx
│   │   │   ├── CheckoutPage.tsx
│   │   │   ├── ConfirmationPage.tsx
│   │   │   └── ManageBookingPage.tsx
│   │   ├── LoginPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── styles/
│   │   └── globals.css         # Tailwind imports + custom styles
│   ├── types/
│   │   ├── database.ts         # Supabase generated types
│   │   ├── booking.ts          # Booking-related types
│   │   └── index.ts            # Shared types
│   ├── store/
│   │   └── useAppStore.ts      # Zustand global store
│   ├── App.tsx                 # Root component + router
│   ├── main.tsx                # Entry point
│   └── vite-env.d.ts
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql  # Full database schema
│   └── config.toml
├── .env.local                  # Environment variables (DO NOT COMMIT)
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── README.md                   # This file
```

---

## 🎨 Brand & Theme

### Colour Palette

**Dashboard (Dark Theme)**
| Token | Hex | Usage |
|-------|-----|-------|
| `midnight` | `#0F172A` | Main background |
| `charcoal` | `#1E293B` | Cards, panels |
| `slate` | `#334155` | Borders, dividers |
| `steel` | `#64748B` | Secondary text |
| `silver` | `#94A3B8` | Body text |
| `gold` | `#D4A853` | Primary accent, CTAs |
| `teal` | `#0D9488` | Success, actions |

**Booking Engine (Light Theme)**
| Token | Hex | Usage |
|-------|-----|-------|
| `white` | `#FFFFFF` | Cards, inputs |
| `snow` | `#F1F5F9` | Page background |
| `cloud` | `#E2E8F0` | Borders |
| `gold` | `#D4A853` | Primary CTAs |
| `midnight` | `#0F172A` | Headings |
| `steel` | `#64748B` | Body text |

### Typography
- **Display / Headings**: Georgia serif (elegant, hospitality feel)
- **Body / UI**: System sans-serif via Tailwind (clean, functional)

### Tailwind Config
The custom theme is pre-configured in `tailwind.config.ts` with all brand tokens as Tailwind classes (e.g. `bg-midnight`, `text-gold`, `border-slate`).

---

## 🗄 Database Schema

Full schema is in `supabase/migrations/001_initial_schema.sql`. Key tables:

| Table | Purpose |
|-------|---------|
| `properties` | Hotel details, branding, settings |
| `room_types` | Categories (Deluxe Double, Suite, etc.) |
| `rooms` | Individual physical rooms |
| `rate_periods` | Seasonal/event pricing overrides |
| `bookings` | Core reservation records |
| `guests` | Unified guest profiles |
| `messages` | All guest communications |
| `message_templates` | Automated email/SMS templates |
| `staff_members` | Hotel staff with roles |

### Key Design Decisions
- **UUID primary keys** everywhere (secure, no sequential guessing)
- **Row Level Security (RLS)** on every table (staff only see their hotel's data)
- **Date range exclusion constraints** prevent double bookings at the database level
- **JSONB columns** for flexible settings, preferences, and addresses
- **Snapshot pricing** on bookings (nightly_rate stored at time of booking, immune to rate changes)

---

## 🏗 Sprint Plan

### Sprint 1: Staff Dashboard (Weeks 1–4)
- [ ] Supabase project + database migration
- [ ] React scaffold + auth flow
- [ ] Layout shell (sidebar, header)
- [ ] Property settings page
- [ ] Room type CRUD + image upload
- [ ] Room management
- [ ] Rate period management
- [ ] Availability calendar
- [ ] Manual booking creation
- [ ] Booking list + detail page
- [ ] Guest directory + profiles
- [ ] Dashboard overview with stats
- [ ] Realtime subscriptions

### Sprint 2: Booking Engine (Weeks 5–8)
- [ ] Availability check Edge Function
- [ ] Hotel landing page (branded)
- [ ] Room selection page
- [ ] Stripe Connect setup
- [ ] Checkout + payment flow
- [ ] Confirmation page
- [ ] Guest self-service (view/cancel booking)
- [ ] PWA setup
- [ ] Performance + accessibility audit

### Sprint 3: Automated Comms (Weeks 9–11)
- [ ] Resend email integration
- [ ] Booking confirmation email
- [ ] Message template editor
- [ ] Twilio SMS integration
- [ ] Pre-arrival reminders (CRON)
- [ ] Post-stay messages
- [ ] No-show detection
- [ ] Message centre in dashboard
- [ ] End-to-end testing
- [ ] Production deploy

---

## 📋 Coding Conventions

### General
- **TypeScript strict mode** — no `any` types
- **Functional components only** — no class components
- **Named exports** for components, default exports for pages
- **Barrel exports** from each directory (index.ts)

### File Naming
- Components: `PascalCase.tsx` (e.g. `BookingCard.tsx`)
- Hooks: `camelCase.ts` prefixed with `use` (e.g. `useBookings.ts`)
- Types: `camelCase.ts` (e.g. `booking.ts`)
- Utils: `camelCase.ts` (e.g. `utils.ts`)

### Component Pattern
```tsx
// Standard component pattern
import { type FC } from 'react';

interface BookingCardProps {
  booking: Booking;
  onSelect?: (id: string) => void;
}

export const BookingCard: FC<BookingCardProps> = ({ booking, onSelect }) => {
  return (
    <div className="rounded-xl border border-slate bg-charcoal p-4">
      {/* component content */}
    </div>
  );
};
```

### State Management
- **Server state** (bookings, rooms, guests) → TanStack Query
- **UI state** (sidebar open, modal visible) → Zustand or local useState
- **Form state** → React Hook Form + Zod validation

### Supabase Queries
```tsx
// Always use the typed client
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase
  .from('bookings')
  .select('*, guests(*), room_types(*)')
  .eq('property_id', propertyId)
  .gte('check_in', startDate)
  .order('check_in', { ascending: true });
```

---

## 🔐 Security Checklist

- [ ] RLS enabled on ALL tables
- [ ] No secret keys in client-side code
- [ ] Stripe payments via server-side Edge Functions only
- [ ] Input validation on all forms (Zod)
- [ ] Rate limiting on public API endpoints
- [ ] CORS configured for production domain only
- [ ] `.env.local` in `.gitignore`

---

## 📞 Support

Built by **The Supports Desk** — Custom web & app development for small businesses.

Questions? Open an issue or reach out directly.

---

*"Stop giving Booking.com your money. Keep it."* — Arrivé
