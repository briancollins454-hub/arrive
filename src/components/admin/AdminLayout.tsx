import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Building2, CreditCard, LayoutDashboard, LogOut, Loader2, ShieldAlert } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { useAuth } from '@/hooks/useAuth';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';
import { useAppStore } from '@/store/useAppStore';
import { supabase, isDemoMode, exitDemoMode } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const nav = [
  { to: '/admin', icon: Building2, label: 'Hotels', end: true },
  { to: '/admin/billing', icon: CreditCard, label: 'Billing' },
];

export function AdminLayout() {
  // Initialise auth (loads the current session/user)
  useAuth();
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);
  const { isAdmin, isLoading } = usePlatformAdmin();

  const handleSignOut = async () => {
    exitDemoMode();
    if (!isDemoMode) { try { await supabase.auth.signOut(); } catch { /* ignore */ } }
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-gold" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <ShieldAlert size={44} className="text-steel mx-auto mb-4" />
          <h2 className="text-xl font-display text-white mb-2">Platform Admin Only</h2>
          <p className="text-sm text-steel font-body mb-6">
            This area is restricted to the Arrivé platform administrator.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-silver hover:text-white text-sm font-body transition-all"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-midnight">
      <aside className="w-[240px] flex-shrink-0 flex flex-col border-r border-white/[0.06] bg-gradient-to-b from-[#111827] to-[#070b14]">
        <div className="px-4 py-4 flex items-center justify-between">
          <Logo variant="dark" />
        </div>
        <div className="px-4 pb-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gold bg-gold/10 border border-gold/20 px-2 py-1 rounded-lg">
            <ShieldAlert size={11} /> Platform Admin
          </span>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-body transition-all',
                isActive
                  ? 'bg-gradient-to-r from-gold/[0.14] to-teal/[0.06] text-white font-semibold'
                  : 'text-steel hover:text-silver hover:bg-white/[0.05]'
              )}
            >
              <item.icon size={17} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-3 space-y-1 border-t border-white/[0.06]">
          <p className="px-3 text-[11px] text-steel/70 font-body truncate">{user?.email}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-body text-steel hover:text-silver hover:bg-white/[0.04] transition-all"
          >
            <LayoutDashboard size={16} /> Hotel Dashboard
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-body text-steel hover:text-silver hover:bg-white/[0.04] transition-all"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-gradient-to-b from-midnight to-[#070b14]">
        <Outlet />
      </main>
    </div>
  );
}
