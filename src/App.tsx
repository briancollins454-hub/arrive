import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Pages — Dashboard
import { DashboardHome } from '@/pages/dashboard/DashboardHome';
import { CalendarPage } from '@/pages/dashboard/CalendarPage';
import { BookingsPage } from '@/pages/dashboard/BookingsPage';
import { BookingDetailPage } from '@/pages/dashboard/BookingDetailPage';
import { GuestsPage } from '@/pages/dashboard/GuestsPage';
import { RoomsPage } from '@/pages/dashboard/RoomsPage';
import { HousekeepingPage } from '@/pages/dashboard/HousekeepingPage';
import { RatesPage } from '@/pages/dashboard/RatesPage';
import { MessagesPage } from '@/pages/dashboard/MessagesPage';
import { SettingsPage } from '@/pages/dashboard/SettingsPage';
import { AIInsightsPage } from '@/pages/dashboard/AIInsightsPage';
import { RateIntelligencePage } from '@/pages/dashboard/RateIntelligencePage';
import { NightAuditPage } from '@/pages/dashboard/NightAuditPage';
import { ReportsPage } from '@/pages/dashboard/ReportsPage';
import { ActivityLogPage } from '@/pages/dashboard/ActivityLogPage';
import { InHousePage } from '@/pages/dashboard/InHousePage';
import { TapeChartPage } from '@/pages/dashboard/TapeChartPage';
import { GroupBookingsPage } from '@/pages/dashboard/GroupBookingsPage';
import { PackagesPage } from '@/pages/dashboard/PackagesPage';
import { MaintenancePage } from '@/pages/dashboard/MaintenancePage';
import { LostFoundPage } from '@/pages/dashboard/LostFoundPage';
import { ConciergePage } from '@/pages/dashboard/ConciergePage';
import { EmailTemplatesPage } from '@/pages/dashboard/EmailTemplatesPage';
import { PaymentPage } from '@/pages/dashboard/PaymentPage';
import { GuestMessagingPage } from '@/pages/dashboard/GuestMessagingPage';
import { ChannelManagerPage } from '@/pages/dashboard/ChannelManagerPage';
import { FinancialDashboardPage } from '@/pages/dashboard/FinancialDashboardPage';
import { StaffRotaPage } from '@/pages/dashboard/StaffRotaPage';
import { WaitlistPage } from '@/pages/dashboard/WaitlistPage';
import { CityLedgerPage } from '@/pages/dashboard/CityLedgerPage';

// Pages — Booking Engine
import { HotelPage } from '@/pages/booking/HotelPage';
import { RoomSelectPage } from '@/pages/booking/RoomSelectPage';
import { CheckoutPage } from '@/pages/booking/CheckoutPage';
import { ConfirmationPage } from '@/pages/booking/ConfirmationPage';
import { ManageBookingPage } from '@/pages/booking/ManageBookingPage';

// Pages — Auth & Misc
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

// Layouts
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { BookingLayout } from '@/components/booking/BookingLayout';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { RequirePermission } from '@/components/shared/RequirePermission';
import InstallPrompt from '@/components/shared/InstallPrompt';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* ============================== */}
          {/* STAFF DASHBOARD (Dark Theme)   */}
          {/* ============================== */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="calendar" element={<RequirePermission permission="bookings.view"><CalendarPage /></RequirePermission>} />
            <Route path="bookings" element={<RequirePermission permission="bookings.view"><BookingsPage /></RequirePermission>} />
            <Route path="bookings/:id" element={<RequirePermission permission="bookings.view"><BookingDetailPage /></RequirePermission>} />
            <Route path="guests" element={<RequirePermission permission="guests.view"><GuestsPage /></RequirePermission>} />
            <Route path="rooms" element={<RequirePermission permission="rooms.view"><RoomsPage /></RequirePermission>} />
            <Route path="housekeeping" element={<RequirePermission permission="housekeeping.view"><HousekeepingPage /></RequirePermission>} />
            <Route path="rates" element={<RequirePermission permission="rates.view"><RatesPage /></RequirePermission>} />
            <Route path="insights" element={<RequirePermission permission="insights.view"><AIInsightsPage /></RequirePermission>} />
            <Route path="rate-intelligence" element={<RequirePermission permission="rate_intelligence.view"><RateIntelligencePage /></RequirePermission>} />
            <Route path="night-audit" element={<RequirePermission permission="night_audit.view"><NightAuditPage /></RequirePermission>} />
            <Route path="reports" element={<RequirePermission permission="reports.view"><ReportsPage /></RequirePermission>} />
            <Route path="activity-log" element={<RequirePermission permission="activity_log.view"><ActivityLogPage /></RequirePermission>} />
            <Route path="in-house" element={<RequirePermission permission="bookings.view"><InHousePage /></RequirePermission>} />
            <Route path="tape-chart" element={<RequirePermission permission="bookings.view"><TapeChartPage /></RequirePermission>} />
            <Route path="groups" element={<RequirePermission permission="bookings.groups"><GroupBookingsPage /></RequirePermission>} />
            <Route path="packages" element={<RequirePermission permission="packages.view"><PackagesPage /></RequirePermission>} />
            <Route path="maintenance" element={<RequirePermission permission="maintenance.view"><MaintenancePage /></RequirePermission>} />
            <Route path="lost-found" element={<RequirePermission permission="lost_found.view"><LostFoundPage /></RequirePermission>} />
            <Route path="concierge" element={<RequirePermission permission="concierge.view"><ConciergePage /></RequirePermission>} />
            <Route path="email-templates" element={<RequirePermission permission="email_templates.view"><EmailTemplatesPage /></RequirePermission>} />
            <Route path="payments" element={<RequirePermission permission="payments.view"><PaymentPage /></RequirePermission>} />
            <Route path="guest-messaging" element={<RequirePermission permission="messaging.view"><GuestMessagingPage /></RequirePermission>} />
            <Route path="channel-manager" element={<RequirePermission permission="channel_manager.view"><ChannelManagerPage /></RequirePermission>} />
            <Route path="financials" element={<RequirePermission permission="financials.view"><FinancialDashboardPage /></RequirePermission>} />
            <Route path="city-ledger" element={<RequirePermission permission="city_ledger.view"><CityLedgerPage /></RequirePermission>} />
            <Route path="staff-rota" element={<RequirePermission permission="staff_rota.view"><StaffRotaPage /></RequirePermission>} />
            <Route path="waitlist" element={<RequirePermission permission="waitlist.view"><WaitlistPage /></RequirePermission>} />
            <Route path="messages" element={<RequirePermission permission="messages.view"><MessagesPage /></RequirePermission>} />
            <Route path="settings" element={<RequirePermission permission="settings.view"><SettingsPage /></RequirePermission>} />
          </Route>

          {/* ============================== */}
          {/* BOOKING ENGINE (Light Theme)   */}
          {/* ============================== */}
          <Route path="/book/:slug" element={<BookingLayout />}>
            <Route index element={<HotelPage />} />
            <Route path="rooms" element={<RoomSelectPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="confirmation" element={<ConfirmationPage />} />
            <Route path="manage" element={<ManageBookingPage />} />
          </Route>

          {/* ============================== */}
          {/* AUTH                           */}
          {/* ============================== */}
          <Route path="/login" element={<LoginPage />} />

          {/* Landing page */}
          <Route path="/" element={<LoginPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      </ErrorBoundary>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1E293B',
            color: '#E2E8F0',
            borderRadius: '10px',
            border: '1px solid #334155',
          },
        }}
      />

      <InstallPrompt />
    </QueryClientProvider>
  );
}

export default App;
