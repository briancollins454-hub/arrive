import type { StaffRole } from '@/types';

// ============================================================
// PERMISSION KEYS
// ============================================================

export type Permission =
  // Dashboard
  | 'dashboard.view'
  // Bookings
  | 'bookings.view'
  | 'bookings.create'
  | 'bookings.modify'
  | 'bookings.cancel'
  | 'bookings.checkin'
  | 'bookings.checkout'
  | 'bookings.folios'
  | 'bookings.folios.void'
  | 'bookings.folios.refund'
  | 'bookings.groups'
  // Guests
  | 'guests.view'
  | 'guests.edit'
  | 'guests.export'
  // Rooms
  | 'rooms.view'
  | 'rooms.manage'
  | 'housekeeping.view'
  | 'housekeeping.update'
  | 'maintenance.view'
  | 'maintenance.manage'
  | 'lost_found.view'
  | 'lost_found.manage'
  // Revenue
  | 'rates.view'
  | 'rates.manage'
  | 'packages.view'
  | 'packages.manage'
  | 'payments.view'
  | 'payments.process'
  | 'financials.view'
  | 'city_ledger.view'
  | 'city_ledger.manage'
  | 'channel_manager.view'
  | 'channel_manager.manage'
  | 'insights.view'
  | 'rate_intelligence.view'
  // System
  | 'night_audit.view'
  | 'night_audit.run'
  | 'staff_rota.view'
  | 'staff_rota.manage'
  | 'reports.view'
  | 'reports.export'
  | 'activity_log.view'
  | 'messaging.view'
  | 'messaging.send'
  | 'email_templates.view'
  | 'email_templates.manage'
  | 'messages.view'
  | 'settings.view'
  | 'settings.manage'
  | 'settings.users'
  // Concierge & services
  | 'concierge.view'
  | 'concierge.manage'
  | 'waitlist.view'
  | 'waitlist.manage'
  // AI
  | 'ai_assistant.view';

// ============================================================
// ROLE DEFINITIONS
// ============================================================

export interface RoleDefinition {
  label: string;
  description: string;
  color: string;      // tailwind classes for badge
  permissions: Permission[];
}

export const ALL_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'bookings.view', 'bookings.create', 'bookings.modify', 'bookings.cancel',
  'bookings.checkin', 'bookings.checkout', 'bookings.folios', 'bookings.folios.void',
  'bookings.folios.refund', 'bookings.groups',
  'guests.view', 'guests.edit', 'guests.export',
  'rooms.view', 'rooms.manage',
  'housekeeping.view', 'housekeeping.update',
  'maintenance.view', 'maintenance.manage',
  'lost_found.view', 'lost_found.manage',
  'rates.view', 'rates.manage',
  'packages.view', 'packages.manage',
  'payments.view', 'payments.process',
  'financials.view',
  'city_ledger.view', 'city_ledger.manage',
  'channel_manager.view', 'channel_manager.manage',
  'insights.view', 'rate_intelligence.view',
  'night_audit.view', 'night_audit.run',
  'staff_rota.view', 'staff_rota.manage',
  'reports.view', 'reports.export',
  'activity_log.view',
  'messaging.view', 'messaging.send',
  'email_templates.view', 'email_templates.manage',
  'messages.view',
  'settings.view', 'settings.manage', 'settings.users',
  'concierge.view', 'concierge.manage',
  'waitlist.view', 'waitlist.manage',
  'ai_assistant.view',
];

// ============================================================
// PERMISSION GROUPS (for the UI editor)
// ============================================================

export interface PermissionGroup {
  label: string;
  permissions: { key: Permission; label: string }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: 'Dashboard',
    permissions: [
      { key: 'dashboard.view', label: 'View dashboard' },
    ],
  },
  {
    label: 'Bookings',
    permissions: [
      { key: 'bookings.view', label: 'View bookings' },
      { key: 'bookings.create', label: 'Create bookings' },
      { key: 'bookings.modify', label: 'Modify bookings' },
      { key: 'bookings.cancel', label: 'Cancel bookings' },
      { key: 'bookings.checkin', label: 'Check in guests' },
      { key: 'bookings.checkout', label: 'Check out guests' },
      { key: 'bookings.folios', label: 'Manage folios' },
      { key: 'bookings.folios.void', label: 'Void folio charges' },
      { key: 'bookings.folios.refund', label: 'Process refunds' },
      { key: 'bookings.groups', label: 'Group bookings' },
    ],
  },
  {
    label: 'Guests',
    permissions: [
      { key: 'guests.view', label: 'View guests' },
      { key: 'guests.edit', label: 'Edit guest profiles' },
      { key: 'guests.export', label: 'Export guest data' },
    ],
  },
  {
    label: 'Rooms & Housekeeping',
    permissions: [
      { key: 'rooms.view', label: 'View rooms' },
      { key: 'rooms.manage', label: 'Manage room inventory' },
      { key: 'housekeeping.view', label: 'View housekeeping' },
      { key: 'housekeeping.update', label: 'Update room status' },
      { key: 'maintenance.view', label: 'View maintenance' },
      { key: 'maintenance.manage', label: 'Manage maintenance' },
      { key: 'lost_found.view', label: 'View lost & found' },
      { key: 'lost_found.manage', label: 'Manage lost & found' },
    ],
  },
  {
    label: 'Revenue & Finance',
    permissions: [
      { key: 'rates.view', label: 'View rates' },
      { key: 'rates.manage', label: 'Manage rates' },
      { key: 'packages.view', label: 'View packages' },
      { key: 'packages.manage', label: 'Manage packages' },
      { key: 'payments.view', label: 'View payments' },
      { key: 'payments.process', label: 'Process payments' },
      { key: 'financials.view', label: 'View financials' },
      { key: 'city_ledger.view', label: 'View city ledger' },
      { key: 'city_ledger.manage', label: 'Manage city ledger' },
      { key: 'channel_manager.view', label: 'View channel manager' },
      { key: 'channel_manager.manage', label: 'Manage channels' },
      { key: 'insights.view', label: 'View AI insights' },
      { key: 'rate_intelligence.view', label: 'Rate intelligence' },
    ],
  },
  {
    label: 'System & Admin',
    permissions: [
      { key: 'night_audit.view', label: 'View night audit' },
      { key: 'night_audit.run', label: 'Run night audit' },
      { key: 'staff_rota.view', label: 'View staff rota' },
      { key: 'staff_rota.manage', label: 'Manage staff rota' },
      { key: 'reports.view', label: 'View reports' },
      { key: 'reports.export', label: 'Export reports' },
      { key: 'activity_log.view', label: 'View activity log' },
      { key: 'messaging.view', label: 'View messaging' },
      { key: 'messaging.send', label: 'Send messages' },
      { key: 'email_templates.view', label: 'View email templates' },
      { key: 'email_templates.manage', label: 'Manage email templates' },
      { key: 'messages.view', label: 'View messages' },
      { key: 'settings.view', label: 'View settings' },
      { key: 'settings.manage', label: 'Manage settings' },
      { key: 'settings.users', label: 'Manage users' },
    ],
  },
  {
    label: 'Guest Services',
    permissions: [
      { key: 'concierge.view', label: 'View concierge' },
      { key: 'concierge.manage', label: 'Manage concierge' },
      { key: 'waitlist.view', label: 'View waitlist' },
      { key: 'waitlist.manage', label: 'Manage waitlist' },
    ],
  },
  {
    label: 'AI',
    permissions: [
      { key: 'ai_assistant.view', label: 'Use AI Assistant' },
    ],
  },
];

export const ROLE_DEFINITIONS: Record<StaffRole, RoleDefinition> = {
  owner: {
    label: 'Owner',
    description: 'Full system access — all features, settings, and user management',
    color: 'text-gold bg-gold/10 border-gold/20',
    permissions: ALL_PERMISSIONS,
  },
  general_manager: {
    label: 'General Manager',
    description: 'Full operational access — cannot manage system settings or users',
    color: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    permissions: ALL_PERMISSIONS.filter(p => p !== 'settings.users'),
  },
  front_office_manager: {
    label: 'Front Office Manager',
    description: 'Manages front desk, bookings, guests, and daily operations',
    color: 'text-teal bg-teal/10 border-teal/20',
    permissions: [
      'dashboard.view',
      'bookings.view', 'bookings.create', 'bookings.modify', 'bookings.cancel',
      'bookings.checkin', 'bookings.checkout', 'bookings.folios', 'bookings.folios.void',
      'bookings.folios.refund', 'bookings.groups',
      'guests.view', 'guests.edit', 'guests.export',
      'rooms.view',
      'housekeeping.view',
      'maintenance.view',
      'lost_found.view', 'lost_found.manage',
      'rates.view',
      'packages.view',
      'payments.view', 'payments.process',
      'night_audit.view', 'night_audit.run',
      'staff_rota.view', 'staff_rota.manage',
      'reports.view', 'reports.export',
      'activity_log.view',
      'messaging.view', 'messaging.send',
      'messages.view',
      'concierge.view', 'concierge.manage',
      'waitlist.view', 'waitlist.manage',
    ],
  },
  receptionist: {
    label: 'Receptionist',
    description: 'Check in/out guests, manage bookings, handle front desk tasks',
    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    permissions: [
      'dashboard.view',
      'bookings.view', 'bookings.create', 'bookings.modify',
      'bookings.checkin', 'bookings.checkout', 'bookings.folios',
      'guests.view',
      'rooms.view',
      'housekeeping.view',
      'payments.view', 'payments.process',
      'concierge.view', 'concierge.manage',
      'waitlist.view', 'waitlist.manage',
      'messages.view',
      'messaging.view', 'messaging.send',
    ],
  },
  concierge: {
    label: 'Concierge',
    description: 'Guest services, requests, and concierge tasks',
    color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    permissions: [
      'dashboard.view',
      'bookings.view',
      'guests.view',
      'rooms.view',
      'housekeeping.view',
      'concierge.view', 'concierge.manage',
      'lost_found.view', 'lost_found.manage',
      'messaging.view', 'messaging.send',
      'messages.view',
    ],
  },
  revenue_manager: {
    label: 'Revenue Manager',
    description: 'Rates, packages, financials, analytics, and revenue optimisation',
    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    permissions: [
      'dashboard.view',
      'bookings.view',
      'guests.view', 'guests.export',
      'rooms.view',
      'rates.view', 'rates.manage',
      'packages.view', 'packages.manage',
      'payments.view',
      'financials.view',
      'city_ledger.view', 'city_ledger.manage',
      'channel_manager.view', 'channel_manager.manage',
      'insights.view',
      'rate_intelligence.view',
      'reports.view', 'reports.export',
    ],
  },
  housekeeping_manager: {
    label: 'Housekeeping Manager',
    description: 'Manages housekeeping team, room status, and supplies',
    color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    permissions: [
      'dashboard.view',
      'rooms.view',
      'housekeeping.view', 'housekeeping.update',
      'maintenance.view', 'maintenance.manage',
      'lost_found.view', 'lost_found.manage',
      'staff_rota.view',
    ],
  },
  housekeeping: {
    label: 'Housekeeping',
    description: 'Update room cleaning status — limited to housekeeping views only',
    color: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
    permissions: [
      'housekeeping.view', 'housekeeping.update',
      'maintenance.view',
      'lost_found.view',
    ],
  },
  maintenance: {
    label: 'Maintenance',
    description: 'Manage maintenance tasks, room repairs, and work orders',
    color: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    permissions: [
      'rooms.view',
      'housekeeping.view',
      'maintenance.view', 'maintenance.manage',
    ],
  },
  night_auditor: {
    label: 'Night Auditor',
    description: 'Run night audit, review folios, handle late check-ins',
    color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
    permissions: [
      'dashboard.view',
      'bookings.view', 'bookings.checkin', 'bookings.checkout', 'bookings.folios',
      'guests.view',
      'rooms.view',
      'housekeeping.view',
      'payments.view',
      'financials.view',
      'night_audit.view', 'night_audit.run',
      'reports.view',
      'activity_log.view',
    ],
  },
  finance: {
    label: 'Finance',
    description: 'Financial reports, city ledger, payments, and revenue data',
    color: 'text-lime-400 bg-lime-400/10 border-lime-400/20',
    permissions: [
      'dashboard.view',
      'bookings.view',
      'guests.view', 'guests.export',
      'payments.view', 'payments.process',
      'financials.view',
      'city_ledger.view', 'city_ledger.manage',
      'reports.view', 'reports.export',
      'activity_log.view',
    ],
  },
  readonly: {
    label: 'Read Only',
    description: 'View-only access — cannot modify any data',
    color: 'text-steel bg-steel/10 border-steel/20',
    permissions: [
      'dashboard.view',
      'bookings.view',
      'guests.view',
      'rooms.view',
      'housekeeping.view',
      'rates.view',
      'reports.view',
    ],
  },
};

// ============================================================
// ROUTE → PERMISSION MAPPING
// ============================================================

export interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
  permission: Permission;
}

/**
 * Map each sidebar route to the permission needed to see it.
 * Used by DashboardLayout to filter nav items.
 */
export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  '/dashboard': 'dashboard.view',
  '/dashboard/bookings': 'bookings.view',
  '/dashboard/bookings?view=arrivals': 'bookings.checkin',
  '/dashboard/bookings?view=departures': 'bookings.checkout',
  '/dashboard/in-house': 'bookings.view',
  '/dashboard/tape-chart': 'bookings.view',
  '/dashboard/groups': 'bookings.groups',
  '/dashboard/waitlist': 'waitlist.view',
  '/dashboard/guests': 'guests.view',
  '/dashboard/concierge': 'concierge.view',
  '/dashboard/rooms': 'rooms.view',
  '/dashboard/housekeeping': 'housekeeping.view',
  '/dashboard/maintenance': 'maintenance.view',
  '/dashboard/lost-found': 'lost_found.view',
  '/dashboard/rates': 'rates.view',
  '/dashboard/packages': 'packages.view',
  '/dashboard/payments': 'payments.view',
  '/dashboard/financials': 'financials.view',
  '/dashboard/city-ledger': 'city_ledger.view',
  '/dashboard/channel-manager': 'channel_manager.view',
  '/dashboard/insights': 'insights.view',
  '/dashboard/rate-intelligence': 'rate_intelligence.view',
  '/dashboard/night-audit': 'night_audit.view',
  '/dashboard/staff-rota': 'staff_rota.view',
  '/dashboard/reports': 'reports.view',
  '/dashboard/activity-log': 'activity_log.view',
  '/dashboard/guest-messaging': 'messaging.view',
  '/dashboard/email-templates': 'email_templates.view',
  '/dashboard/messages': 'messages.view',
  '/dashboard/settings': 'settings.view',
  '/dashboard/ai-assistant': 'ai_assistant.view',
  '/dashboard/feature-toggles': 'settings.manage',
};

// ============================================================
// HELPERS
// ============================================================

export function hasPermission(role: StaffRole, permission: Permission): boolean {
  const def = ROLE_DEFINITIONS[role];
  return def.permissions.includes(permission);
}

export function hasAnyPermission(role: StaffRole, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

export function getPermissionsForRole(role: StaffRole): Permission[] {
  return ROLE_DEFINITIONS[role].permissions;
}

export function getRoleLabel(role: StaffRole): string {
  return ROLE_DEFINITIONS[role].label;
}

export function getRoleColor(role: StaffRole): string {
  return ROLE_DEFINITIONS[role].color;
}
