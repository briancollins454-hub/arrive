import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isDemoMode } from '@/lib/supabase';
import { useProperty } from './useProperty';
import type { Package } from '@/types';
import toast from 'react-hot-toast';

// ============================================================
// Demo Data
// ============================================================

const demoPackages: Package[] = [
  {
    id: 'pkg1',
    property_id: 'demo-property-id',
    name: 'Bed & Breakfast',
    description: 'Full cooked breakfast for each guest, served in our restaurant.',
    included_items: ['Full cooked breakfast', 'Continental options', 'Hot beverages'],
    price_per_night: 25,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pkg2',
    property_id: 'demo-property-id',
    name: 'Romance Package',
    description: 'Make your stay extra special with our curated romance additions.',
    included_items: ['Bottle of champagne on arrival', 'Box of chocolates', 'Late checkout (2pm)', 'Rose petal turndown'],
    price_per_night: 65,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pkg3',
    property_id: 'demo-property-id',
    name: 'Half Board',
    description: 'Breakfast and dinner included for each guest.',
    included_items: ['Full breakfast', 'Three-course dinner', 'Welcome drink'],
    price_per_night: 55,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pkg4',
    property_id: 'demo-property-id',
    name: 'Spa Escape',
    description: 'Relax and unwind with our spa package.',
    included_items: ['60-min spa treatment per guest', 'Access to thermal suite', 'Bathrobe & slippers'],
    price_per_night: 85,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pkg5',
    property_id: 'demo-property-id',
    name: 'Family Fun',
    description: 'Extras for families staying with young children.',
    included_items: ['Kids eat free (under 12)', 'Activity pack on arrival', 'Early check-in (1pm)', 'Cot/crib if needed'],
    price_per_night: 20,
    is_active: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ============================================================
// Hook
// ============================================================

export function usePackages() {
  const { property } = useProperty();
  const propertyId = property?.id ?? 'demo-property-id';
  const queryClient = useQueryClient();

  const { data: packages, isLoading } = useQuery({
    queryKey: ['packages', propertyId],
    queryFn: async () => {
      if (isDemoMode) return demoPackages;
      return [] as Package[];
    },
  });

  const createPackage = useMutation({
    mutationFn: async (input: Omit<Package, 'id' | 'property_id' | 'created_at' | 'updated_at'>) => {
      const newPkg: Package = {
        ...input,
        id: `pkg-${Date.now()}`,
        property_id: propertyId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (isDemoMode) {
        queryClient.setQueryData<Package[]>(['packages', propertyId], old => [...(old ?? []), newPkg]);
      }
      return newPkg;
    },
    onSuccess: () => toast.success('Package created'),
  });

  const updatePackage = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Package> & { id: string }) => {
      if (isDemoMode) {
        queryClient.setQueryData<Package[]>(['packages', propertyId], old =>
          (old ?? []).map(p => p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p)
        );
      }
      return id;
    },
    onSuccess: () => toast.success('Package updated'),
  });

  const deletePackage = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        queryClient.setQueryData<Package[]>(['packages', propertyId], old =>
          (old ?? []).filter(p => p.id !== id)
        );
      }
    },
    onSuccess: () => toast.success('Package deleted'),
  });

  return { packages, isLoading, createPackage, updatePackage, deletePackage };
}
