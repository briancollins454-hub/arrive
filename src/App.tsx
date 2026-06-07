import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Route pages are lazy-loaded so the initial bundle stays lean and each
// page (and its heavy deps) only downloads when first visited.
const named = <T extends Record<string, unknown>, K extends keyof T>(
  loader: () => Promise<T>,
  key: K,
) => lazy(() => loader().then((m) => ({ default: m[key] as React.ComponentType<unknown> })));

// Pages — Dashboard
const DashboardHome = named(() => import('@/pages/dashboard/DashboardHome'), 'DashboardHome');
const CalendarPage = named(() => import('@/pages/dashboard/CalendarPage'), 'CalendarPage');
const BookingsPage = named(() => import('@/pages/dashboard/BookingsPage'), 'BookingsPage');
const BookingDetailPage = named(() => import('@/pages/dashboard/BookingDetailPage'), 'BookingDetailPage');
const GuestsPage = named(() => import('@/pages/dashboard/GuestsPage'), 'GuestsPage');
const RoomsPage = named(() => import('@/pages/dashboard/RoomsPage'), 'RoomsPage');
const HousekeepingPage = named(() => import('@/pages/dashboard/HousekeepingPage'), 'HousekeepingPage');
const RatesPage = named(() => import('@/pages/dashboard/RatesPage'), 'RatesPage');
const MessagesPage = named(() => import('@/pages/dashboard/MessagesPage'), 'MessagesPage');
const SettingsPage = named(() => import('@/pages/dashboard/SettingsPage'), 'SettingsPage');
const AIInsightsPage = named(() => import('@/pages/dashboard/AIInsightsPage'), 'AIInsightsPage');
const RateIntelligencePage = named(() => import('@/pages/dashboard/RateIntelligencePage'), 'RateIntelligencePage');
const NightAuditPage = named(() => import('@/pages/dashboard/NightAuditPage'), 'NightAuditPage');
const ReportsPage = named(() => import('@/pages/dashboard/ReportsPage'), 'ReportsPage');
const ActivityLogPage = named(() => import('@/pages/dashboard/ActivityLogPage'), 'ActivityLogPage');
const InHousePage = named(() => import('@/pages/dashboard/InHousePage'), 'InHousePage');
const TapeChartPage = named(() => import('@/pages/dashboard/TapeChartPage'), 'TapeChartPage');
const GroupBookingsPage = named(() => import('@/pages/dashboard/GroupBookingsPage'), 'GroupBookingsPage');
const PackagesPage = named(() => import('@/pages/dashboard/PackagesPage'), 'PackagesPage');
const MaintenancePage = named(() => import('@/pages/dashboard/MaintenancePage'), 'MaintenancePage');
const LostFoundPage = named(() => import('@/pages/dashboard/LostFoundPage'), 'LostFoundPage');
const ConciergePage = named(() => import('@/pages/dashboard/ConciergePage'), 'ConciergePage');
const EmailTemplatesPage = named(() => import('@/pages/dashboard/EmailTemplatesPage'), 'EmailTemplatesPage');
const PaymentPage = named(() => import('@/pages/dashboard/PaymentPage'), 'PaymentPage');
const GuestMessagingPage = named(() => import('@/pages/dashboard/GuestMessagingPage'), 'GuestMessagingPage');
const ChannelManagerPage = named(() => import('@/pages/dashboard/ChannelManagerPage'), 'ChannelManagerPage');
const FinancialDashboardPage = named(() => import('@/pages/dashboard/FinancialDashboardPage'), 'FinancialDashboardPage');
const StaffRotaPage = named(() => import('@/pages/dashboard/StaffRotaPage'), 'StaffRotaPage');
const WaitlistPage = named(() => import('@/pages/dashboard/WaitlistPage'), 'WaitlistPage');
const CityLedgerPage = named(() => import('@/pages/dashboard/CityLedgerPage'), 'CityLedgerPage');
const GroupDashboardPage = named(() => import('@/pages/dashboard/GroupDashboardPage'), 'GroupDashboardPage');
const AdminPage = named(() => import('@/pages/dashboard/AdminPage'), 'AdminPage');
const AIAssistantPage = named(() => import('@/pages/dashboard/AIAssistantPage'), 'AIAssistantPage');
const AccountPage = named(() => import('@/pages/dashboard/AccountPage'), 'AccountPage');
const BillingPage = named(() => import('@/pages/dashboard/BillingPage'), 'BillingPage');
const FeatureTogglesPage = named(() => import('@/pages/dashboard/FeatureTogglesPage'), 'FeatureTogglesPage');
const GuestLifecyclePage = named(() => import('@/pages/dashboard/GuestLifecyclePage'), 'GuestLifecyclePage');

// Pages — Platform Admin
const AdminHotelsPage = named(() => import('@/pages/admin/AdminHotelsPage'), 'AdminHotelsPage');
const AdminBillingPage = named(() => import('@/pages/admin/AdminBillingPage'), 'AdminBillingPage');

// Pages — Booking Engine
const HotelPage = named(() => import('@/pages/booking/HotelPage'), 'HotelPage');
const RoomSelectPage = named(() => import('@/pages/booking/RoomSelectPage'), 'RoomSelectPage');
const CheckoutPage = named(() => import('@/pages/booking/CheckoutPage'), 'CheckoutPage');
const ConfirmationPage = named(() => import('@/pages/booking/ConfirmationPage'), 'ConfirmationPage');
const ManageBookingPage = named(() => import('@/pages/booking/ManageBookingPage'), 'ManageBookingPage');
const SelfCheckInPage = named(() => import('@/pages/booking/SelfCheckInPage'), 'SelfCheckInPage');

// Pages — Auth & Misc
const LoginPage = named(() => import('@/pages/LoginPage'), 'LoginPage');
const LandingPage = named(() => import('@/pages/LandingPage'), 'LandingPage');
const LegalPage = lazy(() => import('@/pages/LegalPage').then((m) => ({ default: m.LegalPage })));
const InviteAcceptPage = named(() => import('@/pages/InviteAcceptPage'), 'InviteAcceptPage');
const ForgotPasswordPage = named(() => import('@/pages/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage = named(() => import('@/pages/ResetPasswordPage'), 'ResetPasswordPage');
const NotFoundPage = named(() => import('@/pages/NotFoundPage'), 'NotFoundPage');

// Layouts & shell (kept eager — needed for the app frame)
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { BookingLayout } from '@/components/booking/BookingLayout';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { MotionProvider } from '@/lib/motion';
import { RequirePermission } from '@/components/shared/RequirePermission';
import { PageSpinner } from '@/components/shared/LoadingSpinner';
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
      <MotionProvider>
      <BrowserRouter>
        <Suspense fallback={<PageSpinner />}>
        <Routes>
          {/* ============================== */}
          {/* STAFF DASHBOARD (Dark Theme)   */}
          {/* ============================== */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="group" element={<GroupDashboardPage />} />
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
            <Route path="account" element={<AccountPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="ai-assistant" element={<AIAssistantPage />} />
            <Route path="feature-toggles" element={<RequirePermission permission="settings.manage"><FeatureTogglesPage /></RequirePermission>} />
            <Route path="guest-lifecycle" element={<RequirePermission permission="email_templates.view"><GuestLifecyclePage /></RequirePermission>} />
          </Route>

          {/* ============================== */}
          {/* PLATFORM ADMIN (you only)      */}
          {/* ============================== */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminHotelsPage />} />
            <Route path="onboard" element={<AdminPage />} />
            <Route path="billing" element={<AdminBillingPage />} />
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
            <Route path="checkin" element={<SelfCheckInPage />} />
          </Route>

          {/* ============================== */}
          {/* AUTH                           */}
          {/* ============================== */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/invite/:token" element={<InviteAcceptPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Legal */}
          <Route path="/privacy" element={<LegalPage doc="privacy" />} />
          <Route path="/terms" element={<LegalPage doc="terms" />} />

          {/* Landing page */}
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
      </MotionProvider>
      </ErrorBoundary>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'linear-gradient(135deg, rgba(20,24,37,0.97), rgba(10,14,26,0.97))',
            color: '#E2E8F0',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 12px 40px -8px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
            fontSize: '13px',
            fontWeight: 500,
            padding: '12px 16px',
            backdropFilter: 'blur(12px)',
          },
          success: { iconTheme: { primary: '#0ea5a0', secondary: '#0a0e1a' } },
          error: { iconTheme: { primary: '#fb3b6c', secondary: '#0a0e1a' } },
        }}
      />

      <InstallPrompt />
    </QueryClientProvider>
  );
}

export default App;
