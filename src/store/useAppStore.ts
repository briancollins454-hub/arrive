import { create } from 'zustand';
import type { Property, StaffMember, StaffRole } from '@/types';
import type { Permission } from '@/lib/roles';

// ============================================================
// ARRIVÉ — Global App Store (Zustand)
// ============================================================

interface AppState {
  // Auth
  user: { id: string; email: string } | null;
  staff: StaffMember | null;
  property: Property | null;
  isAuthenticated: boolean;
  currentRole: StaffRole;
  /** Per-user permission overrides — keys granted beyond role default, or revoked from it */
  permissionOverrides: { granted: Permission[]; revoked: Permission[] };

  // UI
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  modalOpen: string | null; // modal identifier or null
  commandPaletteOpen: boolean;

  // Actions — Auth
  setUser: (user: { id: string; email: string } | null) => void;
  setStaff: (staff: StaffMember | null) => void;
  setProperty: (property: Property | null) => void;
  setCurrentRole: (role: StaffRole) => void;
  setPermissionOverrides: (overrides: { granted: Permission[]; revoked: Permission[] }) => void;
  logout: () => void;

  // Actions — UI
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  openModal: (id: string) => void;
  closeModal: () => void;
  toggleCommandPalette: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // --- Initial State ---
  user: null,
  staff: null,
  property: null,
  isAuthenticated: false,
  currentRole: 'owner',
  permissionOverrides: { granted: [], revoked: [] },

  sidebarOpen: true,
  sidebarCollapsed: false,
  modalOpen: null,
  commandPaletteOpen: false,

  // --- Auth Actions ---
  setUser: (user) =>
    set({ user, isAuthenticated: !!user }),

  setStaff: (staff) =>
    set({ staff }),

  setProperty: (property) =>
    set({ property }),

  setCurrentRole: (currentRole) =>
    set({ currentRole, permissionOverrides: { granted: [], revoked: [] } }),

  setPermissionOverrides: (permissionOverrides) =>
    set({ permissionOverrides }),

  logout: () =>
    set({
      user: null,
      staff: null,
      property: null,
      isAuthenticated: false,
      currentRole: 'owner',
      permissionOverrides: { granted: [], revoked: [] },
    }),

  // --- UI Actions ---
  toggleSidebar: () =>
    set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  setSidebarOpen: (open) =>
    set({ sidebarOpen: open }),

  toggleSidebarCollapsed: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  openModal: (id) =>
    set({ modalOpen: id }),

  closeModal: () =>
    set({ modalOpen: null }),

  toggleCommandPalette: () =>
    set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
}));
