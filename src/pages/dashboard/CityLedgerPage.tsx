import { useState, useMemo } from 'react';
import {
  Building2, Search, Plus, ChevronDown, ChevronUp, CreditCard,
  Mail, Phone, FileText, Clock, AlertTriangle, Check, Trash2,
  TrendingUp, Receipt, Download, Landmark,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { exportCSV } from '@/lib/exportUtils';
import toast from 'react-hot-toast';

// ============================================================
// Types
// ============================================================

interface CityLedgerAccount {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  credit_limit: number;
  payment_terms: number; // days
  status: 'active' | 'suspended' | 'closed';
  created_at: string;
  notes: string;
}

interface CityLedgerInvoice {
  id: string;
  account_id: string;
  invoice_number: string;
  booking_confirmation: string;
  guest_name: string;
  description: string;
  amount: number;
  date_posted: string;
  due_date: string;
  status: 'outstanding' | 'partially_paid' | 'paid' | 'overdue' | 'written_off';
  amount_paid: number;
}

// ============================================================
// Demo Data
// ============================================================

const demoAccounts: CityLedgerAccount[] = [
  {
    id: 'cl-1',
    company_name: 'Meridian Consulting Group',
    contact_name: 'Catherine Reynolds',
    email: 'accounts@meridianconsulting.co.uk',
    phone: '+44 20 7946 0123',
    address: '45 Canary Wharf, London E14 5AB',
    credit_limit: 25000,
    payment_terms: 30,
    status: 'active',
    created_at: '2024-01-15T00:00:00Z',
    notes: 'Preferred corporate client. Direct billing approved.',
  },
  {
    id: 'cl-2',
    company_name: 'Apex Travel Solutions',
    contact_name: 'David Chen',
    email: 'billing@apextravel.com',
    phone: '+44 20 7946 0456',
    address: '12 Oxford Street, London W1D 1BS',
    credit_limit: 15000,
    payment_terms: 14,
    status: 'active',
    created_at: '2024-03-22T00:00:00Z',
    notes: 'Travel agency. Commission: 10%.',
  },
  {
    id: 'cl-3',
    company_name: 'Sterling & Associates Law',
    contact_name: 'Sir James Sterling',
    email: 'pa@sterlinglaw.co.uk',
    phone: '+44 20 7946 0789',
    address: '1 Temple Gardens, London EC4Y 9AY',
    credit_limit: 50000,
    payment_terms: 45,
    status: 'active',
    created_at: '2023-11-01T00:00:00Z',
    notes: 'VIP corporate account. Always allocate premium rooms.',
  },
  {
    id: 'cl-4',
    company_name: 'Nova Tech Industries',
    contact_name: 'Sarah Mitchell',
    email: 'finance@novatech.io',
    phone: '+44 121 496 0100',
    address: '88 Innovation Drive, Birmingham B1 2AA',
    credit_limit: 10000,
    payment_terms: 30,
    status: 'suspended',
    created_at: '2024-06-10T00:00:00Z',
    notes: 'Account suspended — 90-day overdue invoice #INV-2025-0047.',
  },
];

const demoInvoices: CityLedgerInvoice[] = [
  // Meridian Consulting
  {
    id: 'inv-1', account_id: 'cl-1', invoice_number: 'INV-2026-0081',
    booking_confirmation: 'ARR-2026-041', guest_name: 'Oliver Bennett',
    description: '3-night stay — Executive Suite, room charges + F&B',
    amount: 1890, date_posted: '2026-02-18T00:00:00Z', due_date: '2026-03-20T00:00:00Z',
    status: 'outstanding', amount_paid: 0,
  },
  {
    id: 'inv-2', account_id: 'cl-1', invoice_number: 'INV-2026-0072',
    booking_confirmation: 'ARR-2026-033', guest_name: 'Emma Whitfield',
    description: '2-night stay — Deluxe Double, room only',
    amount: 780, date_posted: '2026-02-05T00:00:00Z', due_date: '2026-03-07T00:00:00Z',
    status: 'paid', amount_paid: 780,
  },
  {
    id: 'inv-3', account_id: 'cl-1', invoice_number: 'INV-2026-0063',
    booking_confirmation: 'ARR-2026-028', guest_name: 'James Grant',
    description: '5-night stay — Penthouse, full billing',
    amount: 4250, date_posted: '2026-01-20T00:00:00Z', due_date: '2026-02-19T00:00:00Z',
    status: 'overdue', amount_paid: 0,
  },
  // Apex Travel
  {
    id: 'inv-4', account_id: 'cl-2', invoice_number: 'INV-2026-0079',
    booking_confirmation: 'ARR-2026-039', guest_name: 'Sophie Chen',
    description: '4-night group booking (3 rooms) — Standard rooms',
    amount: 2340, date_posted: '2026-02-14T00:00:00Z', due_date: '2026-02-28T00:00:00Z',
    status: 'overdue', amount_paid: 0,
  },
  {
    id: 'inv-5', account_id: 'cl-2', invoice_number: 'INV-2026-0068',
    booking_confirmation: 'ARR-2026-031', guest_name: 'Mark Williams',
    description: '1-night stay — Superior Twin, room + parking',
    amount: 420, date_posted: '2026-01-28T00:00:00Z', due_date: '2026-02-11T00:00:00Z',
    status: 'paid', amount_paid: 420,
  },
  // Sterling & Associates
  {
    id: 'inv-6', account_id: 'cl-3', invoice_number: 'INV-2026-0085',
    booking_confirmation: 'ARR-2026-044', guest_name: 'Sir James Sterling',
    description: '7-night extended stay — Presidential Suite, all inclusive',
    amount: 8750, date_posted: '2026-02-24T00:00:00Z', due_date: '2026-04-10T00:00:00Z',
    status: 'outstanding', amount_paid: 0,
  },
  {
    id: 'inv-7', account_id: 'cl-3', invoice_number: 'INV-2026-0055',
    booking_confirmation: 'ARR-2026-022', guest_name: 'Victoria Palmer',
    description: '2-night stay — Junior Suite, room + spa',
    amount: 1560, date_posted: '2026-01-10T00:00:00Z', due_date: '2026-02-24T00:00:00Z',
    status: 'partially_paid', amount_paid: 1000,
  },
  // Nova Tech
  {
    id: 'inv-8', account_id: 'cl-4', invoice_number: 'INV-2025-0047',
    booking_confirmation: 'ARR-2025-198', guest_name: 'Tom Harris',
    description: '3-night conference stay — 2 rooms + meeting room',
    amount: 3200, date_posted: '2025-11-15T00:00:00Z', due_date: '2025-12-15T00:00:00Z',
    status: 'overdue', amount_paid: 0,
  },
];

// ============================================================
// Status helpers
// ============================================================

const accountStatusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  active: { label: 'Active', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  suspended: { label: 'Suspended', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  closed: { label: 'Closed', color: 'text-steel', bg: 'bg-steel/10', border: 'border-steel/20' },
};

const invoiceStatusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  outstanding: { label: 'Outstanding', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  partially_paid: { label: 'Partial', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  paid: { label: 'Paid', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  overdue: { label: 'Overdue', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  written_off: { label: 'Written Off', color: 'text-steel', bg: 'bg-steel/10', border: 'border-steel/20' },
};

// ============================================================
// Component
// ============================================================

export function CityLedgerPage() {
  const [accounts, setAccounts] = useState<CityLedgerAccount[]>(demoAccounts);
  const [invoices, setInvoices] = useState<CityLedgerInvoice[]>(demoInvoices);
  const [search, setSearch] = useState('');
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended' | 'closed'>('all');
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState<CityLedgerInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // New account form
  const [newAccount, setNewAccount] = useState({
    company_name: '', contact_name: '', email: '', phone: '', address: '',
    credit_limit: '', payment_terms: '30', notes: '',
  });

  // ── Derived ──
  const filteredAccounts = useMemo(() => {
    return accounts.filter(a => {
      if (filterStatus !== 'all' && a.status !== filterStatus) return false;
      if (search && !a.company_name.toLowerCase().includes(search.toLowerCase()) &&
          !a.contact_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [accounts, search, filterStatus]);

  const getAccountInvoices = (accountId: string) =>
    invoices.filter(inv => inv.account_id === accountId);

  const getAccountBalance = (accountId: string) => {
    const acctInvoices = getAccountInvoices(accountId);
    return acctInvoices.reduce((sum, inv) => sum + (inv.amount - inv.amount_paid), 0);
  };

  const getAccountOverdue = (accountId: string) => {
    const acctInvoices = getAccountInvoices(accountId);
    return acctInvoices
      .filter(inv => inv.status === 'overdue')
      .reduce((sum, inv) => sum + (inv.amount - inv.amount_paid), 0);
  };

  // ── Summary stats ──
  const totalOutstanding = invoices
    .filter(inv => ['outstanding', 'partially_paid', 'overdue'].includes(inv.status))
    .reduce((sum, inv) => sum + (inv.amount - inv.amount_paid), 0);

  const totalOverdue = invoices
    .filter(inv => inv.status === 'overdue')
    .reduce((sum, inv) => sum + (inv.amount - inv.amount_paid), 0);

  const totalCollected = invoices.reduce((sum, inv) => sum + inv.amount_paid, 0);

  const activeAccountCount = accounts.filter(a => a.status === 'active').length;

  // ── Handlers ──
  const handleAddAccount = () => {
    if (!newAccount.company_name.trim()) {
      toast.error('Company name is required');
      return;
    }
    const account: CityLedgerAccount = {
      id: `cl-${Date.now()}`,
      company_name: newAccount.company_name,
      contact_name: newAccount.contact_name,
      email: newAccount.email,
      phone: newAccount.phone,
      address: newAccount.address,
      credit_limit: parseFloat(newAccount.credit_limit) || 10000,
      payment_terms: parseInt(newAccount.payment_terms) || 30,
      status: 'active',
      created_at: new Date().toISOString(),
      notes: newAccount.notes,
    };
    setAccounts(prev => [...prev, account]);
    setShowAddAccount(false);
    setNewAccount({ company_name: '', contact_name: '', email: '', phone: '', address: '', credit_limit: '', payment_terms: '30', notes: '' });
    toast.success(`Account created for ${account.company_name}`);
  };

  const handlePayment = () => {
    if (!showPaymentDialog) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }
    const remaining = showPaymentDialog.amount - showPaymentDialog.amount_paid;
    if (amount > remaining) {
      toast.error(`Payment exceeds outstanding balance of £${remaining.toFixed(2)}`);
      return;
    }
    setInvoices(prev => prev.map(inv => {
      if (inv.id !== showPaymentDialog.id) return inv;
      const newPaid = inv.amount_paid + amount;
      return {
        ...inv,
        amount_paid: newPaid,
        status: newPaid >= inv.amount ? 'paid' : 'partially_paid',
      };
    }));
    toast.success(`Payment of £${amount.toFixed(2)} recorded against ${showPaymentDialog.invoice_number}`);
    setShowPaymentDialog(null);
    setPaymentAmount('');
  };

  const handleWriteOff = (invoiceId: string) => {
    setInvoices(prev => prev.map(inv =>
      inv.id === invoiceId ? { ...inv, status: 'written_off' as const } : inv
    ));
    toast.success('Invoice written off');
  };

  const handleToggleAccountStatus = (accountId: string) => {
    setAccounts(prev => prev.map(a => {
      if (a.id !== accountId) return a;
      return { ...a, status: a.status === 'active' ? 'suspended' : 'active' };
    }));
  };

  const handleExport = () => {
    const rows = invoices
      .filter(inv => ['outstanding', 'partially_paid', 'overdue'].includes(inv.status))
      .map(inv => {
        const acct = accounts.find(a => a.id === inv.account_id);
        return {
          'Invoice': inv.invoice_number,
          'Company': acct?.company_name ?? '',
          'Guest': inv.guest_name,
          'Description': inv.description,
          'Amount': inv.amount.toFixed(2),
          'Paid': inv.amount_paid.toFixed(2),
          'Balance': (inv.amount - inv.amount_paid).toFixed(2),
          'Posted': format(new Date(inv.date_posted), 'dd/MM/yyyy'),
          'Due': format(new Date(inv.due_date), 'dd/MM/yyyy'),
          'Status': inv.status,
        };
      });
    exportCSV(rows, `city-ledger-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  // ── Aging buckets ──
  const agingBuckets = useMemo(() => {
    const now = new Date();
    const buckets = { current: 0, '1_30': 0, '31_60': 0, '61_90': 0, over_90: 0 };
    for (const inv of invoices) {
      if (inv.status === 'paid' || inv.status === 'written_off') continue;
      const balance = inv.amount - inv.amount_paid;
      const daysOld = differenceInDays(now, new Date(inv.due_date));
      if (daysOld <= 0) buckets.current += balance;
      else if (daysOld <= 30) buckets['1_30'] += balance;
      else if (daysOld <= 60) buckets['31_60'] += balance;
      else if (daysOld <= 90) buckets['61_90'] += balance;
      else buckets.over_90 += balance;
    }
    return buckets;
  }, [invoices]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 mesh-gradient min-h-full">
      <div className="dot-grid absolute inset-0 pointer-events-none" />

      {/* Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/20">
              <Landmark size={22} className="text-gold" />
            </div>
            City Ledger
          </h1>
          <p className="text-xs sm:text-sm text-steel mt-1 font-body">Accounts receivable — company & agency direct billing</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2.5 sm:py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-steel hover:text-silver text-xs font-body transition-all duration-200 touch-manipulation"
            aria-label="Export outstanding invoices"
          >
            <Download size={14} />
            Export
          </button>
          <button
            onClick={() => setShowAddAccount(true)}
            className="flex items-center gap-2 px-3 py-2.5 sm:py-2 rounded-xl bg-gradient-to-r from-gold/20 to-teal/10 border border-gold/25 text-gold hover:text-gold-light text-xs font-body font-semibold transition-all duration-200 touch-manipulation"
          >
            <Plus size={14} />
            New Account
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Outstanding', value: `£${totalOutstanding.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`, icon: FileText, color: 'text-blue-400', border: 'border-blue-500/20' },
          { label: 'Overdue', value: `£${totalOverdue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`, icon: AlertTriangle, color: 'text-red-400', border: 'border-red-500/20' },
          { label: 'Collected (YTD)', value: `£${totalCollected.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-emerald-400', border: 'border-emerald-500/20' },
          { label: 'Active Accounts', value: String(activeAccountCount), icon: Building2, color: 'text-gold', border: 'border-gold/20' },
        ].map((stat, i) => (
          <div key={stat.label} className={cn('glass-panel p-4 sm:p-5 rounded-xl', `animate-stagger-${i + 1}`)}>
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={15} className={stat.color} />
              <span className="text-[11px] sm:text-xs text-steel font-body">{stat.label}</span>
            </div>
            <p className="text-lg sm:text-2xl font-display font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Aging Report */}
      <div className="relative glass-panel rounded-xl p-4 sm:p-5">
        <h3 className="text-sm font-display font-semibold text-white mb-3 flex items-center gap-2">
          <Clock size={15} className="text-teal" />
          Aging Summary
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {([
            { label: 'Current', value: agingBuckets.current, color: 'from-emerald-500/20 to-emerald-500/5' },
            { label: '1–30 days', value: agingBuckets['1_30'], color: 'from-blue-500/20 to-blue-500/5' },
            { label: '31–60 days', value: agingBuckets['31_60'], color: 'from-amber-500/20 to-amber-500/5' },
            { label: '61–90 days', value: agingBuckets['61_90'], color: 'from-orange-500/20 to-orange-500/5' },
            { label: '90+ days', value: agingBuckets.over_90, color: 'from-red-500/20 to-red-500/5' },
          ] as const).map(bucket => (
            <div key={bucket.label} className={cn('rounded-lg p-2 sm:p-3 bg-gradient-to-b text-center', bucket.color)}>
              <p className="text-[10px] sm:text-[11px] text-steel font-body">{bucket.label}</p>
              <p className="text-sm sm:text-base font-display font-bold text-white mt-1">
                £{bucket.value.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="relative flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search companies..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white font-body placeholder:text-steel/50 focus:outline-none focus:ring-1 focus:ring-gold/30 focus:border-gold/20 transition-all"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'active', 'suspended', 'closed'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-body font-medium border transition-all duration-200 capitalize touch-manipulation',
                filterStatus === status
                  ? 'bg-gold/10 border-gold/25 text-gold'
                  : 'bg-white/[0.03] border-white/[0.06] text-steel hover:text-silver hover:bg-white/[0.06]'
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Account List */}
      <div className="relative space-y-3">
        {filteredAccounts.map((account, i) => {
          const acctInvoices = getAccountInvoices(account.id);
          const balance = getAccountBalance(account.id);
          const overdue = getAccountOverdue(account.id);
          const isExpanded = expandedAccount === account.id;
          const statusCfg = accountStatusConfig[account.status];
          const utilizationPct = account.credit_limit > 0 ? (balance / account.credit_limit) * 100 : 0;

          return (
            <div
              key={account.id}
              className={cn(
                'glass-panel rounded-xl overflow-hidden transition-all duration-300',
                i < 6 && `animate-stagger-${i + 1}`,
                isExpanded && 'ring-1 ring-gold/20'
              )}
            >
              {/* Account Header */}
              <button
                onClick={() => setExpandedAccount(isExpanded ? null : account.id)}
                className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 text-left transition-all hover:bg-white/[0.02] touch-manipulation"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold/20 to-teal/10 border border-gold/15 flex items-center justify-center text-[11px] font-display font-bold text-gold shrink-0">
                  {account.company_name.split(' ').slice(0, 2).map(w => w[0]).join('')}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-body font-semibold text-white truncate">{account.company_name}</p>
                    {statusCfg && (
                    <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-semibold border', statusCfg.bg, statusCfg.border, statusCfg.color)}>
                      {statusCfg.label}
                    </span>
                    )}
                  </div>
                  <p className="text-[11px] text-steel font-body truncate">{account.contact_name} · {account.payment_terms}-day terms</p>
                </div>

                <div className="hidden sm:flex items-center gap-6 shrink-0">
                  {overdue > 0 && (
                    <div className="text-right">
                      <p className="text-[10px] text-red-400 font-body">Overdue</p>
                      <p className="text-sm font-display font-bold text-red-400">£{overdue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-[10px] text-steel font-body">Balance</p>
                    <p className={cn('text-sm font-display font-bold', balance > 0 ? 'text-white' : 'text-emerald-400')}>
                      £{balance.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-right w-20">
                    <p className="text-[10px] text-steel font-body">Credit Used</p>
                    <div className="mt-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          utilizationPct > 80 ? 'bg-red-400' : utilizationPct > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                        )}
                        style={{ width: `${Math.min(100, utilizationPct)}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-steel font-body mt-0.5">{utilizationPct.toFixed(0)}%</p>
                  </div>
                </div>

                {isExpanded ? (
                  <ChevronUp size={16} className="text-steel shrink-0" />
                ) : (
                  <ChevronDown size={16} className="text-steel shrink-0" />
                )}
              </button>

              {/* Expanded: Invoice List + Actions */}
              {isExpanded && (
                <div className="border-t border-white/[0.06]">
                  {/* Account Details Bar */}
                  <div className="px-4 sm:px-5 py-3 bg-white/[0.02] flex flex-wrap gap-x-6 gap-y-1 text-[11px] font-body text-steel">
                    <span className="flex items-center gap-1.5"><Mail size={11} /> {account.email}</span>
                    <span className="flex items-center gap-1.5"><Phone size={11} /> {account.phone}</span>
                    <span className="flex items-center gap-1.5"><Building2 size={11} /> {account.address}</span>
                    <span className="flex items-center gap-1.5">Credit limit: £{account.credit_limit.toLocaleString()}</span>
                  </div>

                  {account.notes && (
                    <div className="px-4 sm:px-5 py-2 bg-gold/[0.03] border-t border-white/[0.04]">
                      <p className="text-[11px] text-gold/70 font-body italic">{account.notes}</p>
                    </div>
                  )}

                  {/* Mobile balance summary */}
                  <div className="sm:hidden px-4 py-3 border-t border-white/[0.04] flex gap-4">
                    <div>
                      <p className="text-[10px] text-steel font-body">Balance</p>
                      <p className="text-sm font-display font-bold text-white">£{balance.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
                    </div>
                    {overdue > 0 && (
                      <div>
                        <p className="text-[10px] text-red-400 font-body">Overdue</p>
                        <p className="text-sm font-display font-bold text-red-400">£{overdue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
                      </div>
                    )}
                  </div>

                  {/* Invoices Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-body">
                      <thead>
                        <tr className="text-[10px] text-steel uppercase tracking-wider border-t border-white/[0.04]">
                          <th className="px-4 sm:px-5 py-2.5 text-left">Invoice</th>
                          <th className="px-2 py-2.5 text-left">Guest</th>
                          <th className="px-2 py-2.5 text-left hidden md:table-cell">Description</th>
                          <th className="px-2 py-2.5 text-right">Amount</th>
                          <th className="px-2 py-2.5 text-right hidden sm:table-cell">Paid</th>
                          <th className="px-2 py-2.5 text-right">Balance</th>
                          <th className="px-2 py-2.5 text-left hidden sm:table-cell">Due</th>
                          <th className="px-2 py-2.5 text-center">Status</th>
                          <th className="px-4 sm:px-5 py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {acctInvoices.map(inv => {
                          const invStatus = invoiceStatusConfig[inv.status];
                          const invBalance = inv.amount - inv.amount_paid;
                          return (
                            <tr key={inv.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 sm:px-5 py-3 text-silver font-medium">{inv.invoice_number}</td>
                              <td className="px-2 py-3 text-silver">{inv.guest_name}</td>
                              <td className="px-2 py-3 text-steel hidden md:table-cell max-w-[200px] truncate">{inv.description}</td>
                              <td className="px-2 py-3 text-right text-silver tabular-nums">£{inv.amount.toFixed(2)}</td>
                              <td className="px-2 py-3 text-right text-steel tabular-nums hidden sm:table-cell">£{inv.amount_paid.toFixed(2)}</td>
                              <td className="px-2 py-3 text-right font-semibold tabular-nums text-white">
                                {invBalance > 0 ? `£${invBalance.toFixed(2)}` : '—'}
                              </td>
                              <td className="px-2 py-3 text-steel hidden sm:table-cell">{format(new Date(inv.due_date), 'dd MMM')}</td>
                              <td className="px-2 py-3 text-center">
                                {invStatus && (
                                <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-semibold border inline-flex', invStatus.bg, invStatus.border, invStatus.color)}>
                                  {invStatus.label}
                                </span>
                                )}
                              </td>
                              <td className="px-4 sm:px-5 py-3 text-right">
                                {inv.status !== 'paid' && inv.status !== 'written_off' && (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => { setShowPaymentDialog(inv); setPaymentAmount(String(invBalance)); }}
                                      className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-steel hover:text-emerald-400 transition-all touch-manipulation"
                                      title="Record payment"
                                      aria-label="Record payment"
                                    >
                                      <CreditCard size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleWriteOff(inv.id)}
                                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-steel hover:text-red-400 transition-all touch-manipulation"
                                      title="Write off"
                                      aria-label="Write off invoice"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                )}
                                {inv.status === 'paid' && (
                                  <Check size={13} className="text-emerald-400 inline" />
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {acctInvoices.length === 0 && (
                          <tr>
                            <td colSpan={9} className="px-5 py-8 text-center text-steel text-xs font-body">
                              No invoices on this account
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Account Actions */}
                  <div className="px-4 sm:px-5 py-3 border-t border-white/[0.06] flex items-center gap-2">
                    <button
                      onClick={() => handleToggleAccountStatus(account.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-[11px] font-body font-semibold border transition-all touch-manipulation',
                        account.status === 'active'
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                      )}
                    >
                      {account.status === 'active' ? 'Suspend Account' : 'Reactivate Account'}
                    </button>
                    <button
                      onClick={() => {
                        const rows = acctInvoices.map(inv => ({
                          'Invoice': inv.invoice_number,
                          'Guest': inv.guest_name,
                          'Description': inv.description,
                          'Amount': inv.amount.toFixed(2),
                          'Paid': inv.amount_paid.toFixed(2),
                          'Balance': (inv.amount - inv.amount_paid).toFixed(2),
                          'Due': format(new Date(inv.due_date), 'dd/MM/yyyy'),
                          'Status': inv.status,
                        }));
                        exportCSV(rows, `${account.company_name.replace(/\s+/g, '-')}-statement`);
                      }}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-body font-semibold border bg-white/[0.03] border-white/[0.08] text-steel hover:text-silver hover:bg-white/[0.06] transition-all touch-manipulation"
                    >
                      <span className="flex items-center gap-1.5"><Receipt size={11} /> Statement</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredAccounts.length === 0 && (
          <div className="glass-panel rounded-xl p-12 text-center">
            <Building2 size={40} className="mx-auto text-steel/30 mb-3" />
            <p className="text-steel text-sm font-body">No accounts match your filters</p>
          </div>
        )}
      </div>

      {/* ── Add Account Dialog ── */}
      {showAddAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Add company account">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" onClick={() => setShowAddAccount(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-[#0f1724] border border-white/[0.1] shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-display font-semibold text-white flex items-center gap-2">
              <Building2 size={18} className="text-gold" /> New City Ledger Account
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-steel font-body mb-1">Company Name *</label>
                <input
                  value={newAccount.company_name}
                  onChange={e => setNewAccount(prev => ({ ...prev, company_name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white font-body placeholder:text-steel/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
                  placeholder="Company Ltd"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-steel font-body mb-1">Contact Name</label>
                <input
                  value={newAccount.contact_name}
                  onChange={e => setNewAccount(prev => ({ ...prev, contact_name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white font-body placeholder:text-steel/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="block text-xs text-steel font-body mb-1">Email</label>
                <input
                  value={newAccount.email}
                  onChange={e => setNewAccount(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white font-body placeholder:text-steel/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
                  placeholder="billing@company.com"
                  type="email"
                />
              </div>
              <div>
                <label className="block text-xs text-steel font-body mb-1">Phone</label>
                <input
                  value={newAccount.phone}
                  onChange={e => setNewAccount(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white font-body placeholder:text-steel/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
                  placeholder="+44 20 ..."
                />
              </div>
              <div>
                <label className="block text-xs text-steel font-body mb-1">Credit Limit (£)</label>
                <input
                  value={newAccount.credit_limit}
                  onChange={e => setNewAccount(prev => ({ ...prev, credit_limit: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white font-body placeholder:text-steel/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
                  placeholder="10000"
                  type="number"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-steel font-body mb-1">Address</label>
                <input
                  value={newAccount.address}
                  onChange={e => setNewAccount(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white font-body placeholder:text-steel/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
                  placeholder="Full billing address"
                />
              </div>
              <div>
                <label className="block text-xs text-steel font-body mb-1">Payment Terms (days)</label>
                <select
                  value={newAccount.payment_terms}
                  onChange={e => setNewAccount(prev => ({ ...prev, payment_terms: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white font-body focus:outline-none focus:ring-1 focus:ring-gold/30"
                >
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                  <option value="45">45 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-steel font-body mb-1">Notes</label>
                <input
                  value={newAccount.notes}
                  onChange={e => setNewAccount(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white font-body placeholder:text-steel/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
                  placeholder="Internal notes..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAddAccount(false)}
                className="px-4 py-2 rounded-xl text-xs font-body text-steel hover:text-silver border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAccount}
                className="px-4 py-2 rounded-xl text-xs font-body font-semibold text-gold bg-gold/10 border border-gold/20 hover:bg-gold/20 transition-all"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Dialog ── */}
      {showPaymentDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Record payment">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" onClick={() => setShowPaymentDialog(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-[#0f1724] border border-white/[0.1] shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-display font-semibold text-white flex items-center gap-2">
              <CreditCard size={18} className="text-emerald-400" /> Record Payment
            </h3>
            <div className="text-xs text-steel font-body space-y-1">
              <p>Invoice: <span className="text-silver">{showPaymentDialog.invoice_number}</span></p>
              <p>Outstanding: <span className="text-white font-semibold">£{(showPaymentDialog.amount - showPaymentDialog.amount_paid).toFixed(2)}</span></p>
            </div>
            <div>
              <label className="block text-xs text-steel font-body mb-1">Payment Amount (£)</label>
              <input
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white font-body focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                type="number"
                step="0.01"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowPaymentDialog(null)}
                className="px-4 py-2 rounded-xl text-xs font-body text-steel hover:text-silver border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                className="px-4 py-2 rounded-xl text-xs font-body font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
