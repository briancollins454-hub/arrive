import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isDemoMode } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { hasPermission, ROUTE_PERMISSIONS, getRoleLabel, getRoleColor, ROLE_DEFINITIONS } from '@/lib/roles';
import type { Permission } from '@/lib/roles';
import type { StaffRole } from '@/types';

/**
 * Authentication + RBAC hook
 * Manages Supabase auth state and role-based permission checks.
 * In demo mode, provides mock auth with switchable roles.
 */
export function useAuth() {
  const { user, isAuthenticated, currentRole, permissionOverrides, setUser, setStaff, setProperty, setCurrentRole, setPermissionOverrides, logout } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isDemoMode) {
      // Demo mode: auto-login with mock user
      setUser({ id: 'demo-user-id', email: 'demo@arrive.hotel' });
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? '' });
        loadStaffAndProperty(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email ?? '' });
          loadStaffAndProperty(session.user.id);
        } else {
          logout();
        }
      }
    );

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadStaffAndProperty(userId: string) {
    if (isDemoMode) return;

    const { data: staff } = await supabase
      .from('staff_members')
      .select('*')
      .eq('id', userId)
      .single();

    if (staff) {
      setStaff(staff);
      setCurrentRole(staff.role as StaffRole);

      const { data: property } = await supabase
        .from('properties')
        .select('*')
        .eq('id', staff.property_id)
        .single();

      if (property) {
        setProperty(property);
      }
    } else {
      // No staff_members row — check if user has a pending invite to accept
      const { data: authUser } = await supabase.auth.getUser();
      const inviteToken = authUser?.user?.user_metadata?.invite_token;
      if (inviteToken) {
        const { data: result } = await supabase.rpc('accept_invite', {
          invite_token: inviteToken,
          new_user_id: userId,
        });
        if (result?.success) {
          // Retry loading staff after accepting
          await loadStaffAndProperty(userId);
        }
      }
    }
  }

  async function signIn(email: string, password: string) {
    if (isDemoMode) {
      setUser({ id: 'demo-user-id', email });
      navigate('/dashboard');
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      navigate('/dashboard');
    }
    return { error };
  }

  async function signOut() {
    if (!isDemoMode) {
      await supabase.auth.signOut();
    }
    logout();
    navigate('/login');
  }

  // --------------------------------------------------
  // RBAC permission checks (respects per-user overrides)
  // --------------------------------------------------

  /** Check if the current role + overrides has a specific permission */
  const can = useCallback((permission: Permission): boolean => {
    if (permissionOverrides.revoked.includes(permission)) return false;
    if (permissionOverrides.granted.includes(permission)) return true;
    return hasPermission(currentRole, permission);
  }, [currentRole, permissionOverrides]);

  /** Check if the current role + overrides has ANY of the given permissions */
  const canAny = useCallback((permissions: Permission[]): boolean => {
    return permissions.some(p => {
      if (permissionOverrides.revoked.includes(p)) return false;
      if (permissionOverrides.granted.includes(p)) return true;
      return hasPermission(currentRole, p);
    });
  }, [currentRole, permissionOverrides]);

  /** Check if the current role can access a given route path */
  const canAccessRoute = useCallback((routePath: string): boolean => {
    const perm = ROUTE_PERMISSIONS[routePath];
    if (!perm) return true; // no restriction
    if (permissionOverrides.revoked.includes(perm)) return false;
    if (permissionOverrides.granted.includes(perm)) return true;
    return hasPermission(currentRole, perm);
  }, [currentRole, permissionOverrides]);

  /** Switch role — primarily for demo mode role testing */
  const switchRole = useCallback((role: StaffRole) => {
    setCurrentRole(role);
  }, [setCurrentRole]);

  /** Apply custom permission overrides for the current user */
  const applyOverrides = useCallback((overrides: { granted: Permission[]; revoked: Permission[] }) => {
    setPermissionOverrides(overrides);
  }, [setPermissionOverrides]);

  return {
    user,
    isAuthenticated: isDemoMode ? true : isAuthenticated,
    signIn,
    signOut,
    isDemoMode,
    // RBAC
    currentRole,
    permissionOverrides,
    can,
    canAny,
    canAccessRoute,
    switchRole,
    applyOverrides,
    roleLabel: getRoleLabel(currentRole),
    roleColor: getRoleColor(currentRole),
    roleDefinitions: ROLE_DEFINITIONS,
  };
}
