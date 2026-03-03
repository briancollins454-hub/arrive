import { useState } from 'react';
import { Download, X, Share, Plus } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export default function InstallPrompt() {
  const { canInstall, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  // Don't render if already installed, dismissed, or no install ability (and not iOS)
  if (isInstalled || dismissed || (!canInstall && !isIOS)) return null;

  const handleInstall = async () => {
    const accepted = await install();
    if (accepted) setDismissed(true);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-50 animate-in slide-in-from-bottom-4 duration-500">
      <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-midnight/95 via-charcoal/95 to-midnight/95 backdrop-blur-xl shadow-2xl shadow-gold/10">
        {/* Decorative glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gold/5 rounded-full blur-3xl" />

        <div className="relative p-5">
          {/* Close button */}
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-3 right-3 p-1 rounded-full text-silver/40 hover:text-silver hover:bg-white/5 transition-colors"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>

          {/* Icon + Title */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-gold/20 to-teal/20 border border-gold/10 flex items-center justify-center">
              <Download className="w-6 h-6 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-white mb-1">
                Install Arrivé
              </h3>
              <p className="text-sm text-silver/70 leading-relaxed">
                {isIOS
                  ? 'Add Arrivé to your home screen for instant access.'
                  : 'Install the app for a faster, native experience on any device.'}
              </p>
            </div>
          </div>

          {/* Action */}
          <div className="mt-4">
            {isIOS ? (
              <div className="flex items-center gap-2 text-xs text-silver/60 bg-white/5 rounded-xl px-4 py-3">
                <span>Tap</span>
                <Share size={14} className="text-gold" />
                <span>then</span>
                <span className="inline-flex items-center gap-1 font-medium text-gold">
                  <Plus size={12} /> Add to Home Screen
                </span>
              </div>
            ) : (
              <button
                onClick={handleInstall}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-midnight font-semibold text-sm hover:shadow-lg hover:shadow-gold/20 active:scale-[0.98] transition-all"
              >
                <Download size={16} />
                Install App
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
