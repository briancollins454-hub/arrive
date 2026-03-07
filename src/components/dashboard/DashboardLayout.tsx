import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Users,
  BedDouble, PoundSterling, MessageSquare, Settings,
  LogOut, ChevronLeft, ChevronRight, Building2, Bell, ExternalLink, SprayCan,
  Search, TrendingUp, Brain, Wrench, LogIn, LogOut as LogOutIcon2, Moon, BarChart3,
  ClipboardList, CheckCheck, CalendarRange, UsersRound, Gift, PackageSearch,
  BellRing, Mail, CreditCard, MessageCircle, Globe, Wallet, CalendarClock,
  Menu, X, Landmark, Shield, ChevronDown, LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/shared/Logo';
import { PropertySwitcher } from '@/components/dashboard/PropertySwitcher';
import { useProperty } from '@/hooks/useProperty';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useRBAC } from '@/hooks/useRBAC';
import { useAppStore } from '@/store/useAppStore';
import { isDemoMode } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import type { StaffRole } from '@/types';

// Grouped nav structure with section headers
const navSections = [
  {
    label: 'Operations',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
      { to: '/dashboard/group', icon: LayoutGrid, label: 'Group View' },
      { to: '/dashboard/bookings', icon: BookOpen, label: 'Bookings' },
      { to: '/dashboard/bookings?view=arrivals', icon: LogIn, label: 'Arrivals' },
      { to: '/dashboard/bookings?view=departures', icon: LogOutIcon2, label: 'Departures' },
      { to: '/dashboard/in-house', icon: Building2, label: 'In-House' },
      { to: '/dashboard/tape-chart', icon: CalendarRange, label: 'Tape Chart' },
      { to: '/dashboard/groups', icon: UsersRound, label: 'Groups' },
      { to: '/dashboard/waitlist', icon: CheckCheck, label: 'Waitlist' },
      { to: '/dashboard/guests', icon: Users, label: 'Guests' },
      { to: '/dashboard/concierge', icon: BellRing, label: 'Concierge' },
    ],
  },
  {
    label: 'Rooms',
    items: [
      { to: '/dashboard/rooms', icon: BedDouble, label: 'Room Inventory' },
      { to: '/dashboard/housekeeping', icon: SprayCan, label: 'Housekeeping' },
      { to: '/dashboard/maintenance', icon: Wrench, label: 'Maintenance' },
      { to: '/dashboard/lost-found', icon: PackageSearch, label: 'Lost & Found' },
    ],
  },
  {
    label: 'Revenue',
    items: [
      { to: '/dashboard/rates', icon: PoundSterling, label: 'Rates' },
      { to: '/dashboard/packages', icon: Gift, label: 'Packages' },
      { to: '/dashboard/payments', icon: CreditCard, label: 'Payments' },
      { to: '/dashboard/financials', icon: Wallet, label: 'Financials' },
      { to: '/dashboard/city-ledger', icon: Landmark, label: 'City Ledger' },
      { to: '/dashboard/channel-manager', icon: Globe, label: 'Channel Manager' },
      { to: '/dashboard/insights', icon: Brain, label: 'AI Insights' },
      { to: '/dashboard/rate-intelligence', icon: TrendingUp, label: 'Rate Intel' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/dashboard/night-audit', icon: Moon, label: 'Night Audit' },
      { to: '/dashboard/staff-rota', icon: CalendarClock, label: 'Staff Rota' },
      { to: '/dashboard/reports', icon: BarChart3, label: 'Reports' },
      { to: '/dashboard/activity-log', icon: ClipboardList, label: 'Activity Log' },
      { to: '/dashboard/guest-messaging', icon: MessageCircle, label: 'Guest Chat' },
      { to: '/dashboard/email-templates', icon: Mail, label: 'Email Templates' },
      { to: '/dashboard/messages', icon: MessageSquare, label: 'Messages' },
      { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  // Initialize auth — loads staff + property from Supabase on session restore
  useAuth();
  const { property } = useProperty();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  // Ctrl+K / Cmd+K to open command palette
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setShowCommandPalette((v) => !v);
    }
    if (e.key === 'Escape') { setShowCommandPalette(false); setShowNotifications(false); setMobileOpen(false); }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Close notification dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showNotifications]);

  return (
    <div className="dashboard flex h-screen overflow-hidden">
      {/* Command Palette Overlay */}
      {showCommandPalette && (
        <CommandPalette onClose={() => setShowCommandPalette(false)} onNavigate={(path) => { navigate(path); setShowCommandPalette(false); }} />
      )}

      {/* Mobile sidebar backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      {/* Sidebar —  frosted glass with luminous edge */}
      <aside aria-label="Main sidebar" className={cn(
        'flex-shrink-0 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] relative z-40',
        // Desktop: normal sidebar
        'hidden lg:flex',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}>
        {/* Frosted glass background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#111827]/95 via-midnight/95 to-[#070b14] backdrop-blur-2xl" />
        {/* Luminous gradient edge — premium animated */}
        <div className="absolute right-0 top-0 bottom-0 w-px">
          <div className="h-full bg-gradient-to-b from-gold/40 via-teal/25 via-60% via-purple/15 to-transparent animate-border-glow" />
        </div>
        {/* Layered ambient glows */}
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-gold/[0.04] blur-[100px] pointer-events-none animate-aurora-float-1" />
        <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full bg-teal/[0.03] blur-[80px] pointer-events-none animate-aurora-float-2" />

        <SidebarContent collapsed={collapsed} setCollapsed={setCollapsed} navigate={navigate} setShowCommandPalette={setShowCommandPalette} isMobile={false} onClose={() => {}} />
      </aside>

      {/* Mobile Sidebar — slide-over drawer */}
      <aside
        aria-label="Mobile sidebar"
        inert={!mobileOpen ? true : undefined}
        className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col w-[280px] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:hidden',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal/95 via-midnight to-midnight backdrop-blur-2xl" />
        <div className="absolute right-0 top-0 bottom-0 w-px">
          <div className="h-full bg-gradient-to-b from-gold/30 via-teal/20 via-purple/10 to-transparent" />
        </div>
        <SidebarContent collapsed={false} setCollapsed={setCollapsed} navigate={navigate} setShowCommandPalette={setShowCommandPalette} isMobile onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar — frosted glass with luminous depth */}
        <header className="h-[56px] border-b border-white/[0.06] backdrop-blur-2xl flex items-center justify-between px-4 sm:px-6 flex-shrink-0 relative z-20">
          {/* Layered glass background */}
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal/70 via-midnight/50 to-charcoal/70" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent" />
          {/* Bottom glow line — gold-to-teal shimmer */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent" />
          <div className="absolute bottom-0 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-teal/10 to-transparent" />
          <div className="flex items-center gap-3 relative z-10">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/[0.06] text-silver hover:text-white transition-all active:scale-95"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <p className="text-sm font-body text-silver/80 tracking-wide">
              {getGreeting()}{isDemoMode ? ', Alex' : ''}
              {isDemoMode && (
                <span className="ml-2.5 inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-gradient-to-r from-gold/15 to-gold/5 text-gold border border-gold/20 tracking-wider">
                  DEMO
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 relative z-10">
            <button
              onClick={() => setShowCommandPalette(true)}
              className="hidden sm:flex items-center gap-1.5 text-xs font-body px-3 py-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-steel hover:text-silver hover:bg-white/[0.04] transition-all duration-200"
            >
              <Search size={12} />
              Quick actions
              <kbd className="ml-1 text-[10px] px-1 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-steel/50">⌘K</kbd>
            </button>
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications((v) => !v)}
                className="p-2 rounded-xl hover:bg-white/[0.06] text-steel hover:text-silver transition-all duration-200 relative group"
                aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-teal text-[10px] font-bold text-charcoal px-1 ring-2 ring-charcoal">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification dropdown */}
              {showNotifications && (
                <>
                  {/* Backdrop */}
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="fixed left-2 right-2 top-[60px] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 max-h-[480px] rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#121929] to-[#0d1320] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                    <h3 className="text-sm font-display text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllRead.mutate()}
                        className="flex items-center gap-1 text-xs text-teal hover:text-teal/80 transition-colors font-body"
                      >
                        <CheckCheck size={12} /> Mark all read
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div className="overflow-y-auto max-h-[380px] divide-y divide-white/[0.04]">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell size={24} className="mx-auto mb-2 text-steel/30" />
                        <p className="text-sm text-steel font-body">No notifications</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => {
                            if (!n.is_read) markRead.mutate(n.id);
                            if (n.link) {
                              navigate(n.link);
                              setShowNotifications(false);
                            }
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-white/[0.03] transition-colors ${!n.is_read ? 'bg-teal/[0.04]' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            {!n.is_read && (
                              <span className="w-2 h-2 rounded-full bg-teal mt-1.5 shrink-0" />
                            )}
                            <div className={`flex-1 min-w-0 ${n.is_read ? 'ml-5' : ''}`}>
                              <p className={`text-sm font-body leading-snug ${n.is_read ? 'text-white/60' : 'text-white'}`}>
                                {n.title}
                              </p>
                              <p className="text-xs text-steel font-body mt-0.5 line-clamp-2">
                                {n.message}
                              </p>
                              <p className="text-[10px] text-steel/60 font-body mt-1">
                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  <div className="border-t border-white/[0.06] px-4 py-2">
                    <button
                      onClick={() => { navigate('/dashboard/activity-log'); setShowNotifications(false); }}
                      className="w-full text-center text-xs text-teal hover:text-teal/80 font-body py-1 transition-colors"
                    >
                      View Activity Log
                    </button>
                  </div>
                </div>
                </>
              )}
            </div>
            {property && (
              <button
                onClick={() => window.open(`/book/${property.slug}`, '_blank')}
                className="flex items-center gap-1.5 text-xs font-body font-medium px-3 py-1.5 rounded-xl border border-white/[0.08] hover:border-teal/30 bg-white/[0.03] hover:bg-teal/[0.06] text-steel hover:text-teal transition-all duration-200"
              >
                <ExternalLink size={12} />
                Booking Page
              </button>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-midnight via-midnight to-[#070b14] relative">
          <Outlet />
        </main>

        {/* Ambient floating light orbs — fixed position, behind all content */}
        <div className="ambient-light ambient-light-gold" style={{ top: '8%', right: '5%' }} />
        <div className="ambient-light ambient-light-teal" style={{ bottom: '10%', left: '2%' }} />
        <div className="ambient-light ambient-light-purple" style={{ top: '50%', right: '25%' }} />
      </div>
    </div>
  );
}

// ============================================================
// Sidebar Content — shared between desktop & mobile drawers
// ============================================================

interface SidebarContentProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  navigate: ReturnType<typeof useNavigate>;
  setShowCommandPalette: (v: boolean) => void;
  isMobile: boolean;
  onClose: () => void;
}

function SidebarContent({ collapsed, setCollapsed, navigate, setShowCommandPalette, isMobile, onClose }: SidebarContentProps) {
  const location = useLocation();
  const show = isMobile || !collapsed; // mobile drawer always expanded
  const { currentRole, canAccessRoute, switchRole, roleLabel, roleColor, roleDefinitions } = useRBAC();
  const staff = useAppStore((s) => s.staff);
  const user = useAppStore((s) => s.user);
  const [showRolePicker, setShowRolePicker] = useState(false);

  // Filter nav sections: only show items the current role can access
  const filteredSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccessRoute(item.to)),
    }))
    .filter((section) => section.items.length > 0);

  const allRoles = Object.keys(roleDefinitions) as StaffRole[];

  return (
    <>
      {/* Logo & collapse/close */}
      <div className="relative z-10 px-3 py-4 flex items-center justify-between gap-2">
        {show && <Logo variant="dark" />}
        {isMobile ? (
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-steel hover:text-silver transition-all duration-200" aria-label="Close menu">
            <X size={18} />
          </button>
        ) : (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-steel hover:text-silver transition-all duration-200"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      {/* Property Switcher (replaces static property card) */}
      <PropertySwitcher collapsed={collapsed && !isMobile} />

      {/* Navigation */}
      <nav aria-label="Main navigation" className="relative z-10 flex-1 py-1 px-3 space-y-3 overflow-y-auto">
        {show && (
          <button
            onClick={() => { setShowCommandPalette(true); onClose(); }}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-body text-steel hover:text-silver bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all duration-200 mb-2"
          >
            <Search size={14} />
            <span className="flex-1 text-left">Quick actions…</span>
            {!isMobile && <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-steel/60">Ctrl K</kbd>}
          </button>
        )}
        {!show && (
          <button
            onClick={() => { setShowCommandPalette(true); }}
            title="Quick actions (Ctrl+K)"
            className="flex items-center justify-center w-full p-2 rounded-xl text-steel hover:text-silver hover:bg-white/[0.04] transition-all duration-200 mb-2"
          >
            <Search size={16} />
          </button>
        )}

        {filteredSections.map((section) => (
          <div key={section.label}>
            {show && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-steel/50 font-body">{section.label}</p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const hasQuery = item.to.includes('?');
                if (hasQuery) {
                  return <QueryNavItem key={item.to} item={item} collapsed={!show} />;
                }
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    title={!show ? item.label : undefined}
                    className={({ isActive: routerActive }) => {
                      const isActive = routerActive && !(location.pathname === item.to && location.search.includes('view='));
                      return cn(
                        'flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-body transition-all duration-300 relative group',
                        !show && 'justify-center px-2',
                        isActive
                          ? 'bg-gradient-to-r from-gold/[0.12] to-teal/[0.06] text-white font-semibold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_0_12px_rgba(201,168,76,0.08)]'
                          : 'text-steel hover:text-silver hover:bg-white/[0.05]'
                      );
                    }}
                  >
                    {({ isActive: routerActive }) => {
                      const isActive = routerActive && !(location.pathname === item.to && location.search.includes('view='));
                      return (
                      <>
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-gradient-to-b from-gold via-gold to-gold/40 shadow-[0_0_8px_rgba(201,168,76,0.5)]" />
                        )}
                        <item.icon size={17} className={cn(
                          'transition-all duration-300 shrink-0',
                          isActive ? 'text-gold drop-shadow-[0_0_4px_rgba(201,168,76,0.4)]' : 'group-hover:text-silver'
                        )} />
                        {show && <span className="tracking-wide">{item.label}</span>}
                      </>
                      );
                    }}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User & Footer */}
      <div className="relative z-10 px-3 py-3 space-y-2">
        {/* Role Switcher — demo mode only */}
        {show && isDemoMode && (
          <div className="relative">
            <button
              onClick={() => setShowRolePicker(!showRolePicker)}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-body bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200"
              aria-label="Switch role"
            >
              <Shield size={14} className="text-teal shrink-0" />
              <span className={cn('font-semibold truncate', roleColor)}>{roleLabel}</span>
              <ChevronDown size={12} className={cn('ml-auto text-steel transition-transform', showRolePicker && 'rotate-180')} />
            </button>

            {showRolePicker && (
              <div className="absolute bottom-full left-0 right-0 mb-1 max-h-72 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#111827]/98 backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="p-2 border-b border-white/[0.06]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-steel/50 font-body px-2">Switch Role</p>
                </div>
                <div className="p-1 space-y-0.5">
                  {allRoles.map((role) => {
                    const def = roleDefinitions[role];
                    return (
                      <button
                        key={role}
                        onClick={() => { switchRole(role); setShowRolePicker(false); }}
                        className={cn(
                          'flex items-start gap-2.5 w-full px-3 py-2 rounded-lg text-left transition-all duration-150',
                          role === currentRole
                            ? 'bg-gradient-to-r from-gold/[0.1] to-teal/[0.05] border border-gold/20'
                            : 'hover:bg-white/[0.04] border border-transparent'
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-xs font-semibold font-body', def.color)}>{def.label}</p>
                          <p className="text-[10px] text-steel/70 font-body leading-snug mt-0.5">{def.description}</p>
                        </div>
                        {role === currentRole && (
                          <span className="text-[10px] text-gold font-bold mt-0.5 shrink-0">Active</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {show && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-white/[0.04] to-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-all duration-300">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold/50 to-teal/40 flex items-center justify-center text-[11px] font-bold text-white font-body ring-2 ring-gold/25 shadow-[0_0_16px_rgba(201,168,76,0.2)] animate-breathe">
              {(staff?.name ?? user?.email ?? 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white font-medium truncate font-body tracking-wide">
                {staff?.name ?? user?.email ?? 'User'}
              </p>
              <p className={cn('text-[10px] truncate font-body font-semibold', roleColor)}>
                {roleLabel}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={() => navigate('/')}
          title="Sign out"
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-body text-steel hover:text-silver hover:bg-white/[0.04] transition-all duration-200',
            !show && 'justify-center px-2',
          )}
        >
          <LogOut size={16} />
          {show && <span>Sign Out</span>}
        </button>
        {show && (
          <div className="px-3 pt-2 border-t border-white/[0.04]">
            <p className="text-[10px] text-steel/60 font-body">
              Powered by <span className="gradient-text font-display tracking-wider">Arrivé</span>
            </p>
          </div>
        )}
      </div>
    </>
  );
}

// ============================================================
// Command Palette — Quick navigation & actions
// ============================================================

const commandItems = [
  // Navigation
  { id: 'nav-dashboard', label: 'Go to Dashboard', section: 'Navigate', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'nav-group', label: 'Go to Group View', section: 'Navigate', icon: LayoutGrid, path: '/dashboard/group' },
  { id: 'nav-bookings', label: 'Go to Bookings', section: 'Navigate', icon: BookOpen, path: '/dashboard/bookings' },
  { id: 'nav-guests', label: 'Go to Guests', section: 'Navigate', icon: Users, path: '/dashboard/guests' },
  { id: 'nav-rooms', label: 'Go to Room Inventory', section: 'Navigate', icon: BedDouble, path: '/dashboard/rooms' },
  { id: 'nav-housekeeping', label: 'Go to Housekeeping', section: 'Navigate', icon: SprayCan, path: '/dashboard/housekeeping' },
  { id: 'nav-rates', label: 'Go to Rates', section: 'Navigate', icon: PoundSterling, path: '/dashboard/rates' },
  { id: 'nav-insights', label: 'Go to AI Insights', section: 'Navigate', icon: Brain, path: '/dashboard/insights' },
  { id: 'nav-rateintel', label: 'Go to Rate Intelligence', section: 'Navigate', icon: TrendingUp, path: '/dashboard/rate-intelligence' },
  { id: 'nav-messages', label: 'Go to Messages', section: 'Navigate', icon: MessageSquare, path: '/dashboard/messages' },
  { id: 'nav-activitylog', label: 'Go to Activity Log', section: 'Navigate', icon: ClipboardList, path: '/dashboard/activity-log' },
  { id: 'nav-settings', label: 'Go to Settings', section: 'Navigate', icon: Settings, path: '/dashboard/settings' },
  { id: 'nav-inhouse', label: 'Go to In-House', section: 'Navigate', icon: Building2, path: '/dashboard/in-house' },
  // Quick Actions
  { id: 'act-maintenance', label: 'Put room under maintenance', section: 'Quick Actions', icon: Wrench, path: '/dashboard/rooms' },
  { id: 'act-checkin', label: 'Check in a guest', section: 'Quick Actions', icon: BookOpen, path: '/dashboard/bookings' },
  { id: 'act-newbooking', label: 'Create new booking', section: 'Quick Actions', icon: BookOpen, path: '/dashboard/bookings' },
  { id: 'act-hk', label: 'Mark room as clean', section: 'Quick Actions', icon: SprayCan, path: '/dashboard/housekeeping' },
  { id: 'act-extend', label: 'Extend a guest stay', section: 'Quick Actions', icon: BookOpen, path: '/dashboard/bookings' },
];

// Nav item that uses query params — needs manual active-state detection
function QueryNavItem({ item, collapsed }: { item: { to: string; icon: React.ElementType; label: string }; collapsed: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [pathname, search] = item.to.split('?');
  const isActive = location.pathname === pathname && location.search === `?${search}`;

  return (
    <button
      onClick={() => navigate(item.to)}
      title={collapsed ? item.label : undefined}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-body transition-all duration-300 relative group',
        collapsed && 'justify-center px-2',
        isActive
          ? 'bg-gradient-to-r from-gold/[0.12] to-teal/[0.06] text-white font-semibold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_0_12px_rgba(201,168,76,0.08)]'
          : 'text-steel hover:text-silver hover:bg-white/[0.05]'
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-gradient-to-b from-gold via-gold to-gold/40 shadow-[0_0_8px_rgba(201,168,76,0.5)]" />
      )}
      <item.icon size={17} className={cn(
        'transition-all duration-300 shrink-0',
        isActive ? 'text-gold drop-shadow-[0_0_4px_rgba(201,168,76,0.4)]' : 'group-hover:text-silver'
      )} />
      {!collapsed && <span>{item.label}</span>}
    </button>
  );
}

function CommandPalette({ onClose, onNavigate }: { onClose: () => void; onNavigate: (path: string) => void }) {
  const [query, setQuery] = useState('');

  const filtered = commandItems.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  const sections = [...new Set(filtered.map((i) => i.section))];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]" onClick={onClose} role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" aria-hidden="true" />
      <div
        className="relative w-full max-w-xl bg-gradient-to-b from-charcoal to-midnight border border-white/[0.1] rounded-2xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.05)] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08]">
          <Search size={18} className="text-steel shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, actions, rooms…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-steel/50 outline-none font-body"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filtered.length > 0) {
                onNavigate(filtered[0]!.path);
              }
            }}
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-steel/50">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {sections.map((section) => (
            <div key={section}>
              <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-steel/50 font-body">{section}</p>
              {filtered.filter((i) => i.section === section).map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.path)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-body text-silver hover:text-white hover:bg-white/[0.06] transition-all duration-150"
                >
                  <item.icon size={16} className="text-steel shrink-0" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-steel font-body">No results for &quot;{query}&quot;</p>
          )}
        </div>
      </div>
    </div>
  );
}
