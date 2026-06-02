import { useMemo } from 'react';
import { Loader2, TrendingUp, Building2, AlertTriangle, ExternalLink } from 'lucide-react';
import { useAllHotels, usePlans, useBillingActions, statusMeta, formatGBP } from '@/hooks/useBilling';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

export function AdminBillingPage() {
  const { data: hotels, isLoading } = useAllHotels();
  const { data: plans } = usePlans();
  const { openPortal } = useBillingActions();

  const planPrice = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of plans ?? []) map.set(p.code, p.monthly_price_pence);
    return map;
  }, [plans]);
  const aiAddonPrice = planPrice.get('ai_addon') ?? 0;

  const stats = useMemo(() => {
    let mrr = 0, active = 0, trialing = 0, pastDue = 0, canceled = 0;
    for (const h of hotels ?? []) {
      const s = h.subscription;
      if (!s) continue;
      if (s.status === 'active') active++;
      else if (s.status === 'trialing') trialing++;
      else if (s.status === 'past_due') pastDue++;
      else if (s.status === 'canceled' || s.status === 'suspended') canceled++;
      if (s.status === 'active' && s.plan_code) {
        mrr += planPrice.get(s.plan_code) ?? 0;
        if (s.ai_addon) mrr += aiAddonPrice;
      }
    }
    return { mrr, active, trialing, pastDue, canceled };
  }, [hotels, planPrice, aiAddonPrice]);

  const planName = (code: string | null | undefined) => plans?.find((p) => p.code === code)?.name ?? '—';

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-display text-white mb-1.5 tracking-tight">Billing</h1>
        <p className="text-sm text-steel font-body">Subscriptions and recurring revenue across all hotels</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-gold" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            <StatCard icon={TrendingUp} label="MRR" value={formatGBP(stats.mrr)} accent="text-gold" />
            <StatCard icon={Building2} label="Active" value={String(stats.active)} accent="text-emerald-400" />
            <StatCard icon={Building2} label="Trialing" value={String(stats.trialing)} accent="text-teal" />
            <StatCard icon={AlertTriangle} label="Past due" value={String(stats.pastDue)} accent="text-amber-400" />
          </div>

          <div className="space-y-3">
            {(hotels ?? []).map((h) => {
              const meta = statusMeta(h.subscription?.status);
              const s = h.subscription;
              const monthly = s?.status && s.plan_code
                ? (planPrice.get(s.plan_code) ?? 0) + (s.ai_addon ? aiAddonPrice : 0)
                : 0;
              return (
                <Card key={h.id} variant="dark">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-body font-medium text-sm truncate">{h.name}</p>
                        <p className="text-xs text-steel font-body">
                          {planName(s?.plan_code)}{s?.ai_addon ? ' + AI' : ''}
                          {s?.current_period_end ? ` · renews ${new Date(s.current_period_end).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                      {monthly > 0 && <span className="text-sm text-white font-body">{formatGBP(monthly)}/mo</span>}
                      <span className={cn('text-[11px] font-body font-semibold px-2.5 py-1 rounded-full border', meta.color)}>
                        {meta.label}
                      </span>
                      {s?.stripe_customer_id && (
                        <button
                          onClick={() => openPortal.mutate(h.id)}
                          disabled={openPortal.isPending}
                          className="p-2 rounded-lg text-steel hover:text-teal hover:bg-teal/10 transition-all disabled:opacity-50"
                          title="Open Stripe billing portal"
                        >
                          {openPortal.isPending && openPortal.variables === h.id ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent: string }) {
  return (
    <Card variant="dark">
      <CardContent className="py-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon size={14} className={accent} />
          <span className="text-[11px] uppercase tracking-wider text-steel/60 font-body">{label}</span>
        </div>
        <p className={cn('text-2xl font-display', accent)}>{value}</p>
      </CardContent>
    </Card>
  );
}
