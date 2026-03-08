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

export interface CityLedgerInvoice {
  id: string;
  property_id: string;
  account_id: string;
  invoice_number: string;
  booking_id: string | null;
  booking_confirmation: string;
  guest_name: string;
  description: string;
  amount: number;
  date_posted: string;
  due_date: string;
  status: 'outstanding' | 'partially_paid' | 'paid' | 'overdue' | 'written_off';
  amount_paid: number;
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

const demoInvoices: CityLedgerInvoice[] = [
  {
    id: 'inv-1', property_id: 'demo-property-id', account_id: 'cl-1',
    invoice_number: 'INV-2026-0081', booking_id: null,
    booking_confirmation: 'ARR-2026-041', guest_name: 'Oliver Bennett',
    description: '3-night stay — Executive Suite, room charges + F&B',
    amount: 1890, date_posted: '2026-02-18T00:00:00Z', due_date: '2026-03-20T00:00:00Z',
    status: 'outstanding', amount_paid: 0, created_at: '2026-02-18T00:00:00Z',
  },
  {
    id: 'inv-2', property_id: 'demo-property-id', account_id: 'cl-1',
    invoice_number: 'INV-2026-0072', booking_id: null,
    booking_confirmation: 'ARR-2026-033', guest_name: 'Emma Whitfield',
    description: '2-night stay — Deluxe Double, room only',
    amount: 780, date_posted: '2026-02-05T00:00:00Z', due_date: '2026-03-07T00:00:00Z',
    status: 'paid', amount_paid: 780, created_at: '2026-02-05T00:00:00Z',
  },
  {
    id: 'inv-3', property_id: 'demo-property-id', account_id: 'cl-1',
    invoice_number: 'INV-2026-0063', booking_id: null,
    booking_confirmation: 'ARR-2026-028', guest_name: 'James Grant',
    description: '5-night stay — Penthouse, full billing',
    amount: 4250, date_posted: '2026-01-20T00:00:00Z', due_date: '2026-02-19T00:00:00Z',
    status: 'overdue', amount_paid: 0, created_at: '2026-01-20T00:00:00Z',
  },
  {
    id: 'inv-4', property_id: 'demo-property-id', account_id: 'cl-2',
    invoice_number: 'INV-2026-0079', booking_id: null,
    booking_confirmation: 'ARR-2026-039', guest_name: 'Sophie Chen',
    description: '4-night group booking (3 rooms) — Standard rooms',
    amount: 2340, date_posted: '2026-02-14T00:00:00Z', due_date: '2026-02-28T00:00:00Z',
    status: 'overdue', amount_paid: 0, created_at: '2026-02-14T00:00:00Z',
  },
  {
    id: 'inv-5', property_id: 'demo-property-id', account_id: 'cl-2',
    invoice_number: 'INV-2026-0068', booking_id: null,
    booking_confirmation: 'ARR-2026-031', guest_name: 'Mark Williams',
    description: '1-night stay — Superior Twin, room + parking',
    amount: 420, date_posted: '2026-01-28T00:00:00Z', due_date: '2026-02-11T00:00:00Z',
    status: 'paid', amount_paid: 420, created_at: '2026-01-28T00:00:00Z',
  },
  {
    id: 'inv-6', property_id: 'demo-property-id', account_id: 'cl-3',
    invoice_number: 'INV-2026-0085', booking_id: null,
    booking_confirmation: 'ARR-2026-044', guest_name: 'Sir James Sterling',
    description: '7-night extended stay — Presidential Suite, all inclusive',
    amount: 8750, date_posted: '2026-02-24T00:00:00Z', due_date: '2026-04-10T00:00:00Z',
    status: 'outstanding', amount_paid: 0, created_at: '2026-02-24T00:00:00Z',
  },
  {
    id: 'inv-7', property_id: 'demo-property-id', account_id: 'cl-3',
    invoice_number: 'INV-2026-0055', booking_id: null,
    booking_confirmation: 'ARR-2026-022', guest_name: 'Victoria Palmer',
    description: '2-night stay — Junior Suite, room + spa',
    amount: 1560, date_posted: '2026-01-10T00:00:00Z', due_date: '2026-02-24T00:00:00Z',
    status: 'partially_paid', amount_paid: 1000, created_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 'inv-8', property_id: 'demo-property-id', account_id: 'cl-4',
    invoice_number: 'INV-2025-0047', booking_id: null,
    booking_confirmation: 'ARR-2025-198', guest_name: 'Tom Harris',
    description: '3-night conference stay — 2 rooms + meeting room',
    amount: 3200, date_posted: '2025-11-15T00:00:00Z', due_date: '2025-12-15T00:00:00Z',
    status: 'overdue', amount_paid: 0, created_at: '2025-11-15T00:00:00Z',
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
      console.log('[Arrivé CL] Fetching city ledger accounts for property:', propertyId);
      const { data, error } = await supabase
        .from('city_ledger_accounts')
        .select('*')
        .eq('property_id', propertyId)
        .order('company_name');
      if (error) { console.error('[Arrivé CL] Fetch error:', error); throw error; }
      console.log('[Arrivé CL] Fetched', data?.length ?? 0, 'accounts');
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
      if (!propertyId) { throw new Error('Property not loaded — please try again'); }
      console.log('[Arrivé CL] Creating account:', input.company_name, 'for property:', propertyId);
      const { data, error } = await supabase
        .from('city_ledger_accounts')
        .insert({ ...input, property_id: propertyId })
        .select()
        .single();
      if (error) { console.error('[Arrivé CL] Insert error:', error); throw error; }
      console.log('[Arrivé CL] Account created:', data.id, data.company_name);
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

  // ---- Fetch invoices ----
  const invoicesQuery = useQuery({
    queryKey: ['city-ledger-invoices', propertyId],
    queryFn: async () => {
      if (isDemoMode) return demoInvoices;
      if (!propertyId) return [];
      console.log('[Arrivé CL] Fetching invoices for property:', propertyId);
      const { data, error } = await supabase
        .from('city_ledger_invoices')
        .select('*')
        .eq('property_id', propertyId)
        .order('date_posted', { ascending: false });
      if (error) { console.error('[Arrivé CL] Invoice fetch error:', error); throw error; }
      console.log('[Arrivé CL] Fetched', data?.length ?? 0, 'invoices');
      return (data ?? []) as CityLedgerInvoice[];
    },
    enabled: !!propertyId || isDemoMode,
    staleTime: 30_000,
  });

  const invoices = invoicesQuery.data ?? [];

  // ---- Create invoice ----
  const createInvoice = useMutation({
    mutationFn: async (input: Omit<CityLedgerInvoice, 'id' | 'property_id' | 'created_at'>) => {
      if (isDemoMode) {
        const entry: CityLedgerInvoice = {
          ...input,
          id: `inv-${Date.now()}`,
          property_id: 'demo-property-id',
          created_at: new Date().toISOString(),
        };
        qc.setQueryData<CityLedgerInvoice[]>(
          ['city-ledger-invoices', 'demo-property-id'],
          (old) => [entry, ...(old ?? [])],
        );
        return entry;
      }
      if (!propertyId) throw new Error('Property not loaded — please try again');
      console.log('[Arrivé CL] Creating invoice:', input.invoice_number);
      const { data, error } = await supabase
        .from('city_ledger_invoices')
        .insert({ ...input, property_id: propertyId })
        .select()
        .single();
      if (error) { console.error('[Arrivé CL] Invoice insert error:', error); throw error; }
      console.log('[Arrivé CL] Invoice created:', data.id, data.invoice_number);
      return data as CityLedgerInvoice;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['city-ledger-invoices'] });
    },
    onError: (e: Error) => toast.error(`Failed to create invoice: ${e.message}`),
  });

  // ---- Update invoice (payments, status changes) ----
  const updateInvoice = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<CityLedgerInvoice> & { id: string }) => {
      if (isDemoMode) {
        qc.setQueryData<CityLedgerInvoice[]>(
          ['city-ledger-invoices', 'demo-property-id'],
          (old) => (old ?? []).map(inv => inv.id === id ? { ...inv, ...rest } : inv),
        );
        return;
      }
      const { error } = await supabase
        .from('city_ledger_invoices')
        .update(rest)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['city-ledger-invoices'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    accounts,
    invoices,
    isLoading: accountsQuery.isLoading,
    isLoadingInvoices: invoicesQuery.isLoading,
    createAccount,
    updateAccount,
    deleteAccount,
    createInvoice,
    updateInvoice,
  };
}
