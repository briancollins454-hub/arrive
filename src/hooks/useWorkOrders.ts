import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isDemoMode } from '@/lib/supabase';
import { useProperty } from './useProperty';
import type { WorkOrder } from '@/types';
import toast from 'react-hot-toast';
import { subDays, subHours } from 'date-fns';

// ============================================================
// Demo Data
// ============================================================

const today = new Date();

const demoWorkOrders: WorkOrder[] = [
  {
    id: 'wo1',
    property_id: 'demo-property-id',
    room_id: 'r8',
    title: 'Bathroom renovation — shower re-tile',
    description: 'Complete re-tiling of the walk-in shower. Tiles cracked and grout deteriorating.',
    category: 'structural',
    priority: 'high',
    status: 'in_progress',
    reported_by: 'Sarah Collins',
    assigned_to: 'Mike Thompson',
    estimated_cost: 2400,
    actual_cost: null,
    completed_at: null,
    created_at: subDays(today, 5).toISOString(),
    updated_at: today.toISOString(),
  },
  {
    id: 'wo2',
    property_id: 'demo-property-id',
    room_id: 'r4',
    title: 'TV remote not working',
    description: 'Guest reported TV remote is unresponsive. Batteries replaced but still faulty.',
    category: 'appliance',
    priority: 'medium',
    status: 'open',
    reported_by: 'Front Desk',
    assigned_to: null,
    estimated_cost: 25,
    actual_cost: null,
    completed_at: null,
    created_at: subHours(today, 3).toISOString(),
    updated_at: subHours(today, 3).toISOString(),
  },
  {
    id: 'wo3',
    property_id: 'demo-property-id',
    room_id: 'r2',
    title: 'Dripping tap in bathroom',
    description: 'Slow drip from the bathroom basin tap. Washer likely needs replacing.',
    category: 'plumbing',
    priority: 'low',
    status: 'open',
    reported_by: 'Housekeeping',
    assigned_to: 'Mike Thompson',
    estimated_cost: 50,
    actual_cost: null,
    completed_at: null,
    created_at: subDays(today, 1).toISOString(),
    updated_at: subDays(today, 1).toISOString(),
  },
  {
    id: 'wo4',
    property_id: 'demo-property-id',
    room_id: 'r6',
    title: 'Air conditioning unit serviced',
    description: 'Annual AC unit service and filter change completed.',
    category: 'hvac',
    priority: 'medium',
    status: 'completed',
    reported_by: 'Sarah Collins',
    assigned_to: 'HVAC Specialists Ltd',
    estimated_cost: 180,
    actual_cost: 195,
    completed_at: subDays(today, 2).toISOString(),
    created_at: subDays(today, 7).toISOString(),
    updated_at: subDays(today, 2).toISOString(),
  },
  {
    id: 'wo5',
    property_id: 'demo-property-id',
    room_id: null,
    title: 'Lobby chandelier bulb replacement',
    description: 'Three bulbs in the lobby chandelier have blown. Need replacement — specialist height access required.',
    category: 'electrical',
    priority: 'high',
    status: 'open',
    reported_by: 'Front Desk',
    assigned_to: null,
    estimated_cost: 300,
    actual_cost: null,
    completed_at: null,
    created_at: subDays(today, 1).toISOString(),
    updated_at: subDays(today, 1).toISOString(),
  },
  {
    id: 'wo6',
    property_id: 'demo-property-id',
    room_id: 'r3',
    title: 'Desk chair broken leg',
    description: 'One leg of the desk chair in room 105 is cracked. Chair wobbles and is unsafe.',
    category: 'furniture',
    priority: 'urgent',
    status: 'in_progress',
    reported_by: 'Housekeeping',
    assigned_to: 'Mike Thompson',
    estimated_cost: 0,
    actual_cost: null,
    completed_at: null,
    created_at: subHours(today, 6).toISOString(),
    updated_at: subHours(today, 2).toISOString(),
  },
];

// ============================================================
// Hook
// ============================================================

export function useWorkOrders() {
  const { property } = useProperty();
  const propertyId = property?.id ?? 'demo-property-id';
  const queryClient = useQueryClient();

  const { data: workOrders, isLoading } = useQuery({
    queryKey: ['workOrders', propertyId],
    queryFn: async () => {
      if (isDemoMode) return demoWorkOrders;
      return [] as WorkOrder[];
    },
  });

  const createWorkOrder = useMutation({
    mutationFn: async (input: Omit<WorkOrder, 'id' | 'property_id' | 'created_at' | 'updated_at' | 'completed_at' | 'actual_cost'>) => {
      const newWo: WorkOrder = {
        ...input,
        id: `wo-${Date.now()}`,
        property_id: propertyId,
        actual_cost: null,
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (isDemoMode) {
        queryClient.setQueryData<WorkOrder[]>(['workOrders', propertyId], old => [...(old ?? []), newWo]);
      }
      return newWo;
    },
    onSuccess: () => toast.success('Work order created'),
  });

  const updateWorkOrder = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WorkOrder> & { id: string }) => {
      if (isDemoMode) {
        queryClient.setQueryData<WorkOrder[]>(['workOrders', propertyId], old =>
          (old ?? []).map(w => w.id === id ? { ...w, ...updates, updated_at: new Date().toISOString() } : w)
        );
      }
      return id;
    },
    onSuccess: () => toast.success('Work order updated'),
  });

  const deleteWorkOrder = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        queryClient.setQueryData<WorkOrder[]>(['workOrders', propertyId], old =>
          (old ?? []).filter(w => w.id !== id)
        );
      }
    },
    onSuccess: () => toast.success('Work order deleted'),
  });

  return { workOrders, isLoading, createWorkOrder, updateWorkOrder, deleteWorkOrder };
}
