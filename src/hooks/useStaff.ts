import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isDemoMode } from '@/lib/supabase';
import { useProperty } from './useProperty';
import type { StaffMember, StaffRole } from '@/types';
import toast from 'react-hot-toast';

// ============================================================
// Types
// ============================================================

export interface StaffInvite {
  id: string;
  property_id: string;
  email: string;
  name: string;
  role: StaffRole;
  token: string;
  invited_by: string | null;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  created_at: string;
  expires_at: string;
}

// ============================================================
// Demo data (fallback when Supabase is not configured)
// ============================================================

const demoStaff: StaffMember[] = [
  { id: 's1', property_id: 'demo', name: 'Alex Thompson', email: 'alex@arrive-hotel.com', role: 'owner', permissions: {}, is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 's2', property_id: 'demo', name: 'Rachel Davies', email: 'rachel@arrive-hotel.com', role: 'general_manager', permissions: {}, is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 's3', property_id: 'demo', name: 'Tom Parker', email: 'tom@arrive-hotel.com', role: 'front_office_manager', permissions: { 'rates.manage': true }, is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 's4', property_id: 'demo', name: 'Lucy Morgan', email: 'lucy@arrive-hotel.com', role: 'receptionist', permissions: {}, is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 's5', property_id: 'demo', name: 'Jake Evans', email: 'jake@arrive-hotel.com', role: 'housekeeping_manager', permissions: {}, is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01' },
];

// ============================================================
// Hook
// ============================================================

export function useStaff() {
  const { propertyId } = useProperty();
  const queryClient = useQueryClient();

  // ── Fetch staff members ────────────────────────────────────
  const staffQuery = useQuery({
    queryKey: ['staff', propertyId],
    queryFn: async (): Promise<StaffMember[]> => {
      if (isDemoMode) return demoStaff;
      const { data, error } = await supabase
        .from('staff_members')
        .select('*')
        .eq('property_id', propertyId!)
        .order('created_at');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!propertyId,
  });

  // ── Fetch pending invites ──────────────────────────────────
  const invitesQuery = useQuery({
    queryKey: ['staff-invites', propertyId],
    queryFn: async (): Promise<StaffInvite[]> => {
      if (isDemoMode) return [];
      const { data, error } = await supabase
        .from('staff_invites')
        .select('*')
        .eq('property_id', propertyId!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!propertyId,
  });

  // ── Send invite ────────────────────────────────────────────
  // Calls the `send-invite` edge function which creates the invite
  // server-side (service role) and emails a branded link via the
  // platform Resend account. Returns the invite link as a fallback.
  const sendInvite = useMutation({
    mutationFn: async (input: { name: string; email: string; role: StaffRole }) => {
      if (isDemoMode) {
        toast.success(`${input.name} invited (demo mode)`);
        return { invite_url: `${window.location.origin}/invite/demo-token`, email_sent: true };
      }

      const { data, error } = await supabase.functions.invoke('send-invite', {
        body: {
          property_id: propertyId!,
          name: input.name.trim(),
          email: input.email.trim(),
          role: input.role,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data as { invite_url: string; email_sent: boolean; email_error?: string };
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['staff-invites', propertyId] });
      if (data?.email_sent) {
        toast.success(`Invite emailed to ${vars.email}`);
      } else if (data) {
        toast.error(`Invite created, but email failed (${data.email_error ?? 'unknown'}). Share the link manually.`);
      }
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to send invite');
    },
  });

  // ── Resend invite ──────────────────────────────────────────
  // Regenerates the token + expiry and re-sends the invite email.
  const resendInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      if (isDemoMode) {
        toast.success('Invite resent (demo mode)');
        return { invite_url: '', email_sent: true };
      }
      const { data, error } = await supabase.functions.invoke('send-invite', {
        body: { invite_id: inviteId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data as { invite_url: string; email_sent: boolean; email_error?: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff-invites', propertyId] });
      if (data?.email_sent) {
        toast.success('Invite re-sent');
      } else if (data) {
        toast.error(`Could not re-send email (${data.email_error ?? 'unknown'}).`);
      }
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to resend invite');
    },
  });

  // ── Revoke invite ──────────────────────────────────────────
  const revokeInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      if (isDemoMode) return;
      const { error } = await supabase
        .from('staff_invites')
        .update({ status: 'revoked' })
        .eq('id', inviteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-invites', propertyId] });
      toast.success('Invite revoked');
    },
  });

  // ── Update staff member (role, active, permissions) ────────
  const updateStaff = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StaffMember> & { id: string }) => {
      if (isDemoMode) return;
      const { error } = await supabase
        .from('staff_members')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', propertyId] });
    },
  });

  // ── Deactivate staff member ────────────────────────────────
  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (isDemoMode) return;
      const { error } = await supabase
        .from('staff_members')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['staff', propertyId] });
      toast.success(vars.is_active ? 'User activated' : 'User deactivated');
    },
  });

  // ── Delete staff member ────────────────────────────────────
  const deleteStaff = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) return;
      const { error } = await supabase
        .from('staff_members')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', propertyId] });
      toast.success('User removed');
    },
  });

  // ── Change role ────────────────────────────────────────────
  const changeRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: StaffRole }) => {
      if (isDemoMode) return;
      const { error } = await supabase
        .from('staff_members')
        .update({ role, permissions: {} })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', propertyId] });
      toast.success('Role updated — custom permissions reset');
    },
  });

  return {
    // Queries
    staff: staffQuery.data ?? [],
    isLoadingStaff: staffQuery.isLoading,
    invites: invitesQuery.data ?? [],
    isLoadingInvites: invitesQuery.isLoading,

    // Mutations
    sendInvite,
    resendInvite,
    revokeInvite,
    updateStaff,
    toggleActive,
    deleteStaff,
    changeRole,
  };
}
