import { Link, useLocation } from 'react-router-dom';
import { Logo } from '@/components/shared/Logo';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageShellStandalone } from '@/components/shared/PageShell';
import { Button } from '@/components/ui/Button';
import { Home, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/admin');
  const variant = isDashboard ? 'dark' : 'light';

  return (
    <PageShellStandalone variant={variant}>
      <div className="flex flex-col items-center text-center max-w-md mx-auto py-12">
        <div className="flex justify-center mb-6">
          <Logo variant={variant === 'dark' ? 'dark' : 'light'} size="md" />
        </div>

        <p className={`text-7xl font-display mb-2 ${variant === 'dark' ? 'text-gold' : 'text-midnight'}`}>
          404
        </p>

        <PageHeader
          variant={variant}
          title="Page Not Found"
          description="The page you're looking for doesn't exist or has been moved."
          className="justify-center items-center text-center mb-2"
        />

        <div className="flex justify-center gap-3 mt-6">
          <Button
            variant={variant === 'dark' ? 'outline-dark' : 'outline'}
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
    </PageShellStandalone>
  );
}
