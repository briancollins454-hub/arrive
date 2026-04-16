import { Outlet } from 'react-router-dom';
import { Logo } from '@/components/shared/Logo';
import { BookingPropertyProvider } from '@/hooks/useBookingProperty';

export function BookingLayout() {
  return (
    <BookingPropertyProvider>
      <div className="booking-engine min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-cloud sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <Logo variant="light" size="sm" />
            <a
              href="/"
              className="text-sm text-steel font-body hover:text-midnight transition-colors"
            >
              Powered by Arrivé
            </a>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-60px)]">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-cloud py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
            <p className="text-xs text-steel font-body">
              Secure booking powered by{' '}
              <span className="text-gold font-display tracking-wider">ARRIVÉ</span>
              {' '}· Direct booking — no commissions, best price guaranteed
            </p>
          </div>
        </footer>
      </div>
    </BookingPropertyProvider>
  );
}
