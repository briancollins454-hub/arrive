import { useNavigate } from 'react-router-dom';
import { Building2, Plus, ExternalLink, Ban, CheckCircle2, CreditCard } from 'lucide-react';
import { useAllHotels, useBillingActions, statusMeta, formatGBP, usePlans } from '@/hooks/useBilling';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageLoading } from '@/components/shared/PageLoading';
import { PageShell } from '@/components/shared/PageShell';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';

export function AdminHotelsPage() {
  const navigate = useNavigate();
  const { data: hotels, isLoading } = useAllHotels();
  const { data: plans } = usePlans();
  const { setPropertyActive } = useBillingActions();

  const planName = (code: string | null | undefined) =>
    plans?.find((p) => p.code === code)?.name ?? '—';

  return (
    <PageShell variant="dark" className="max-w-5xl">
      <PageHeader
        variant="dark"
        title="Hotels"
        description="All properties on the platform"
        actions={
          <Button onClick={() => navigate('/admin/onboard')}>
            <Plus size={16} className="mr-2" /> Onboard Hotel
          </Button>
        }
      />

      {isLoading ? (
        <PageLoading variant="dark" layout="rows" />
      ) : !hotels || hotels.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No hotels onboarded yet"
          description="Create your first property to get started"
          variant="dark"
          action={
            <Button onClick={() => navigate('/admin/onboard')}>
              <Plus size={16} className="mr-2" /> Onboard your first hotel
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {hotels.map((h) => {
            const meta = statusMeta(h.subscription?.status);
            return (
              <Card key={h.id} variant="dark" className={cn(!h.is_active && 'opacity-60')}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-gold shrink-0">
                      <Building2 size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-body font-medium text-sm truncate">{h.name}</p>
                        {!h.is_active && (
                          <span className="text-[10px] text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded-full font-body">Suspended</span>
                        )}
                      </div>
                      <p className="text-xs text-steel font-body">/book/{h.slug}</p>
                    </div>

                    <span className={cn('text-[11px] font-body font-semibold px-2.5 py-1 rounded-full border', meta.color)}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-steel font-body w-24 hidden sm:block">{planName(h.subscription?.plan_code)}</span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => window.open(`/book/${h.slug}`, '_blank')}
                        className="p-2 rounded-lg text-steel hover:text-teal hover:bg-teal/10 transition-all"
                        title="Open booking page"
                      >
                        <ExternalLink size={14} />
                      </button>
                      {h.is_active ? (
                        <button
                          onClick={() => { if (confirm(`Suspend ${h.name}? Staff will be locked out until reactivated.`)) setPropertyActive.mutate({ property_id: h.id, is_active: false }); }}
                          className="p-2 rounded-lg text-steel hover:text-red-400 hover:bg-red-400/10 transition-all"
                          title="Suspend hotel"
                        >
                          <Ban size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => setPropertyActive.mutate({ property_id: h.id, is_active: true })}
                          className="p-2 rounded-lg text-steel hover:text-teal hover:bg-teal/10 transition-all"
                          title="Reactivate hotel"
                        >
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {hotels && hotels.length > 0 && (
        <button
          onClick={() => navigate('/admin/billing')}
          className="mt-6 flex items-center gap-2 text-sm text-teal hover:text-teal/80 font-body transition-colors"
        >
          <CreditCard size={15} /> View billing & revenue
        </button>
      )}

      {plans && plans.some((p) => !p.stripe_price_id) && (
        <div className="mt-6 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-body">
          Some plans have no Stripe price configured yet. Add the Stripe price IDs in <code>subscription_plans</code> before hotels can subscribe.
          {' '}Plans: {plans.filter((p) => !p.stripe_price_id).map((p) => `${p.name} (${formatGBP(p.monthly_price_pence)})`).join(', ')}.
        </div>
      )}
    </PageShell>
  );
}
