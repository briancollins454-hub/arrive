import { useState } from 'react';
import { useProperty } from '@/hooks/useProperty';
import { useStaff } from '@/hooks/useStaff';
import type { StaffInvite } from '@/hooks/useStaff';
import { isDemoMode } from '@/lib/supabase';
import { PageSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Separator } from '@/components/ui/Separator';
import {
  Save, Building, Clock, Globe, Palette, Users, Shield,
  UserPlus, Trash2, Edit2, Check, X, Moon, Key, Mail,
  CreditCard, Smartphone, Wifi, Signal, Receipt, Ban, Plus,
  ChevronDown, ChevronRight, ToggleLeft, ToggleRight,
  CalendarClock, Network, BookOpen, ShieldCheck, Download,
  FileDown, UserX, AlertCircle, Copy, Link2, Loader2,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useKeyCard, KEY_CARD_PROVIDERS } from '@/hooks/useKeyCard';
import { KeyCardModal } from '@/components/dashboard/KeyCardModal';
import type { KeyCardProvider, KeyCardType } from '@/hooks/useKeyCard';
import { cn } from '@/lib/utils';
import { exportCSV } from '@/lib/exportUtils';
import { format } from 'date-fns';
import { ROLE_DEFINITIONS, PERMISSION_GROUPS, getRoleLabel, getRoleColor } from '@/lib/roles';
import type { Permission } from '@/lib/roles';
import type { StaffRole, TaxRule, CancellationPolicy, CancellationPolicyType, FolioChargeCategory } from '@/types';

// ============================================================
// Types
// ============================================================

/** Internal display type that maps DB permissions JSONB to arrays */
interface StaffDisplayMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  is_active: boolean;
  created_at: string;
  grantedPermissions: Permission[];
  revokedPermissions: Permission[];
}

interface SettingsFormValues {
  name: string;
  slug: string;
  description: string;
  address_line1: string;
  address_line2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  check_in_time: string;
  check_out_time: string;
  currency: string;
  timezone: string;
  primary_color: string;
  accent_color: string;
}

/** Parse the DB permissions JSONB into display arrays */
function toDisplayMember(s: import('@/types').StaffMember): StaffDisplayMember {
  const perms = (s.permissions ?? {}) as { granted?: string[]; revoked?: string[] };
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    role: s.role as StaffRole,
    is_active: s.is_active,
    created_at: s.created_at,
    grantedPermissions: (perms.granted ?? []) as Permission[],
    revokedPermissions: (perms.revoked ?? []) as Permission[],
  };
}

/** Convert display permission arrays back to DB JSONB format */
function toDbPermissions(granted: Permission[], revoked: Permission[]): Record<string, unknown> {
  return { granted, revoked };
}

interface NightAuditSettings {
  auto_run: boolean;
  auto_run_time: string;
  auto_no_show_after: string;
  auto_checkout_overdue: boolean;
  send_summary_email: boolean;
  summary_email_to: string;
}

// Role permissions & colours now imported from centralised RBAC module

// ============================================================
// Tab Config
// ============================================================

const settingsTabs = [
  { id: 'property', label: 'Property', icon: Building },
  { id: 'operations', label: 'Operations', icon: Clock },
  { id: 'business-date', label: 'Business Date', icon: CalendarClock },
  { id: 'departments', label: 'Departments', icon: Network },
  { id: 'gl-codes', label: 'GL Codes', icon: BookOpen },
  { id: 'taxes', label: 'Taxes', icon: Receipt },
  { id: 'policies', label: 'Policies', icon: Ban },
  { id: 'users', label: 'Users & Access', icon: Users },
  { id: 'night-audit', label: 'Night Audit', icon: Moon },
  { id: 'key-cards', label: 'Key Cards', icon: Key },
  { id: 'gdpr', label: 'GDPR & Privacy', icon: ShieldCheck },
  { id: 'branding', label: 'Branding', icon: Palette },
] as const;

type TabId = typeof settingsTabs[number]['id'];

// ============================================================
// Component
// ============================================================

export function SettingsPage() {
  const { property, setProperty } = useProperty();
  const [activeTab, setActiveTab] = useState<TabId>('property');

  // Staff management — live Supabase data
  const {
    staff: rawStaff, isLoadingStaff,
    invites, // isLoadingInvites available if needed
    sendInvite, revokeInvite,
    updateStaff, toggleActive, deleteStaff, changeRole,
  } = useStaff();
  const staff: StaffDisplayMember[] = rawStaff.map(toDisplayMember);

  // Local UI state for user management
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingPermissionsId, setEditingPermissionsId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'receptionist' as StaffRole });
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const keyCard = useKeyCard();
  const [showMasterKeyModal, setShowMasterKeyModal] = useState(false);
  const [masterKeyCards, setMasterKeyCards] = useState<import('@/hooks/useKeyCard').KeyCard[]>([]);
  const [masterKeyStaffName, setMasterKeyStaffName] = useState('');
  const [masterKeyValidDays, setMasterKeyValidDays] = useState(365);

  // Night audit settings
  const [auditSettings, setAuditSettings] = useState<NightAuditSettings>({
    auto_run: true,
    auto_run_time: '00:00',
    auto_no_show_after: '18:00',
    auto_checkout_overdue: true,
    send_summary_email: true,
    summary_email_to: 'alex@arrive-hotel.com',
  });

  // Tax rules
  const [taxRules, setTaxRules] = useState<TaxRule[]>([
    {
      id: 'tax-1',
      property_id: 'p1',
      name: 'VAT',
      rate: 20,
      applies_to: ['room', 'food', 'beverage', 'spa', 'laundry', 'phone', 'other'],
      is_inclusive: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tax-2',
      property_id: 'p1',
      name: 'City Tourism Levy',
      rate: 2,
      applies_to: ['room'],
      is_inclusive: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);
  const [showAddTax, setShowAddTax] = useState(false);
  const [newTax, setNewTax] = useState({ name: '', rate: '', applies_to: ['room'] as FolioChargeCategory[], is_inclusive: false });

  // Cancellation policies
  const [policies, setPolicies] = useState<CancellationPolicy[]>([
    {
      id: 'pol-1',
      property_id: 'p1',
      name: 'Standard',
      type: 'moderate' as CancellationPolicyType,
      free_cancellation_hours: 48,
      penalty_type: 'first_night',
      penalty_amount: 0,
      no_show_penalty_type: 'full_stay',
      no_show_penalty_amount: 0,
      is_default: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'pol-2',
      property_id: 'p1',
      name: 'Non-Refundable',
      type: 'strict' as CancellationPolicyType,
      free_cancellation_hours: 0,
      penalty_type: 'percentage',
      penalty_amount: 100,
      no_show_penalty_type: 'full_stay',
      no_show_penalty_amount: 0,
      is_default: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'pol-3',
      property_id: 'p1',
      name: 'Flexible',
      type: 'free' as CancellationPolicyType,
      free_cancellation_hours: 24,
      penalty_type: 'fixed',
      penalty_amount: 0,
      no_show_penalty_type: 'percentage',
      no_show_penalty_amount: 0,
      is_default: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);
  const [showAddPolicy, setShowAddPolicy] = useState(false);

  // Business date management
  const [businessDate, setBusinessDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [advanceTime, setAdvanceTime] = useState('00:00');

  // Departments
  const [departments, setDepartments] = useState([
    { id: 'dept-1', name: 'Front Office', code: 'FO', head: 'Tom Parker', active: true },
    { id: 'dept-2', name: 'Housekeeping', code: 'HK', head: 'Jake Evans', active: true },
    { id: 'dept-3', name: 'Food & Beverage', code: 'FB', head: '', active: true },
    { id: 'dept-4', name: 'Maintenance', code: 'MT', head: 'Mark Taylor', active: true },
    { id: 'dept-5', name: 'Finance', code: 'FN', head: 'Nina Patel', active: true },
    { id: 'dept-6', name: 'Spa & Wellness', code: 'SP', head: '', active: true },
    { id: 'dept-7', name: 'Concierge', code: 'CN', head: 'Emma Clark', active: true },
    { id: 'dept-8', name: 'Revenue Management', code: 'RM', head: 'James Wilson', active: true },
  ]);
  const [showAddDept, setShowAddDept] = useState(false);
  const [newDept, setNewDept] = useState({ name: '', code: '', head: '' });

  // GL Codes (General Ledger / Nominal Codes)
  const [glCodes, setGlCodes] = useState([
    { id: 'gl-1', code: '4000', name: 'Room Revenue', category: 'room' as FolioChargeCategory, department: 'Front Office', active: true },
    { id: 'gl-2', code: '4100', name: 'Food Revenue', category: 'food' as FolioChargeCategory, department: 'Food & Beverage', active: true },
    { id: 'gl-3', code: '4200', name: 'Beverage Revenue', category: 'beverage' as FolioChargeCategory, department: 'Food & Beverage', active: true },
    { id: 'gl-4', code: '4300', name: 'Spa Revenue', category: 'spa' as FolioChargeCategory, department: 'Spa & Wellness', active: true },
    { id: 'gl-5', code: '4400', name: 'Laundry Revenue', category: 'laundry' as FolioChargeCategory, department: 'Housekeeping', active: true },
    { id: 'gl-6', code: '4500', name: 'Telephone Revenue', category: 'telephone' as FolioChargeCategory, department: 'Front Office', active: true },
    { id: 'gl-7', code: '4600', name: 'Parking Revenue', category: 'parking' as FolioChargeCategory, department: 'Front Office', active: true },
    { id: 'gl-8', code: '4700', name: 'Minibar Revenue', category: 'minibar' as FolioChargeCategory, department: 'Food & Beverage', active: true },
    { id: 'gl-9', code: '4900', name: 'Miscellaneous Revenue', category: 'other' as FolioChargeCategory, department: 'Finance', active: true },
    { id: 'gl-10', code: '2100', name: 'VAT Output', category: 'room' as FolioChargeCategory, department: 'Finance', active: true },
    { id: 'gl-11', code: '1200', name: 'Accounts Receivable', category: 'other' as FolioChargeCategory, department: 'Finance', active: true },
  ]);
  const [showAddGL, setShowAddGL] = useState(false);
  const [newGL, setNewGL] = useState({ code: '', name: '', category: 'room' as FolioChargeCategory, department: '' });

  // GDPR & Privacy
  const [gdprSettings, setGdprSettings] = useState({
    consent_required: true,
    marketing_opt_in: false,
    data_retention_months: 24,
    auto_purge_enabled: true,
    cookie_consent_enabled: true,
    right_to_erasure_enabled: true,
    data_export_format: 'json' as 'json' | 'csv',
    dpo_email: 'privacy@arrive-hotel.com',
    privacy_policy_url: 'https://arrivebooking.online/privacy',
  });

  const { register, handleSubmit } = useForm<SettingsFormValues>({
    values: property ? {
      name: property.name,
      slug: property.slug,
      description: property.description || '',
      address_line1: property.address?.line1 || '',
      address_line2: property.address?.line2 || '',
      city: property.address?.city || '',
      county: property.address?.county || '',
      postcode: property.address?.postcode || '',
      country: property.address?.country || '',
      phone: property.contact?.phone || '',
      email: property.contact?.email || '',
      website: property.contact?.website || '',
      check_in_time: property.settings?.check_in_time || '15:00',
      check_out_time: property.settings?.check_out_time || '11:00',
      currency: property.settings?.currency || 'GBP',
      timezone: property.settings?.timezone || 'Europe/London',
      primary_color: property.branding?.primary_color || '#1a1a2e',
      accent_color: property.branding?.accent_color || '#d4af37',
    } : undefined,
  });

  if (!property) return <PageSpinner />;

  const onSubmit = (data: SettingsFormValues) => {
    if (property) {
      setProperty({
        ...property,
        name: data.name,
        slug: data.slug,
        description: data.description,
        address: {
          line1: data.address_line1,
          line2: data.address_line2,
          city: data.city,
          county: data.county,
          postcode: data.postcode,
          country: data.country,
        },
        contact: {
          phone: data.phone,
          email: data.email,
          website: data.website,
        },
        settings: {
          ...property.settings,
          check_in_time: data.check_in_time,
          check_out_time: data.check_out_time,
          currency: data.currency,
          timezone: data.timezone,
        },
        branding: {
          ...property.branding,
          primary_color: data.primary_color,
          accent_color: data.accent_color,
        },
        updated_at: new Date().toISOString(),
      });
    }
    toast.success('Settings saved');
  };

  // Staff handlers — persisted to Supabase
  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email) { toast.error('Name and email are required'); return; }
    try {
      await sendInvite.mutateAsync({ name: newUser.name, email: newUser.email, role: newUser.role });
      toast.success(`Invite sent to ${newUser.email}`);
      setNewUser({ name: '', email: '', role: 'receptionist' });
      setShowAddUser(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invite');
    }
  };

  const handleToggleActive = (id: string) => {
    const member = staff.find(s => s.id === id);
    if (!member) return;
    toggleActive.mutate({ id, is_active: !member.is_active });
  };

  const handleDeleteUser = (id: string) => {
    const member = staff.find(s => s.id === id);
    if (member?.role === 'owner') { toast.error('Cannot remove owner account'); return; }
    deleteStaff.mutate(id);
  };

  const handleChangeRole = (id: string, role: StaffRole) => {
    changeRole.mutate({ id, role });
    setEditingUserId(null);
  };

  /** Persist permission changes to Supabase */
  const persistPermissions = (userId: string, granted: Permission[], revoked: Permission[]) => {
    updateStaff.mutate({ id: userId, permissions: toDbPermissions(granted, revoked) as Record<string, boolean> });
  };

  /** Toggle a single permission for a specific user — cycles: role-default → granted/revoked → back */
  const handleTogglePermission = (userId: string, permission: Permission) => {
    const member = staff.find(s => s.id === userId);
    if (!member) return;
    const rolePerms = ROLE_DEFINITIONS[member.role].permissions;
    const isRoleDefault = rolePerms.includes(permission);
    const isGranted = member.grantedPermissions.includes(permission);
    const isRevoked = member.revokedPermissions.includes(permission);

    let newGranted = [...member.grantedPermissions];
    let newRevoked = [...member.revokedPermissions];

    if (isRoleDefault) {
      if (!isRevoked) {
        newRevoked.push(permission);
      } else {
        newRevoked = newRevoked.filter(p => p !== permission);
      }
    } else {
      if (!isGranted) {
        newGranted.push(permission);
      } else {
        newGranted = newGranted.filter(p => p !== permission);
      }
    }
    persistPermissions(userId, newGranted, newRevoked);
  };

  /** Grant all permissions in a group */
  const handleGrantGroup = (userId: string, permissions: Permission[]) => {
    const member = staff.find(s => s.id === userId);
    if (!member) return;
    const rolePerms = ROLE_DEFINITIONS[member.role].permissions;
    const newGranted = [...member.grantedPermissions];
    let newRevoked = [...member.revokedPermissions];
    for (const p of permissions) {
      const isDefault = rolePerms.includes(p);
      if (isDefault) {
        newRevoked = newRevoked.filter(r => r !== p);
      } else if (!newGranted.includes(p)) {
        newGranted.push(p);
      }
    }
    persistPermissions(userId, newGranted, newRevoked);
    toast.success('Group permissions granted');
  };

  /** Revoke all permissions in a group */
  const handleRevokeGroup = (userId: string, permissions: Permission[]) => {
    const member = staff.find(s => s.id === userId);
    if (!member) return;
    const rolePerms = ROLE_DEFINITIONS[member.role].permissions;
    let newGranted = [...member.grantedPermissions];
    const newRevoked = [...member.revokedPermissions];
    for (const p of permissions) {
      const isDefault = rolePerms.includes(p);
      if (isDefault && !newRevoked.includes(p)) {
        newRevoked.push(p);
      } else if (!isDefault) {
        newGranted = newGranted.filter(g => g !== p);
      }
    }
    persistPermissions(userId, newGranted, newRevoked);
    toast.success('Group permissions revoked');
  };

  /** Reset all custom overrides for a user back to role defaults */
  const handleResetPermissions = (userId: string) => {
    persistPermissions(userId, [], []);
    toast.success('Permissions reset to role defaults');
  };

  /** Copy invite link to clipboard */
  const handleCopyInviteLink = (invite: StaffInvite) => {
    const url = `${window.location.origin}/invite/${invite.token}`;
    navigator.clipboard.writeText(url);
    setCopiedInviteId(invite.id);
    toast.success('Invite link copied');
    setTimeout(() => setCopiedInviteId(null), 2000);
  };

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => prev.includes(label) ? prev.filter(g => g !== label) : [...prev, label]);
  };

  const handleSaveAuditSettings = () => {
    toast.success('Night audit settings saved');
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display text-white mb-1.5 tracking-tight">Settings</h1>
          <p className="text-sm text-steel font-body">Manage property, users, and system configuration</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-6 overflow-x-auto">
        {settingsTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-body font-medium transition-all whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-white/[0.1] text-white shadow-sm'
                : 'text-steel hover:text-silver hover:bg-white/[0.04]'
            )}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============================== */}
      {/* Property Tab                   */}
      {/* ============================== */}
      {activeTab === 'property' && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card variant="dark">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building size={18} className="text-teal" /> Property Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label variant="dark">Property Name</Label>
                  <Input variant="dark" {...register('name')} />
                </div>
                <div>
                  <Label variant="dark">URL Slug</Label>
                  <Input variant="dark" {...register('slug')} />
                </div>
              </div>
              <div>
                <Label variant="dark">Description</Label>
                <Textarea variant="dark" rows={3} {...register('description')} />
              </div>
              <Separator variant="dark" />
              <div className="grid grid-cols-2 gap-4">
                <div><Label variant="dark">Address Line 1</Label><Input variant="dark" {...register('address_line1')} /></div>
                <div><Label variant="dark">Address Line 2</Label><Input variant="dark" {...register('address_line2')} /></div>
                <div><Label variant="dark">City</Label><Input variant="dark" {...register('city')} /></div>
                <div><Label variant="dark">County</Label><Input variant="dark" {...register('county')} /></div>
                <div><Label variant="dark">Postcode</Label><Input variant="dark" {...register('postcode')} /></div>
                <div><Label variant="dark">Country</Label><Input variant="dark" {...register('country')} /></div>
              </div>
            </CardContent>
          </Card>

          <Card variant="dark">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Globe size={18} className="text-teal" /> Contact & Web
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label variant="dark">Phone</Label><Input variant="dark" {...register('phone')} /></div>
                <div><Label variant="dark">Email</Label><Input variant="dark" type="email" {...register('email')} /></div>
                <div className="col-span-2"><Label variant="dark">Website</Label><Input variant="dark" {...register('website')} /></div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit"><Save size={16} className="mr-2" />Save Property Settings</Button>
          </div>
        </form>
      )}

      {/* ============================== */}
      {/* Operations Tab                 */}
      {/* ============================== */}
      {activeTab === 'operations' && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card variant="dark">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock size={18} className="text-teal" /> Check-in / Check-out
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label variant="dark">Check-in Time</Label><Input variant="dark" type="time" {...register('check_in_time')} /></div>
                <div><Label variant="dark">Check-out Time</Label><Input variant="dark" type="time" {...register('check_out_time')} /></div>
                <div><Label variant="dark">Currency</Label><Input variant="dark" {...register('currency')} /></div>
                <div><Label variant="dark">Timezone</Label><Input variant="dark" {...register('timezone')} /></div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit"><Save size={16} className="mr-2" />Save Operations Settings</Button>
          </div>
        </form>
      )}

      {/* ============================== */}
      {/* Business Date Tab              */}
      {/* ============================== */}
      {activeTab === 'business-date' && (
        <div className="space-y-6">
          <Card variant="dark">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CalendarClock size={18} className="text-teal" /> Business Date Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-xs text-steel font-body leading-relaxed">
                The business date determines which operational day the hotel is currently in. 
                Night audit advances this date. You can also manually advance it in special circumstances.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label variant="dark">Current Business Date</Label>
                  <div className="flex gap-2">
                    <Input
                      variant="dark"
                      type="date"
                      value={businessDate}
                      onChange={e => setBusinessDate(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline-dark"
                      size="sm"
                      onClick={() => {
                        const next = new Date(businessDate);
                        next.setDate(next.getDate() + 1);
                        setBusinessDate(format(next, 'yyyy-MM-dd'));
                        toast.success(`Business date advanced to ${format(next, 'EEEE, MMMM d, yyyy')}`);
                      }}
                    >
                      Advance →
                    </Button>
                  </div>
                  <p className="text-[11px] text-steel/60 font-body mt-1">
                    Displayed as: {format(new Date(businessDate + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <Label variant="dark">System Date</Label>
                  <Input variant="dark" value={format(new Date(), 'yyyy-MM-dd')} disabled />
                  <p className="text-[11px] text-steel/60 font-body mt-1">
                    Server clock — cannot be modified
                  </p>
                </div>
              </div>

              <Separator variant="dark" />

              {/* Auto-advance toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div>
                  <p className="text-sm text-white font-body font-medium">Auto-advance After Night Audit</p>
                  <p className="text-xs text-steel font-body mt-0.5">
                    Automatically advance the business date when the night audit completes
                  </p>
                </div>
                <button
                  onClick={() => setAutoAdvance(!autoAdvance)}
                  className={cn('relative w-11 h-6 rounded-full transition-colors', autoAdvance ? 'bg-teal' : 'bg-white/[0.1]')}
                >
                  <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow', autoAdvance ? 'translate-x-[22px]' : 'translate-x-0.5')} />
                </button>
              </div>

              {autoAdvance && (
                <div className="pl-3 border-l-2 border-teal/20">
                  <Label variant="dark">Advance Time</Label>
                  <Input
                    variant="dark"
                    type="time"
                    value={advanceTime}
                    onChange={e => setAdvanceTime(e.target.value)}
                    className="max-w-[200px]"
                  />
                  <p className="text-[11px] text-steel/60 font-body mt-1">
                    Should match night audit run time
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card variant="dark">
            <CardHeader><CardTitle className="text-white text-base">Business Date History</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { date: format(new Date(), 'yyyy-MM-dd'), method: 'Night Audit', by: 'System', time: '00:15' },
                  { date: format(new Date(Date.now() - 86400000), 'yyyy-MM-dd'), method: 'Night Audit', by: 'System', time: '00:12' },
                  { date: format(new Date(Date.now() - 172800000), 'yyyy-MM-dd'), method: 'Manual', by: 'Alex Thompson', time: '23:45' },
                ].map((entry, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs font-body">
                    <span className="text-white font-medium">{entry.date}</span>
                    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold border', entry.method === 'Night Audit' ? 'text-teal bg-teal/10 border-teal/20' : 'text-amber-400 bg-amber-400/10 border-amber-400/20')}>{entry.method}</span>
                    <span className="text-steel">by {entry.by}</span>
                    <span className="text-steel/60 ml-auto">at {entry.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => toast.success('Business date settings saved')}><Save size={16} className="mr-2" />Save Settings</Button>
          </div>
        </div>
      )}

      {/* ============================== */}
      {/* Departments Tab                */}
      {/* ============================== */}
      {activeTab === 'departments' && (
        <div className="space-y-6">
          <Card variant="dark">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Network size={18} className="text-teal" /> Hotel Departments
              </CardTitle>
              <button
                onClick={() => setShowAddDept(!showAddDept)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body font-medium bg-teal/10 text-teal border border-teal/20 hover:bg-teal/20 transition-all"
              >
                <Plus size={14} /> Add Department
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-steel font-body">
                Departments are used for cost centre assignment, GL code mapping, staff allocation, and reporting.
              </p>

              {showAddDept && (
                <div className="card-dark space-y-3 border border-teal/20">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label variant="dark">Department Name</Label>
                      <Input variant="dark" placeholder="e.g. Security" value={newDept.name} onChange={e => setNewDept({ ...newDept, name: e.target.value })} />
                    </div>
                    <div>
                      <Label variant="dark">Code</Label>
                      <Input variant="dark" placeholder="e.g. SC" maxLength={4} value={newDept.code} onChange={e => setNewDept({ ...newDept, code: e.target.value.toUpperCase() })} />
                    </div>
                    <div>
                      <Label variant="dark">Head of Department</Label>
                      <Input variant="dark" placeholder="Staff name" value={newDept.head} onChange={e => setNewDept({ ...newDept, head: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => {
                      if (!newDept.name || !newDept.code) { toast.error('Name and code are required'); return; }
                      setDepartments([...departments, { id: `dept-${Date.now()}`, name: newDept.name, code: newDept.code, head: newDept.head, active: true }]);
                      setNewDept({ name: '', code: '', head: '' });
                      setShowAddDept(false);
                      toast.success('Department added');
                    }}>
                      <Check size={14} className="mr-1" /> Save
                    </Button>
                    <Button variant="outline-dark" size="sm" onClick={() => setShowAddDept(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {departments.map(dept => (
                  <div key={dept.id} className={cn('card-dark flex items-center justify-between', !dept.active && 'opacity-50')}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-teal/10 border border-teal/20 flex items-center justify-center text-xs font-display font-bold text-teal">
                        {dept.code}
                      </div>
                      <div>
                        <p className="text-sm font-body font-medium text-white">{dept.name}</p>
                        <p className="text-xs text-steel font-body">{dept.head || 'No head assigned'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDepartments(departments.map(d => d.id === dept.id ? { ...d, active: !d.active } : d))}
                        className={cn('text-[10px] font-body font-semibold px-2 py-1 rounded-full border', dept.active ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-steel bg-white/[0.03] border-white/[0.06]')}
                      >
                        {dept.active ? 'Active' : 'Disabled'}
                      </button>
                      <button onClick={() => { setDepartments(departments.filter(d => d.id !== dept.id)); toast.success('Department removed'); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-steel hover:text-red-400 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================== */}
      {/* GL Codes Tab                   */}
      {/* ============================== */}
      {activeTab === 'gl-codes' && (
        <div className="space-y-6">
          <Card variant="dark">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <BookOpen size={18} className="text-teal" /> General Ledger Codes
              </CardTitle>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const rows = glCodes.map(gl => ({ Code: gl.code, Name: gl.name, Category: gl.category, Department: gl.department, Active: gl.active ? 'Yes' : 'No' }));
                    exportCSV(rows, `gl-codes-${format(new Date(), 'yyyy-MM-dd')}`);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body font-medium border border-white/[0.08] bg-white/[0.03] text-steel hover:text-silver hover:bg-white/[0.06] transition-all"
                >
                  <Download size={13} /> Export
                </button>
                <button
                  onClick={() => setShowAddGL(!showAddGL)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body font-medium bg-teal/10 text-teal border border-teal/20 hover:bg-teal/20 transition-all"
                >
                  <Plus size={14} /> Add Code
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-steel font-body">
                Map charge categories to nominal ledger codes for accounting exports. These codes appear in financial reports and can be used for integration with Sage, Xero, QuickBooks, etc.
              </p>

              {showAddGL && (
                <div className="card-dark space-y-3 border border-teal/20">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label variant="dark">Nominal Code</Label>
                      <Input variant="dark" placeholder="e.g. 4000" value={newGL.code} onChange={e => setNewGL({ ...newGL, code: e.target.value })} />
                    </div>
                    <div>
                      <Label variant="dark">Description</Label>
                      <Input variant="dark" placeholder="e.g. Room Revenue" value={newGL.name} onChange={e => setNewGL({ ...newGL, name: e.target.value })} />
                    </div>
                    <div>
                      <Label variant="dark">Charge Category</Label>
                      <select value={newGL.category} onChange={e => setNewGL({ ...newGL, category: e.target.value as FolioChargeCategory })} className="input-dark w-full text-sm py-2 px-3 rounded-xl bg-charcoal border border-white/[0.06]">
                        {['room', 'food', 'beverage', 'spa', 'minibar', 'laundry', 'telephone', 'parking', 'other'].map(c => (
                          <option key={c} value={c} className="capitalize">{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label variant="dark">Department</Label>
                      <select value={newGL.department} onChange={e => setNewGL({ ...newGL, department: e.target.value })} className="input-dark w-full text-sm py-2 px-3 rounded-xl bg-charcoal border border-white/[0.06]">
                        <option value="">Select department</option>
                        {departments.filter(d => d.active).map(d => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => {
                      if (!newGL.code || !newGL.name) { toast.error('Code and description are required'); return; }
                      setGlCodes([...glCodes, { id: `gl-${Date.now()}`, ...newGL, active: true }]);
                      setNewGL({ code: '', name: '', category: 'room', department: '' });
                      setShowAddGL(false);
                      toast.success('GL code added');
                    }}>
                      <Check size={14} className="mr-1" /> Save
                    </Button>
                    <Button variant="outline-dark" size="sm" onClick={() => setShowAddGL(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-xs font-body">
                  <thead>
                    <tr className="border-b border-white/[0.08]">
                      <th className="text-left text-[10px] text-steel uppercase p-3">Code</th>
                      <th className="text-left text-[10px] text-steel uppercase p-3">Description</th>
                      <th className="text-left text-[10px] text-steel uppercase p-3">Category</th>
                      <th className="text-left text-[10px] text-steel uppercase p-3">Department</th>
                      <th className="text-right text-[10px] text-steel uppercase p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {glCodes.map(gl => (
                      <tr key={gl.id} className={cn('border-b border-white/[0.04] hover:bg-white/[0.02]', !gl.active && 'opacity-50')}>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-white/[0.06] text-gold font-mono text-[11px] font-semibold">{gl.code}</span></td>
                        <td className="p-3 text-silver">{gl.name}</td>
                        <td className="p-3 text-steel capitalize">{gl.category}</td>
                        <td className="p-3 text-steel">{gl.department || '—'}</td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => setGlCodes(glCodes.map(g => g.id === gl.id ? { ...g, active: !g.active } : g))} className={cn('text-[10px] font-semibold px-2 py-1 rounded-full border', gl.active ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-steel bg-white/[0.03] border-white/[0.06]')}>
                              {gl.active ? 'Active' : 'Off'}
                            </button>
                            <button onClick={() => { setGlCodes(glCodes.filter(g => g.id !== gl.id)); toast.success('GL code removed'); }} className="p-1 rounded-lg hover:bg-red-500/10 text-steel hover:text-red-400 transition-all">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================== */}
      {/* Users & Access Tab             */}
      {/* ============================== */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-steel font-body">
              {isLoadingStaff ? 'Loading…' : `${staff.filter(s => s.is_active).length} active users`}
              {invites.length > 0 && <span className="text-gold ml-2">· {invites.length} pending invite{invites.length !== 1 ? 's' : ''}</span>}
            </p>
            <Button onClick={() => setShowAddUser(!showAddUser)} disabled={sendInvite.isPending}>
              <UserPlus size={16} className="mr-2" />{isDemoMode ? 'Add User' : 'Invite User'}
            </Button>
          </div>

          {showAddUser && (
            <Card variant="dark" className="animate-in slide-in-from-top-2 duration-200">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <UserPlus size={16} className="text-teal" /> {isDemoMode ? 'Add New User' : 'Invite New User'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label variant="dark">Full Name *</Label>
                    <Input variant="dark" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} placeholder="Enter full name" />
                  </div>
                  <div>
                    <Label variant="dark">Email *</Label>
                    <Input variant="dark" type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="user@hotel.com" />
                  </div>
                  <div>
                    <Label variant="dark">Role</Label>
                    <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as StaffRole })} className="input-dark w-full">
                      {(Object.keys(ROLE_DEFINITIONS) as StaffRole[]).filter(r => r !== 'owner').map((r) => (
                        <option key={r} value={r}>{getRoleLabel(r)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {!isDemoMode && (
                  <p className="text-[11px] text-steel/60 font-body">
                    An invite link will be generated. Share it with the user — they'll create a password and get access.
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="ghost-dark" onClick={() => setShowAddUser(false)}>Cancel</Button>
                  <Button onClick={handleAddUser} disabled={sendInvite.isPending}>
                    {sendInvite.isPending ? <><Loader2 size={14} className="mr-1 animate-spin" /> Sending…</> : <><Check size={14} className="mr-1" /> {isDemoMode ? 'Add User' : 'Send Invite'}</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Pending Invites ────────────────────────────────────── */}
          {invites.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gold/80 font-body font-semibold flex items-center gap-1.5">
                <Link2 size={12} /> Pending Invites
              </p>
              {invites.map(inv => (
                <Card key={inv.id} variant="dark" className="border-gold/10">
                  <CardContent className="py-3">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold font-display text-sm shrink-0">
                        {inv.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-body font-medium text-sm truncate">{inv.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1 text-xs text-steel font-body"><Mail size={11} /> {inv.email}</span>
                          <span className="text-[10px] text-gold bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded-full font-body">
                            {getRoleLabel(inv.role as StaffRole)}
                          </span>
                          <span className="text-[10px] text-steel/50 font-body">
                            Expires {new Date(inv.expires_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopyInviteLink(inv)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-body text-teal hover:bg-teal/10 border border-teal/20 transition-all"
                          title="Copy invite link"
                        >
                          {copiedInviteId === inv.id ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy Link</>}
                        </button>
                        <button
                          onClick={() => revokeInvite.mutate(inv.id)}
                          className="p-2 rounded-lg text-steel hover:text-red-400 hover:bg-red-400/10 transition-all"
                          title="Revoke invite"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* ── Staff Members ──────────────────────────────────────── */}
          <div className="space-y-3">
            {staff.map(member => (
              <Card key={member.id} variant="dark" className={cn(!member.is_active && 'opacity-50')}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-gold font-display text-sm shrink-0">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-body font-medium text-sm truncate">{member.name}</p>
                        {!member.is_active && (
                          <span className="text-[10px] text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded-full font-body">Inactive</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-steel font-body"><Mail size={11} /> {member.email}</span>
                        {member.created_at && (
                          <span className="text-[11px] text-steel/60 font-body">Added {new Date(member.created_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    {editingUserId === member.id ? (
                      <select
                        defaultValue={member.role}
                        onChange={e => handleChangeRole(member.id, e.target.value as StaffRole)}
                        onBlur={() => setEditingUserId(null)}
                        autoFocus
                        className="input-dark text-xs py-1.5 px-2 w-48"
                      >
                        {(Object.keys(ROLE_DEFINITIONS) as StaffRole[]).map((r) => (
                          <option key={r} value={r}>{getRoleLabel(r)}</option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingUserId(member.id)}
                        className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-semibold border transition-all hover:opacity-80', getRoleColor(member.role))}
                        title="Click to change role"
                      >
                        <Shield size={11} />
                        {getRoleLabel(member.role)}
                        <Edit2 size={10} className="ml-1 opacity-50" />
                      </button>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleActive(member.id)}
                        className={cn('p-2 rounded-lg text-xs transition-all', member.is_active ? 'text-steel hover:text-amber-400 hover:bg-amber-400/10' : 'text-steel hover:text-emerald-400 hover:bg-emerald-400/10')}
                        title={member.is_active ? 'Deactivate user' : 'Activate user'}
                      >
                        {member.is_active ? <X size={14} /> : <Check size={14} />}
                      </button>
                      {member.role !== 'owner' && (
                        <button onClick={() => handleDeleteUser(member.id)} className="p-2 rounded-lg text-steel hover:text-red-400 hover:bg-red-400/10 transition-all" title="Remove user">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/[0.06]">
                    {/* Permissions header */}
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] text-steel/60 font-body flex items-center gap-1">
                        <Key size={10} />
                        Permissions
                        <span className="text-steel/40">
                          ({ROLE_DEFINITIONS[member.role].permissions.length + member.grantedPermissions.length - member.revokedPermissions.length} active)
                        </span>
                        {(member.grantedPermissions.length > 0 || member.revokedPermissions.length > 0) && (
                          <span className="text-[9px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-full ml-1">
                            {member.grantedPermissions.length + member.revokedPermissions.length} custom
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {(member.grantedPermissions.length > 0 || member.revokedPermissions.length > 0) && (
                          <button
                            onClick={() => handleResetPermissions(member.id)}
                            className="text-[10px] text-amber-400 hover:text-amber-300 font-body transition-colors px-2 py-0.5 rounded hover:bg-amber-400/10"
                          >
                            Reset to defaults
                          </button>
                        )}
                        <button
                          onClick={() => setEditingPermissionsId(editingPermissionsId === member.id ? null : member.id)}
                          className={cn(
                            'flex items-center gap-1 text-[11px] font-body font-medium px-2.5 py-1 rounded-lg border transition-all',
                            editingPermissionsId === member.id
                              ? 'text-teal bg-teal/10 border-teal/20'
                              : 'text-steel hover:text-silver border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]'
                          )}
                        >
                          <Shield size={10} />
                          {editingPermissionsId === member.id ? 'Close Editor' : 'Edit Access'}
                        </button>
                      </div>
                    </div>

                    <p className="text-[10px] text-steel/50 font-body mb-2 italic">{ROLE_DEFINITIONS[member.role].description}</p>

                    {/* Collapsed summary view */}
                    {editingPermissionsId !== member.id && (
                      <div className="flex flex-wrap gap-1.5">
                        {/* Show granted overrides */}
                        {member.grantedPermissions.map(p => (
                          <span key={p} className="text-[10px] text-emerald-400 bg-emerald-400/5 border border-emerald-400/20 px-2 py-0.5 rounded-full font-body flex items-center gap-1">
                            <Plus size={8} />{p}
                          </span>
                        ))}
                        {/* Show revoked overrides */}
                        {member.revokedPermissions.map(p => (
                          <span key={p} className="text-[10px] text-red-400 bg-red-400/5 border border-red-400/20 px-2 py-0.5 rounded-full font-body flex items-center gap-1 line-through">
                            {p}
                          </span>
                        ))}
                        {/* Show role default permissions (excluding revoked) */}
                        {ROLE_DEFINITIONS[member.role].permissions.filter(p => !member.revokedPermissions.includes(p)).slice(0, member.grantedPermissions.length > 0 || member.revokedPermissions.length > 0 ? 5 : 8).map(p => (
                          <span key={p} className="text-[10px] text-silver/70 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full font-body">{p}</span>
                        ))}
                        {(() => {
                          const remaining = ROLE_DEFINITIONS[member.role].permissions.filter(p => !member.revokedPermissions.includes(p)).length - (member.grantedPermissions.length > 0 || member.revokedPermissions.length > 0 ? 5 : 8);
                          return remaining > 0 ? (
                            <span className="text-[10px] text-steel/50 bg-white/[0.02] border border-white/[0.04] px-2 py-0.5 rounded-full font-body">
                              +{remaining} more
                            </span>
                          ) : null;
                        })()}
                      </div>
                    )}

                    {/* Expanded permission editor */}
                    {editingPermissionsId === member.id && (
                      <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                        {PERMISSION_GROUPS.map((group) => {
                          const rolePerms = ROLE_DEFINITIONS[member.role].permissions;
                          const isExpanded = expandedGroups.includes(group.label);
                          const activeCount = group.permissions.filter(({ key }) => {
                            if (member.revokedPermissions.includes(key)) return false;
                            if (member.grantedPermissions.includes(key)) return true;
                            return rolePerms.includes(key);
                          }).length;

                          return (
                            <div key={group.label} className="rounded-xl border border-white/[0.06] bg-white/[0.01] overflow-hidden">
                              {/* Group header */}
                              <button
                                onClick={() => toggleGroup(group.label)}
                                className="flex items-center justify-between w-full px-3 py-2 hover:bg-white/[0.03] transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  {isExpanded ? <ChevronDown size={12} className="text-steel" /> : <ChevronRight size={12} className="text-steel" />}
                                  <span className="text-xs font-body font-medium text-silver">{group.label}</span>
                                  <span className="text-[10px] text-steel/50 font-body">
                                    {activeCount}/{group.permissions.length}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleGrantGroup(member.id, group.permissions.map(p => p.key)); }}
                                    className="text-[9px] text-emerald-400 hover:text-emerald-300 font-body px-1.5 py-0.5 rounded hover:bg-emerald-400/10 transition-colors"
                                    title="Grant all in group"
                                  >
                                    All
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleRevokeGroup(member.id, group.permissions.map(p => p.key)); }}
                                    className="text-[9px] text-red-400 hover:text-red-300 font-body px-1.5 py-0.5 rounded hover:bg-red-400/10 transition-colors"
                                    title="Revoke all in group"
                                  >
                                    None
                                  </button>
                                </div>
                              </button>

                              {/* Expanded permissions */}
                              {isExpanded && (
                                <div className="border-t border-white/[0.04] px-3 py-2 space-y-1">
                                  {group.permissions.map(({ key, label }) => {
                                    const isDefault = rolePerms.includes(key);
                                    const isGranted = member.grantedPermissions.includes(key);
                                    const isRevoked = member.revokedPermissions.includes(key);
                                    const isActive = isGranted || (isDefault && !isRevoked);
                                    const isOverridden = isGranted || isRevoked;

                                    return (
                                      <button
                                        key={key}
                                        onClick={() => handleTogglePermission(member.id, key)}
                                        className={cn(
                                          'flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg transition-all text-left group/perm',
                                          isActive ? 'hover:bg-white/[0.04]' : 'hover:bg-white/[0.03] opacity-60 hover:opacity-80'
                                        )}
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          {isActive ? (
                                            <ToggleRight size={16} className={cn(
                                              'shrink-0 transition-colors',
                                              isOverridden ? 'text-emerald-400' : 'text-teal'
                                            )} />
                                          ) : (
                                            <ToggleLeft size={16} className={cn(
                                              'shrink-0 transition-colors',
                                              isOverridden ? 'text-red-400' : 'text-steel/40'
                                            )} />
                                          )}
                                          <div className="min-w-0">
                                            <span className={cn(
                                              'text-xs font-body block',
                                              isActive ? 'text-silver' : 'text-steel'
                                            )}>
                                              {label}
                                            </span>
                                            <span className="text-[9px] text-steel/40 font-body">{key}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          {isOverridden && (
                                            <span className={cn(
                                              'text-[9px] font-body font-semibold px-1.5 py-0.5 rounded-full border',
                                              isGranted
                                                ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                                                : 'text-red-400 bg-red-400/10 border-red-400/20'
                                            )}>
                                              {isGranted ? 'Granted' : 'Revoked'}
                                            </span>
                                          )}
                                          {!isOverridden && isDefault && (
                                            <span className="text-[9px] text-steel/30 font-body">role default</span>
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card variant="dark">
            <CardContent className="py-4">
              <p className="text-xs text-steel font-body">
                <Shield size={12} className="inline mr-1 text-teal" />
                New users receive an invitation email with a secure link to set their password.
                All sessions use encrypted tokens. Two-factor authentication can be enabled per user.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================== */}
      {/* Night Audit Tab                */}
      {/* ============================== */}
      {activeTab === 'night-audit' && (
        <div className="space-y-6">
          <Card variant="dark">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Moon size={18} className="text-teal" /> Automatic Night Audit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Auto-run toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div>
                  <p className="text-sm text-white font-body font-medium">Auto-run Night Audit</p>
                  <p className="text-xs text-steel font-body mt-0.5">Automatically runs at your scheduled time each night</p>
                </div>
                <button
                  onClick={() => setAuditSettings({ ...auditSettings, auto_run: !auditSettings.auto_run })}
                  className={cn('relative w-11 h-6 rounded-full transition-colors', auditSettings.auto_run ? 'bg-teal' : 'bg-white/[0.1]')}
                >
                  <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow', auditSettings.auto_run ? 'translate-x-[22px]' : 'translate-x-0.5')} />
                </button>
              </div>

              {auditSettings.auto_run && (
                <div className="grid grid-cols-2 gap-4 pl-3 border-l-2 border-teal/20">
                  <div>
                    <Label variant="dark">Run Time</Label>
                    <Input variant="dark" type="time" value={auditSettings.auto_run_time} onChange={e => setAuditSettings({ ...auditSettings, auto_run_time: e.target.value })} />
                    <p className="text-[11px] text-steel/60 font-body mt-1">Default: midnight (00:00)</p>
                  </div>
                  <div>
                    <Label variant="dark">Mark No-Show After</Label>
                    <Input variant="dark" type="time" value={auditSettings.auto_no_show_after} onChange={e => setAuditSettings({ ...auditSettings, auto_no_show_after: e.target.value })} />
                    <p className="text-[11px] text-steel/60 font-body mt-1">Guests not arrived by this time</p>
                  </div>
                </div>
              )}

              <Separator variant="dark" />

              {/* Auto-checkout toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div>
                  <p className="text-sm text-white font-body font-medium">Auto-checkout Overdue Guests</p>
                  <p className="text-xs text-steel font-body mt-0.5">Automatically check out guests past their departure date</p>
                </div>
                <button
                  onClick={() => setAuditSettings({ ...auditSettings, auto_checkout_overdue: !auditSettings.auto_checkout_overdue })}
                  className={cn('relative w-11 h-6 rounded-full transition-colors', auditSettings.auto_checkout_overdue ? 'bg-teal' : 'bg-white/[0.1]')}
                >
                  <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow', auditSettings.auto_checkout_overdue ? 'translate-x-[22px]' : 'translate-x-0.5')} />
                </button>
              </div>

              {/* Email summary toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div>
                  <p className="text-sm text-white font-body font-medium">Send Summary Email</p>
                  <p className="text-xs text-steel font-body mt-0.5">Email the audit report after each run</p>
                </div>
                <button
                  onClick={() => setAuditSettings({ ...auditSettings, send_summary_email: !auditSettings.send_summary_email })}
                  className={cn('relative w-11 h-6 rounded-full transition-colors', auditSettings.send_summary_email ? 'bg-teal' : 'bg-white/[0.1]')}
                >
                  <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow', auditSettings.send_summary_email ? 'translate-x-[22px]' : 'translate-x-0.5')} />
                </button>
              </div>

              {auditSettings.send_summary_email && (
                <div className="pl-3 border-l-2 border-teal/20">
                  <Label variant="dark">Summary Email Recipients</Label>
                  <Input variant="dark" value={auditSettings.summary_email_to} onChange={e => setAuditSettings({ ...auditSettings, summary_email_to: e.target.value })} placeholder="manager@hotel.com" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card variant="dark">
            <CardHeader><CardTitle className="text-white text-base">What Night Audit Does</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-silver font-body">
                <li className="flex items-start gap-2"><Check size={14} className="text-teal mt-0.5 shrink-0" /><span>Posts room charges and applies nightly rates for all in-house guests</span></li>
                <li className="flex items-start gap-2"><Check size={14} className="text-teal mt-0.5 shrink-0" /><span>Marks no-show bookings for guests who didn&apos;t check in</span></li>
                <li className="flex items-start gap-2"><Check size={14} className="text-teal mt-0.5 shrink-0" /><span>Processes overdue check-outs (if enabled)</span></li>
                <li className="flex items-start gap-2"><Check size={14} className="text-teal mt-0.5 shrink-0" /><span>Generates daily revenue report and occupancy statistics</span></li>
                <li className="flex items-start gap-2"><Check size={14} className="text-teal mt-0.5 shrink-0" /><span>Updates room availability for the next business day</span></li>
                <li className="flex items-start gap-2"><Check size={14} className="text-teal mt-0.5 shrink-0" /><span>Sets all occupied rooms to &quot;dirty&quot; housekeeping status</span></li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveAuditSettings}><Save size={16} className="mr-2" />Save Night Audit Settings</Button>
          </div>
        </div>
      )}

      {/* ============================== */}
      {/* Key Cards Tab                  */}
      {/* ============================== */}
      {activeTab === 'key-cards' && (
        <div className="space-y-6">
          {/* Provider Selection */}
          <Card variant="dark">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Key size={18} className="text-teal" /> Lock System Provider
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {KEY_CARD_PROVIDERS.map(provider => (
                  <button
                    key={provider.id}
                    onClick={() => keyCard.updateConfig({ provider: provider.id })}
                    className={cn(
                      'relative text-left p-4 rounded-xl border transition-all duration-200',
                      keyCard.config.provider === provider.id
                        ? 'bg-teal/10 border-teal/30 ring-1 ring-teal/20'
                        : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]'
                    )}
                  >
                    {keyCard.config.provider === provider.id && (
                      <div className="absolute top-3 right-3">
                        <div className="w-5 h-5 rounded-full bg-teal/20 flex items-center justify-center">
                          <Check size={12} className="text-teal" />
                        </div>
                      </div>
                    )}
                    <p className="text-sm font-display font-semibold text-white mb-0.5">{provider.name}</p>
                    <p className="text-[10px] text-steel font-body mb-2">{provider.fullName}</p>
                    <p className="text-xs text-white/50 font-body leading-relaxed">{provider.description}</p>
                    <div className="flex items-center gap-2 mt-3">
                      {provider.mobileKeySupport && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-400/10 text-[9px] font-semibold text-blue-400 font-body">
                          <Smartphone size={8} /> Mobile
                        </span>
                      )}
                      {provider.cloudBased && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-400/10 text-[9px] font-semibold text-purple-400 font-body">
                          <Wifi size={8} /> Cloud
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-white/30 font-body mt-2">Protocol: {provider.protocol}</p>
                  </button>
                ))}
                {/* No lock system option */}
                <button
                  onClick={() => keyCard.updateConfig({ provider: 'none' as KeyCardProvider })}
                  className={cn(
                    'relative text-left p-4 rounded-xl border transition-all duration-200',
                    keyCard.config.provider === 'none'
                      ? 'bg-white/5 border-white/20 ring-1 ring-white/10'
                      : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]'
                  )}
                >
                  {keyCard.config.provider === 'none' && (
                    <div className="absolute top-3 right-3">
                      <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </div>
                    </div>
                  )}
                  <p className="text-sm font-display font-semibold text-white/60 mb-0.5">No Lock System</p>
                  <p className="text-xs text-white/40 font-body">Physical keys or manual system</p>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Connection Settings */}
          {keyCard.config.provider !== 'none' && (
            <>
              <Card variant="dark">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Signal size={18} className="text-teal" /> Connection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label variant="dark">Encoder Name</Label>
                      <Input
                        variant="dark"
                        value={keyCard.config.encoder_name}
                        onChange={e => keyCard.updateConfig({ encoder_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label variant="dark">Server Host / IP</Label>
                      <Input
                        variant="dark"
                        value={keyCard.config.server_host}
                        onChange={e => keyCard.updateConfig({ server_host: e.target.value })}
                        placeholder="192.168.1.50 or cloud.salto.com"
                      />
                    </div>
                    <div>
                      <Label variant="dark">Port</Label>
                      <Input
                        variant="dark"
                        value={keyCard.config.server_port}
                        onChange={e => keyCard.updateConfig({ server_port: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label variant="dark">API Key</Label>
                      <Input
                        variant="dark"
                        type="password"
                        value={keyCard.config.api_key}
                        onChange={e => keyCard.updateConfig({ api_key: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-emerald-400 font-body">Connected (demo mode)</span>
                  </div>
                </CardContent>
              </Card>

              {/* Encoding Preferences */}
              <Card variant="dark">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <CreditCard size={18} className="text-teal" /> Encoding Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label variant="dark">Default Card Type</Label>
                      <select
                        value={keyCard.config.default_card_type}
                        onChange={e => keyCard.updateConfig({ default_card_type: e.target.value as KeyCardType })}
                        className="select-dark w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white font-body focus:outline-none focus:ring-2 focus:ring-teal/40"
                      >
                        <option value="rfid">RFID Card</option>
                        <option value="magstripe">Magnetic Stripe</option>
                        <option value="mobile">Mobile Key</option>
                        <option value="pin">PIN Code</option>
                      </select>
                    </div>
                    <div>
                      <Label variant="dark">Cards Per Booking</Label>
                      <select
                        value={keyCard.config.cards_per_booking}
                        onChange={e => keyCard.updateConfig({ cards_per_booking: parseInt(e.target.value) })}
                        className="select-dark w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white font-body focus:outline-none focus:ring-2 focus:ring-teal/40"
                      >
                        <option value="1">1 card</option>
                        <option value="2">2 cards</option>
                        <option value="3">3 cards</option>
                        <option value="4">4 cards</option>
                      </select>
                    </div>
                  </div>

                  <Separator variant="dark" />

                  {/* Toggle options */}
                  {[
                    { key: 'auto_encode_on_checkin', label: 'Auto-encode on check-in', desc: 'Automatically trigger key encoding when checking in a guest' },
                    { key: 'include_common_areas', label: 'Include common areas', desc: 'Grant access to gym, pool, spa, and other shared facilities' },
                    { key: 'mobile_key_enabled', label: 'Mobile key support', desc: 'Allow sending digital keys to guest smartphones' },
                    { key: 'send_mobile_key_sms', label: 'Send mobile key via SMS', desc: 'Text the mobile key link to the guest\'s phone number' },
                  ].map(opt => (
                    <label key={opt.key} className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative mt-0.5">
                        <input
                          type="checkbox"
                          checked={keyCard.config[opt.key as keyof typeof keyCard.config] as boolean}
                          onChange={e => keyCard.updateConfig({ [opt.key]: e.target.checked })}
                          className="peer sr-only"
                        />
                        <div className="w-9 h-5 rounded-full bg-white/10 border border-white/10 peer-checked:bg-teal/30 peer-checked:border-teal/40 transition-colors" />
                        <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white/50 peer-checked:bg-teal peer-checked:translate-x-4 transition-all" />
                      </div>
                      <div>
                        <p className="text-sm text-white font-body font-medium">{opt.label}</p>
                        <p className="text-xs text-steel font-body">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          <div className="flex justify-end">
            <Button onClick={() => toast.success('Key card settings saved')}>
              <Save size={16} className="mr-2" />Save Key Card Settings
            </Button>
          </div>

          {/* ── Cut Master Key ────────────────────────────── */}
          <Separator variant="dark" />

          <Card variant="dark" className="border-amber-400/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield size={18} className="text-amber-400" /> Staff Master Keys
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-steel font-body leading-relaxed">
                Master keys grant unrestricted access to <strong className="text-white">all hotel rooms</strong> and common areas. 
                Only issue to authorised staff — housekeeping supervisors, duty managers, and security.
              </p>

              {/* Encode new master key form */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 space-y-4">
                <p className="text-xs text-amber-300 font-body font-semibold uppercase tracking-wider">Encode New Master Key</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label variant="dark">Staff Member Name *</Label>
                    <Input
                      variant="dark"
                      value={masterKeyStaffName}
                      onChange={e => setMasterKeyStaffName(e.target.value)}
                      placeholder="e.g. Sarah, Head Housekeeper"
                    />
                  </div>
                  <div>
                    <Label variant="dark">Valid For</Label>
                    <select
                      value={masterKeyValidDays}
                      onChange={e => setMasterKeyValidDays(parseInt(e.target.value))}
                      className="select-dark w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white font-body focus:outline-none focus:ring-2 focus:ring-teal/40"
                    >
                      <option value="1">24 hours</option>
                      <option value="7">1 week</option>
                      <option value="30">30 days</option>
                      <option value="90">90 days</option>
                      <option value="180">6 months</option>
                      <option value="365">1 year</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      if (!masterKeyStaffName.trim()) { toast.error('Enter staff name'); return; }
                      setMasterKeyCards([]);
                      keyCard.resetEncoding();
                      setShowMasterKeyModal(true);
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-charcoal"
                  >
                    <Shield size={14} className="mr-2" /> Cut Master Key
                  </Button>
                </div>
              </div>

              {/* Active master keys table */}
              {(() => {
                const masterKeys = keyCard.getMasterKeys();
                const activeKeys = masterKeys.filter(k => k.status === 'active');
                const revokedKeys = masterKeys.filter(k => k.status === 'revoked');
                if (masterKeys.length === 0) return null;
                return (
                  <div className="space-y-3">
                    <p className="text-xs text-steel font-body font-semibold uppercase tracking-wider">
                      Active Master Keys ({activeKeys.length})
                    </p>
                    <div className="space-y-2">
                      {activeKeys.map(key => (
                        <div key={key.id} className="flex items-center justify-between bg-white/[0.03] border border-amber-400/10 rounded-xl px-4 py-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Shield size={13} className="text-amber-400" />
                              <span className="text-sm font-body font-medium text-white">{key.guest_name}</span>
                              <span className="inline-flex px-1.5 py-0.5 rounded bg-amber-400/10 text-[10px] font-semibold text-amber-300 font-body">MASTER</span>
                            </div>
                            <p className="text-[11px] text-steel font-body pl-[21px]">
                              Encoded {format(new Date(key.encoded_at), 'dd MMM yyyy HH:mm')} · Valid until {format(new Date(key.valid_until), 'dd MMM yyyy')} · {key.card_type.toUpperCase()}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              if (confirm(`Revoke master key for ${key.guest_name}? This will immediately disable access.`)) {
                                keyCard.revokeMasterKey(key.id);
                                toast.success(`Master key revoked for ${key.guest_name}`);
                              }
                            }}
                            className="text-[10px] text-red-400 font-body font-semibold hover:underline px-2 py-1"
                          >
                            Revoke
                          </button>
                        </div>
                      ))}
                    </div>
                    {revokedKeys.length > 0 && (
                      <details className="group">
                        <summary className="text-[11px] text-steel/60 font-body cursor-pointer hover:text-steel transition-colors">
                          {revokedKeys.length} revoked key{revokedKeys.length > 1 ? 's' : ''} — click to view
                        </summary>
                        <div className="space-y-1.5 mt-2">
                          {revokedKeys.map(key => (
                            <div key={key.id} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.04] rounded-lg px-4 py-2 opacity-50">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <Shield size={12} className="text-steel" />
                                  <span className="text-xs font-body text-steel line-through">{key.guest_name}</span>
                                  <span className="inline-flex px-1.5 py-0.5 rounded bg-red-400/10 text-[9px] font-semibold text-red-400 font-body">REVOKED</span>
                                </div>
                                <p className="text-[10px] text-steel/60 font-body pl-[20px]">
                                  Revoked {key.revoked_at ? format(new Date(key.revoked_at), 'dd MMM yyyy HH:mm') : '—'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Master Key Encoding Modal */}
          <KeyCardModal
            open={showMasterKeyModal}
            onClose={() => {
              setShowMasterKeyModal(false);
              keyCard.resetEncoding();
            }}
            encodingProgress={keyCard.encodingProgress}
            encodedCards={masterKeyCards}
            guestName={masterKeyStaffName}
            roomNumber="ALL"
            cardType={keyCard.config.default_card_type}
            numCards={1}
            providerName={keyCard.providers.find(p => p.id === keyCard.config.provider)?.name ?? 'Key System'}
            isMasterKey
            autoStart={false}
            onEncode={async () => {
              try {
                const cards = await keyCard.encodeMasterKey(masterKeyStaffName, {
                  validDays: masterKeyValidDays,
                });
                setMasterKeyCards(cards);
              } catch { /* shown in modal */ }
            }}
            onDone={() => {
              setShowMasterKeyModal(false);
              keyCard.resetEncoding();
              setMasterKeyStaffName('');
              toast.success('Master key encoded successfully');
            }}
          />
        </div>
      )}

      {/* ============================== */}
      {/* Taxes Tab                      */}
      {/* ============================== */}
      {activeTab === 'taxes' && (
        <div className="space-y-6">
          <Card variant="dark">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Receipt size={18} className="text-teal" /> Tax Rules
              </CardTitle>
              <button
                onClick={() => setShowAddTax(!showAddTax)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body font-medium bg-teal/10 text-teal border border-teal/20 hover:bg-teal/20 transition-all"
              >
                <Plus size={14} /> Add Tax Rule
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-steel font-body">
                Configure taxes applied to guest charges. Inclusive taxes are already included in the displayed price; exclusive taxes are added on top.
              </p>

              {/* Add tax form */}
              {showAddTax && (
                <div className="card-dark space-y-3 border border-teal/20">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label variant="dark">Tax Name</Label>
                      <Input
                        variant="dark"
                        placeholder="e.g. VAT, Tourism Tax"
                        value={newTax.name}
                        onChange={(e) => setNewTax({ ...newTax, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label variant="dark">Rate (%)</Label>
                      <Input
                        variant="dark"
                        type="number"
                        step="0.01"
                        placeholder="e.g. 20"
                        value={newTax.rate}
                        onChange={(e) => setNewTax({ ...newTax, rate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label variant="dark">Applies To</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {(['room', 'food', 'beverage', 'spa', 'minibar', 'laundry', 'telephone', 'parking', 'other'] as FolioChargeCategory[]).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            const has = newTax.applies_to.includes(cat);
                            setNewTax({
                              ...newTax,
                              applies_to: has
                                ? newTax.applies_to.filter((c) => c !== cat)
                                : [...newTax.applies_to, cat],
                            });
                          }}
                          className={cn(
                            'text-[11px] font-body px-2.5 py-1 rounded-lg border transition-all capitalize',
                            newTax.applies_to.includes(cat)
                              ? 'bg-teal/15 text-teal border-teal/30'
                              : 'bg-white/[0.03] text-steel border-white/[0.06] hover:border-white/[0.12]',
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-silver font-body cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newTax.is_inclusive}
                        onChange={(e) => setNewTax({ ...newTax, is_inclusive: e.target.checked })}
                        className="rounded border-white/20 bg-white/5"
                      />
                      Tax inclusive (already included in price)
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!newTax.name || !newTax.rate) return;
                        const rule: TaxRule = {
                          id: `tax-${Date.now()}`,
                          property_id: 'p1',
                          name: newTax.name,
                          rate: Number(newTax.rate),
                          applies_to: newTax.applies_to,
                          is_inclusive: newTax.is_inclusive,
                          is_active: true,
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                        };
                        setTaxRules([...taxRules, rule]);
                        setNewTax({ name: '', rate: '', applies_to: ['room'], is_inclusive: false });
                        setShowAddTax(false);
                        toast.success('Tax rule added');
                      }}
                    >
                      <Check size={14} className="mr-1" /> Save
                    </Button>
                    <Button variant="outline-dark" size="sm" onClick={() => setShowAddTax(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Tax rules list */}
              <div className="space-y-2">
                {taxRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={cn(
                      'card-dark flex items-center justify-between',
                      !rule.is_active && 'opacity-50',
                    )}
                  >
                    <div>
                      <p className="text-sm font-body font-medium text-white">{rule.name}</p>
                      <p className="text-xs text-steel font-body">
                        {rule.rate}% — {rule.is_inclusive ? 'Inclusive' : 'Exclusive'} — Applies to:{' '}
                        {rule.applies_to.join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setTaxRules(taxRules.map((r) =>
                            r.id === rule.id ? { ...r, is_active: !r.is_active } : r,
                          ));
                          toast.success(rule.is_active ? 'Tax rule disabled' : 'Tax rule enabled');
                        }}
                        className={cn(
                          'text-[10px] font-body font-semibold px-2 py-1 rounded-full border',
                          rule.is_active
                            ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                            : 'text-steel bg-white/[0.03] border-white/[0.06]',
                        )}
                      >
                        {rule.is_active ? 'Active' : 'Disabled'}
                      </button>
                      <button
                        onClick={() => {
                          setTaxRules(taxRules.filter((r) => r.id !== rule.id));
                          toast.success('Tax rule removed');
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-steel hover:text-red-400 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {taxRules.length === 0 && (
                  <p className="text-sm text-steel font-body text-center py-4">
                    No tax rules configured. Charges will be posted without tax.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================== */}
      {/* Policies Tab                   */}
      {/* ============================== */}
      {activeTab === 'policies' && (
        <div className="space-y-6">
          <Card variant="dark">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Ban size={18} className="text-amber-400" /> Cancellation Policies
              </CardTitle>
              <button
                onClick={() => setShowAddPolicy(!showAddPolicy)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body font-medium bg-teal/10 text-teal border border-teal/20 hover:bg-teal/20 transition-all"
              >
                <Plus size={14} /> Add Policy
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-steel font-body">
                Define cancellation and no-show penalty policies. The default policy is automatically applied to new bookings.
              </p>

              {/* Add / Edit policy form */}
              {showAddPolicy && (
                <div className="card-dark space-y-3 border border-teal/20">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label variant="dark">Policy Name</Label>
                      <Input variant="dark" placeholder="e.g. Flexible, Strict" />
                    </div>
                    <div>
                      <Label variant="dark">Type</Label>
                      <select className="input-dark w-full text-sm py-2 px-3 rounded-xl bg-charcoal border border-white/[0.06]">
                        <option value="free">Free Cancellation</option>
                        <option value="moderate">Moderate</option>
                        <option value="strict">Strict</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label variant="dark">Free Cancel (hours before check-in)</Label>
                      <Input variant="dark" type="number" placeholder="48" />
                    </div>
                    <div>
                      <Label variant="dark">Penalty Type</Label>
                      <select className="input-dark w-full text-sm py-2 px-3 rounded-xl bg-charcoal border border-white/[0.06]">
                        <option value="fixed">Fixed Amount</option>
                        <option value="percentage">Percentage</option>
                        <option value="first_night">First Night</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label variant="dark">No-Show Penalty</Label>
                      <select className="input-dark w-full text-sm py-2 px-3 rounded-xl bg-charcoal border border-white/[0.06]">
                        <option value="full_stay">Full Stay</option>
                        <option value="first_night">First Night</option>
                        <option value="percentage">Percentage</option>
                        <option value="fixed">Fixed Amount</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { setShowAddPolicy(false); toast.success('Policy saved'); }}>
                      <Check size={14} className="mr-1" /> Save
                    </Button>
                    <Button variant="outline-dark" size="sm" onClick={() => setShowAddPolicy(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Policies list */}
              <div className="space-y-2">
                {policies.map((policy) => {
                  const penaltyLabels: Record<string, string> = {
                    fixed: 'Fixed Amount',
                    percentage: 'Percentage',
                    first_night: 'First Night',
                    full_stay: 'Full Stay',
                  };
                  const typeColors: Record<CancellationPolicyType, string> = {
                    free: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
                    moderate: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
                    strict: 'text-red-400 bg-red-400/10 border-red-400/20',
                    custom: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
                  };

                  return (
                    <div key={policy.id} className="card-dark">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-body font-medium text-white">{policy.name}</p>
                          <span
                            className={cn(
                              'text-[10px] font-body font-semibold px-2 py-0.5 rounded-full border capitalize',
                              typeColors[policy.type],
                            )}
                          >
                            {policy.type}
                          </span>
                          {policy.is_default && (
                            <span className="text-[10px] font-body font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!policy.is_default && (
                            <button
                              onClick={() => {
                                setPolicies(policies.map((p) => ({ ...p, is_default: p.id === policy.id })));
                                toast.success(`${policy.name} set as default`);
                              }}
                              className="text-[10px] font-body text-steel hover:text-gold transition-colors"
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setPolicies(policies.filter((p) => p.id !== policy.id));
                              toast.success('Policy removed');
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-steel hover:text-red-400 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-steel font-body">
                        <p>
                          Free cancellation:{' '}
                          <span className="text-silver">
                            {policy.free_cancellation_hours > 0
                              ? `${policy.free_cancellation_hours}h before check-in`
                              : 'None'}
                          </span>
                        </p>
                        <p>
                          Cancel penalty:{' '}
                          <span className="text-silver">
                            {penaltyLabels[policy.penalty_type] ?? policy.penalty_type}
                            {policy.penalty_amount > 0 ? ` (${policy.penalty_amount}${policy.penalty_type === 'percentage' ? '%' : ''})` : ''}
                          </span>
                        </p>
                        <p>
                          No-show penalty:{' '}
                          <span className="text-silver">
                            {penaltyLabels[policy.no_show_penalty_type] ?? policy.no_show_penalty_type}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })}
                {policies.length === 0 && (
                  <p className="text-sm text-steel font-body text-center py-4">
                    No cancellation policies configured.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Deposit Settings */}
          <Card variant="dark">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CreditCard size={18} className="text-gold" /> Deposit Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label variant="dark">Default Deposit (%)</Label>
                  <Input variant="dark" type="number" defaultValue="50" min="0" max="100" />
                  <p className="text-[10px] text-steel font-body mt-1">
                    Percentage of total booking amount required as deposit
                  </p>
                </div>
                <div>
                  <Label variant="dark">Deposit Due</Label>
                  <select className="input-dark w-full text-sm py-2 px-3 rounded-xl bg-charcoal border border-white/[0.06]">
                    <option value="booking">At time of booking</option>
                    <option value="24h">24 hours before check-in</option>
                    <option value="48h">48 hours before check-in</option>
                    <option value="7d">7 days before check-in</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => toast.success('Deposit settings saved')}>
                  <Save size={14} className="mr-1" /> Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================== */}
      {/* GDPR & Privacy Tab             */}
      {/* ============================== */}
      {activeTab === 'gdpr' && (
        <div className="space-y-6">
          <Card variant="dark">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-teal" /> Data Protection & GDPR Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-xs text-steel font-body leading-relaxed">
                Configure how guest personal data is collected, stored, and managed in compliance with GDPR, UK DPA 2018, and other data protection regulations.
              </p>

              {/* Consent */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div>
                  <p className="text-sm text-white font-body font-medium">Require Guest Consent at Booking</p>
                  <p className="text-xs text-steel font-body mt-0.5">Guests must explicitly consent to data processing during reservation</p>
                </div>
                <button
                  onClick={() => setGdprSettings({ ...gdprSettings, consent_required: !gdprSettings.consent_required })}
                  className={cn('relative w-11 h-6 rounded-full transition-colors', gdprSettings.consent_required ? 'bg-teal' : 'bg-white/[0.1]')}
                >
                  <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow', gdprSettings.consent_required ? 'translate-x-[22px]' : 'translate-x-0.5')} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div>
                  <p className="text-sm text-white font-body font-medium">Marketing Opt-in (default)</p>
                  <p className="text-xs text-steel font-body mt-0.5">Pre-check marketing opt-in for new guests (not recommended under GDPR)</p>
                </div>
                <button
                  onClick={() => setGdprSettings({ ...gdprSettings, marketing_opt_in: !gdprSettings.marketing_opt_in })}
                  className={cn('relative w-11 h-6 rounded-full transition-colors', gdprSettings.marketing_opt_in ? 'bg-teal' : 'bg-white/[0.1]')}
                >
                  <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow', gdprSettings.marketing_opt_in ? 'translate-x-[22px]' : 'translate-x-0.5')} />
                </button>
              </div>

              <Separator variant="dark" />

              {/* Data Retention */}
              <h4 className="text-sm font-body font-semibold text-white flex items-center gap-2">
                <Clock size={14} className="text-teal" /> Data Retention
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label variant="dark">Guest Data Retention Period</Label>
                  <select
                    value={gdprSettings.data_retention_months}
                    onChange={e => setGdprSettings({ ...gdprSettings, data_retention_months: parseInt(e.target.value) })}
                    className="input-dark w-full text-sm py-2 px-3 rounded-xl bg-charcoal border border-white/[0.06]"
                  >
                    <option value="6">6 months</option>
                    <option value="12">12 months</option>
                    <option value="24">24 months</option>
                    <option value="36">36 months</option>
                    <option value="60">5 years</option>
                    <option value="84">7 years (tax compliance)</option>
                  </select>
                  <p className="text-[11px] text-steel/60 font-body mt-1">
                    Guest PII is anonymised after this period
                  </p>
                </div>
                <div className="flex items-center">
                  <div className="flex items-center justify-between w-full p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div>
                      <p className="text-sm text-white font-body font-medium">Auto-purge Expired Data</p>
                      <p className="text-xs text-steel font-body mt-0.5">Automatically anonymise after retention period</p>
                    </div>
                    <button
                      onClick={() => setGdprSettings({ ...gdprSettings, auto_purge_enabled: !gdprSettings.auto_purge_enabled })}
                      className={cn('relative w-11 h-6 rounded-full transition-colors', gdprSettings.auto_purge_enabled ? 'bg-teal' : 'bg-white/[0.1]')}
                    >
                      <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow', gdprSettings.auto_purge_enabled ? 'translate-x-[22px]' : 'translate-x-0.5')} />
                    </button>
                  </div>
                </div>
              </div>

              <Separator variant="dark" />

              {/* Right to Erasure & Data Export */}
              <h4 className="text-sm font-body font-semibold text-white flex items-center gap-2">
                <UserX size={14} className="text-amber-400" /> Right to Erasure & Data Portability
              </h4>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div>
                  <p className="text-sm text-white font-body font-medium">Enable Right to Erasure</p>
                  <p className="text-xs text-steel font-body mt-0.5">Allow guest data deletion requests from the Guest Profile page</p>
                </div>
                <button
                  onClick={() => setGdprSettings({ ...gdprSettings, right_to_erasure_enabled: !gdprSettings.right_to_erasure_enabled })}
                  className={cn('relative w-11 h-6 rounded-full transition-colors', gdprSettings.right_to_erasure_enabled ? 'bg-teal' : 'bg-white/[0.1]')}
                >
                  <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow', gdprSettings.right_to_erasure_enabled ? 'translate-x-[22px]' : 'translate-x-0.5')} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label variant="dark">Data Export Format</Label>
                  <select
                    value={gdprSettings.data_export_format}
                    onChange={e => setGdprSettings({ ...gdprSettings, data_export_format: e.target.value as 'json' | 'csv' })}
                    className="input-dark w-full text-sm py-2 px-3 rounded-xl bg-charcoal border border-white/[0.06]"
                  >
                    <option value="json">JSON (machine-readable)</option>
                    <option value="csv">CSV (spreadsheet-friendly)</option>
                  </select>
                </div>
                <div>
                  <Label variant="dark">Data Protection Officer Email</Label>
                  <Input variant="dark" value={gdprSettings.dpo_email} onChange={e => setGdprSettings({ ...gdprSettings, dpo_email: e.target.value })} />
                </div>
              </div>

              <Separator variant="dark" />

              {/* Quick Actions */}
              <h4 className="text-sm font-body font-semibold text-white flex items-center gap-2">
                <AlertCircle size={14} className="text-gold" /> Quick Actions
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => toast.success('Data audit report generated — check Downloads')}
                  className="flex items-center gap-2 p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] text-sm text-silver font-body transition-all text-left"
                >
                  <FileDown size={16} className="text-teal" />
                  <div>
                    <p className="font-medium text-white text-xs">Generate Data Audit Report</p>
                    <p className="text-[11px] text-steel">List all stored personal data</p>
                  </div>
                </button>
                <button
                  onClick={() => toast.success('Consent log exported')}
                  className="flex items-center gap-2 p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] text-sm text-silver font-body transition-all text-left"
                >
                  <Download size={16} className="text-teal" />
                  <div>
                    <p className="font-medium text-white text-xs">Export Consent Log</p>
                    <p className="text-[11px] text-steel">Download all guest consent records</p>
                  </div>
                </button>
              </div>

              <div>
                <Label variant="dark">Privacy Policy URL</Label>
                <Input variant="dark" value={gdprSettings.privacy_policy_url} onChange={e => setGdprSettings({ ...gdprSettings, privacy_policy_url: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => toast.success('GDPR settings saved')}><Save size={16} className="mr-2" />Save Privacy Settings</Button>
          </div>
        </div>
      )}

      {/* ============================== */}
      {/* Branding Tab                   */}
      {/* ============================== */}
      {activeTab === 'branding' && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card variant="dark">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Palette size={18} className="text-teal" /> Brand Colours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label variant="dark">Primary Colour</Label>
                  <div className="flex gap-2">
                    <Input variant="dark" type="color" className="w-12 h-10 p-1" {...register('primary_color')} />
                    <Input variant="dark" {...register('primary_color')} className="flex-1" />
                  </div>
                </div>
                <div>
                  <Label variant="dark">Accent Colour</Label>
                  <div className="flex gap-2">
                    <Input variant="dark" type="color" className="w-12 h-10 p-1" {...register('accent_color')} />
                    <Input variant="dark" {...register('accent_color')} className="flex-1" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit"><Save size={16} className="mr-2" />Save Branding</Button>
          </div>
        </form>
      )}
    </div>
  );
}
