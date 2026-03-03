import { useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { hasPermission, ROUTE_PERMISSIONS, getRoleLabel, getRoleColor, ROLE_DEFINITIONS } from '@/lib/roles';
import type { Permission } from '@/lib/roles';
import type { StaffRole } from '@/types';

/**
 * Lightweight RBAC hook — permission checks without auth/navigation dependencies.
 * Respects per-user permission overrides (granted/revoked) on top of role defaults.
 * Use this in components that only need role-based gating (sidebar, guards, etc.).
 * For full auth (signIn/signOut), use `useAuth` instead.
 */
export function useRBAC() {
  const { currentRole, permissionOverrides, setCurrentRole, setPermissionOverrides } = useAppStore();

  /** Check if the current role + overrides has a specific permission */
  const can = useCallback((permission: Permission): boolean => {
    // Explicitly revoked overrides take priority
    if (permissionOverrides.revoked.includes(permission)) return false;
    // Explicitly granted overrides
    if (permissionOverrides.granted.includes(permission)) return true;
    // Fall back to role default
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
    if (!perm) return true; // no restriction defined
    if (permissionOverrides.revoked.includes(perm)) return false;
    if (permissionOverrides.granted.includes(perm)) return true;
    return hasPermission(currentRole, perm);
  }, [currentRole, permissionOverrides]);

  /** Switch the current role — for demo mode testing */
  const switchRole = useCallback((role: StaffRole) => {
    setCurrentRole(role);
  }, [setCurrentRole]);

  /** Apply custom permission overrides on top of the role */
  const applyOverrides = useCallback((overrides: { granted: Permission[]; revoked: Permission[] }) => {
    setPermissionOverrides(overrides);
  }, [setPermissionOverrides]);

  return {
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
