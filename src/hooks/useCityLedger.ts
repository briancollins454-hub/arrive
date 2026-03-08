import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isDemoMode } from '@/lib/supabase';
import { useProperty } from './useProperty';
import toast from 'react-hot-toast';

// ============================================================
// Types
// ============================================================

export interface CityLedgerAccount {
  id: string;
  property_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  credit_limit: number;
  payment_terms: number;
  status: 'active' | 'suspended' | 'closed';
  notes: string;
  created_at: string;
}

// ============================================================
// Demo data
// ============================================================

const demoAccounts: CityLedgerAccount[] = [
  {
    id: 'cl-1', property_id: 'demo-property-id',
    company_name: 'Meridian Consulting Group', contact_name: 'Catherine Reynolds',
    email: 'accounts@meridianconsulting.co.uk', phone: '+44 20 7946 0123',
    address: '45 Canary Wharf, London E14 5AB', credit_limit: 25000,
    payment_terms: 30, status: 'active', created_at: '2024-01-15T00:00:00Z',
    notes: 'Preferred corporate client. Direct billing approved.',
  },
  {
    id: 'cl-2', property_id: 'demo-property-id',
    company_name: 'Apex Travel Solutions', contact_name: 'David Chen',
    email: 'billing@apextravel.com', phone: '+44 20 7946 0456',
    address: '12 Oxford Street, London W1D 1BS', credit_limit: 15000,
    payment_terms: 14, status: 'active', created_at: '2024-03-22T00:00:00Z',
    notes: 'Travel agency. Commission: 10%.',
  },
  {
    id: 'cl-3', property_id: 'demo-property-id',
    company_name: 'Sterling & Associates Law', contact_name: 'Sir James Sterling',
    email: 'pa@sterlinglaw.co.uk', phone: '+44 20 7946 0789',
    address: '1 Temple Gardens, London EC4Y 9AY', credit_limit: 50000,
    payment_terms: 45, status: 'active', created_at: '2023-11-01T00:00:00Z',
    notes: 'VIP corporate account. Always allocate premium rooms.',
  },
  {
    id: 'cl-4', property_id: 'demo-property-id',
    company_name: 'Nova Tech Industries', contact_name: 'Sarah Mitchell',
    email: 'finance@novatech.io', phone: '+44 121 496 0100',
    address: '88 Innovation Drive, Birmingham B1 2AA', credit_limit: 10000,
    payment_terms: 30, status: 'suspended', created_at: '2024-06-10T00:00:00Z',
    notes: 'Account suspended — 90-day overdue invoice #INV-2025-0047.',
  },
];

// ============================================================
// Hook
// ============================================================

export function useCityLedger() {
  const qc = useQueryClient();
  const { propertyId } = useProperty();

  // ---- Fetch accounts ----
  const accountsQuery = useQuery({
    queryKey: ['city-ledger-accounts', propertyId],
    queryFn: async () => {
      if (isDemoMode) return demoAccounts;
      if (!propertyId) return [];
      const { data, error } = await supabase
        .from('city_ledger_accounts')
        .select('*')
        .eq('property_id', propertyId)
        .order('company_name');
      if (error) throw error;
      return (data ?? []) as CityLedgerAccount[];
    },
    enabled: !!propertyId || isDemoMode,
    staleTime: 30_000,
  });

  // Also keep the legacy cache key populated for any consumers
  const accounts = accountsQuery.data ?? [];
  // Update legacy cache key used by BookingDetailPage etc.
  if (accounts.length > 0) {
    qc.setQueryData(['city-ledger-accounts'], accounts);
  }

  // ---- Create account ----
  const createAccount = useMutation({
    mutationFn: async (input: Omit<CityLedgerAccount, 'id' | 'property_id' | 'created_at'>) => {
      if (isDemoMode) {
        const entry: CityLedgerAccount = {
          ...input,
          id: `cl-${Date.now()}`,
          property_id: 'demo-property-id',
          created_at: new Date().toISOString(),
        };
        qc.setQueryData<CityLedgerAccount[]>(
          ['city-ledger-accounts', 'demo-property-id'],
          (old) => [...(old ?? []), entry],
        );
        return entry;
      }
      const { data, error } = await supabase
        .from('city_ledger_accounts')
        .insert({ ...input, property_id: propertyId })
        .select()
        .single();
      if (error) throw error;
      return data as CityLedgerAccount;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['city-ledger-accounts'] });
      toast.success('Company account created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ---- Update account ----
  const updateAccount = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<CityLedgerAccount> & { id: string }) => {
      if (isDemoMode) {
        qc.setQueryData<CityLedgerAccount[]>(
          ['city-ledger-accounts', 'demo-property-id'],
          (old) => (old ?? []).map(a => a.id === id ? { ...a, ...rest } : a),
        );
        return;
      }
      const { error } = await supabase
        .from('city_ledger_accounts')
        .update(rest)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['city-ledger-accounts'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ---- Delete account ----
  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        qc.setQueryData<CityLedgerAccount[]>(
          ['city-ledger-accounts', 'demo-property-id'],
          (old) => (old ?? []).filter(a => a.id !== id),
        );
        return;
      }
      const { error } = await supabase
        .from('city_ledger_accounts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['city-ledger-accounts'] });
      toast.success('Account deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    accounts,
    isLoading: accountsQuery.isLoading,
    createAccount,
    updateAccount,
    deleteAccount,
  };
}
