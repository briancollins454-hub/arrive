import { useState } from 'react';
import { useProperty } from '@/hooks/useProperty';
import { useAuth } from '@/hooks/useAuth';
import { usePlans, useMySubscription, useBillingActions, formatGBP, statusMeta } from '@/hooks/useBilling';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Loader2, Check, Sparkles, CreditCard, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BillingPage() {
  const { property } = useProperty();
  const { can } = useAuth();
  const propertyId = property?.id ?? null;
  const { data: plans, isLoading: plansLoading } = usePlans();
  const { data: sub, isLoading: subLoading } = useMySubscription(propertyId);
  const { startCheckout, openPortal } = useBillingActions();
  const [aiAddon, setAiAddon] = useState(false);

  const canManage = can('settings.manage');
  const sellablePlans = (plans ?? []).filter((p) => !p.is_addon && p.is_active);
  const addon = (plans ?? []).find((p) => p.is_addon);
  const meta = statusMeta(sub?.status);
  const hasLiveSub = sub && (sub.status === 'active' || sub.status === 'past_due' || sub.status === 'trialing') && !!sub.stripe_subscription_id;

  if (subLoading || plansLoading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-gold" /></div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-display text-white mb-1.5 tracking-tight">Subscription & Billing</h1>
        <p className="text-sm text-steel font-body">Your Arrivé plan for {property?.name}</p>
      </div>

      {/* Current status */}
      <Card variant="dark" className="mb-6">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <ShieldCheck size={18} className="text-gold" /> Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 flex-wrap">
            <span className={cn('text-xs font-body font-semibold px-2.5 py-1 rounded-full border', meta.color)}>{meta.label}</span>
            <span className="text-white font-body">
              {sellablePlans.find((p) => p.code === sub?.plan_code)?.name ?? 'No active plan'}
              {sub?.ai_addon ? ' + Arrivé AI' : ''}
            </span>
            {sub?.current_period_end && (
              <span className="text-xs text-steel font-body">
                {sub.cancel_at_period_end ? 'Ends' : 'Renews'} {new Date(sub.current_period_end).toLocaleDateString()}
              </span>
            )}
            {sub?.status === 'trialing' && sub.trial_ends_at && (
              <span className="text-xs text-steel font-body">Trial ends {new Date(sub.trial_ends_at).toLocaleDateString()}</span>
            )}
          </div>

          {sub?.status === 'past_due' && (
            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-body">
              Your last payment failed. Please update your card to avoid losing access.
            </div>
          )}

          {hasLiveSub && canManage && (
            <Button className="mt-4" variant="outline-dark" onClick={() => openPortal.mutate(propertyId!)} disabled={openPortal.isPending}>
              {openPortal.isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : <CreditCard size={16} className="mr-2" />}
              Manage billing
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Plan picker (when not on a live paid plan) */}
      {!hasLiveSub && (
        <>
          {addon && (
            <button
              onClick={() => setAiAddon((v) => !v)}
              className={cn(
                'w-full mb-4 flex items-center justify-between p-4 rounded-xl border transition-all text-left',
                aiAddon ? 'border-purple-500/40 bg-purple-500/[0.08]' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]'
              )}
            >
              <div className="flex items-center gap-3">
                <Sparkles size={18} className={aiAddon ? 'text-purple-300' : 'text-steel'} />
                <div>
                  <p className="text-sm text-white font-body font-medium">Add Arrivé AI</p>
                  <p className="text-xs text-steel font-body">Data queries, revenue suggestions, draft guest replies</p>
                </div>
              </div>
              <span className="text-sm text-white font-body">+{formatGBP(addon.monthly_price_pence)}/mo</span>
            </button>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sellablePlans.map((p) => (
              <Card key={p.code} variant="dark" className="flex flex-col">
                <CardContent className="py-6 flex flex-col flex-1">
                  <p className="text-white font-display text-lg">{p.name}</p>
                  <p className="text-xs text-steel font-body mb-3">
                    {p.room_min}{p.room_max ? `–${p.room_max}` : '+'} rooms
                  </p>
                  <div className="mb-4">
                    <span className="text-3xl font-display text-white">{formatGBP(p.monthly_price_pence)}</span>
                    <span className="text-steel text-sm font-body"> / month</span>
                  </div>
                  <Button
                    className="mt-auto w-full"
                    disabled={!canManage || startCheckout.isPending || !p.stripe_price_id}
                    onClick={() => startCheckout.mutate({ property_id: propertyId!, plan_code: p.code, ai_addon: aiAddon })}
                  >
                    {startCheckout.isPending && startCheckout.variables?.plan_code === p.code
                      ? <Loader2 size={16} className="animate-spin mr-2" />
                      : <Check size={16} className="mr-2" />}
                    {p.stripe_price_id ? 'Subscribe' : 'Coming soon'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {!canManage && (
            <p className="mt-4 text-xs text-steel font-body text-center">Only the hotel owner can manage the subscription.</p>
          )}
        </>
      )}
    </div>
  );
}
