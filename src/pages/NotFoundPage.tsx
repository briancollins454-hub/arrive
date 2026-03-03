import { Link, useLocation } from 'react-router-dom';
import { Logo } from '@/components/shared/Logo';
import { Button } from '@/components/ui/Button';
import { Home, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isDashboard ? 'bg-midnight' : 'bg-cream'}`}>
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <Logo variant={isDashboard ? 'dark' : 'light'} size="md" />
        </div>

        <h1 className={`text-7xl font-display mb-4 ${isDashboard ? 'text-gold' : 'text-midnight'}`}>
          404
        </h1>
        <h2 className={`text-xl font-display mb-2 ${isDashboard ? 'text-white' : 'text-midnight'}`}>
          Page Not Found
        </h2>
        <p className={`text-sm font-body mb-8 ${isDashboard ? 'text-steel' : 'text-charcoal/60'}`}>
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex justify-center gap-3">
          <Button
            variant={isDashboard ? 'outline-dark' : 'outline'}
            onClick={() => window.history.back()}
          >
            <ArrowLeft size={16} className="mr-2" />
            Go Back
          </Button>
          <Link to={isDashboard ? '/dashboard' : '/'}>
            <Button>
              <Home size={16} className="mr-2" />
              {isDashboard ? 'Dashboard' : 'Home'}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
