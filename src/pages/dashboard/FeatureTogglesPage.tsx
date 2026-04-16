import { Shield, ToggleLeft, ToggleRight, Bot, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useFeatureToggles, ALL_FEATURES, type FeatureMeta } from '@/hooks/useFeatureToggles';
import { useAppStore } from '@/store/useAppStore';

const CATEGORY_LABELS: Record<string, string> = {
  core: 'Core',
  operations: 'Operations',
  revenue: 'Revenue & Finance',
  communication: 'Communication',
  addon: 'Add-ons',
};

const CATEGORY_ORDER = ['core', 'operations', 'revenue', 'communication', 'addon'];

export function FeatureTogglesPage() {
  const { toggles, isLoading, toggleFeature } = useFeatureToggles();
  const currentRole = useAppStore((s) => s.currentRole);
  const isOwner = currentRole === 'owner';
  const navigate = useNavigate();

  const toggleMap = new Map(toggles.map((t) => [t.feature_key, t.enabled]));
  const aiEnabled = toggleMap.get('ai_assistant') ?? false;

  // Group features by category
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    features: ALL_FEATURES.filter((f) => f.category === cat),
  })).filter((g) => g.features.length > 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-6 h-6 border-2 border-teal/30 border-t-teal rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal/20 to-purple-500/10 flex items-center justify-center">
          <Shield size={20} className="text-teal" />
        </div>
        <div>
          <h1 className="text-lg font-display text-white">Feature Toggles</h1>
          <p className="text-xs text-steel font-body">
            Enable or disable features for this property. {!isOwner && 'Only the property owner can change these settings.'}
          </p>
        </div>
      </div>

      {/* Feature groups */}
      {grouped.map((group) => (
        <div key={group.category}>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-steel/60 font-body mb-3 px-1">
            {group.label}
          </h2>
          <div className="space-y-1">
            {group.features.map((feature) => (
              <FeatureRow
                key={feature.key}
                feature={feature}
                enabled={toggleMap.get(feature.key) ?? false}
                isOwner={isOwner}
                onToggle={(enabled) => toggleFeature.mutate({ featureKey: feature.key, enabled })}
                isPending={toggleFeature.isPending}
              />
            ))}
          </div>
        </div>
      ))}

      {/* AI Assistant setup prompt */}
      {aiEnabled && (
        <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-500/[0.08] via-teal/[0.04] to-purple-500/[0.08] p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/30 to-teal/20 flex items-center justify-center shrink-0">
              <Bot size={24} className="text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-display text-white">AI Assistant Enabled</h3>
                <Sparkles size={14} className="text-purple-400" />
              </div>
              <p className="text-xs text-steel font-body leading-relaxed mb-4">
                To start using the AI Assistant, you'll need to add your Claude API key. The assistant will have full access to all your property data — bookings, guests, rooms, revenue, and more.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/dashboard/ai-assistant')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal/20 to-purple-500/10 text-teal text-sm font-body hover:from-teal/30 hover:to-purple-500/20 border border-teal/20 transition-all"
                >
                  Set Up AI Assistant
                  <ArrowRight size={14} />
                </button>
                <span className="text-[10px] text-steel/50 font-body">Requires an Anthropic API key</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureRow({
  feature, enabled, isOwner, onToggle, isPending,
}: {
  feature: FeatureMeta;
  enabled: boolean;
  isOwner: boolean;
  onToggle: (enabled: boolean) => void;
  isPending: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200',
      enabled
        ? 'bg-white/[0.03] border-white/[0.08]'
        : 'bg-white/[0.01] border-white/[0.04] opacity-60'
    )}>
      <div className="min-w-0 flex-1 mr-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-body text-white font-medium">{feature.label}</p>
          {feature.category === 'addon' && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gradient-to-r from-purple-500/20 to-teal/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider">
              Add-on
            </span>
          )}
        </div>
        <p className="text-xs text-steel font-body mt-0.5">{feature.description}</p>
      </div>
      <button
        onClick={() => isOwner && !isPending && onToggle(!enabled)}
        disabled={!isOwner || isPending}
        className={cn(
          'shrink-0 transition-all duration-200',
          !isOwner && 'cursor-not-allowed opacity-40'
        )}
        title={isOwner ? (enabled ? 'Disable' : 'Enable') : 'Only the owner can change this'}
      >
        {enabled ? (
          <ToggleRight size={28} className="text-teal" />
        ) : (
          <ToggleLeft size={28} className="text-steel/40" />
        )}
      </button>
    </div>
  );
}
