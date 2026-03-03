import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import {
  CreditCard, Wifi, Smartphone, Hash, Check, X,
  Loader2, Shield, DoorOpen, KeyRound, Signal,
  AlertTriangle, Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { EncodingProgress, KeyCard, KeyCardType, EncodingStage } from '@/hooks/useKeyCard';

// ============================================================
// Props
// ============================================================

interface KeyCardModalProps {
  open: boolean;
  onClose: () => void;
  encodingProgress: EncodingProgress;
  encodedCards: KeyCard[];
  guestName: string;
  roomNumber: string;
  cardType: KeyCardType;
  numCards: number;
  providerName: string;
  onEncode: () => void;
  onDone: () => void;
  /** If true, encoding starts automatically when modal opens */
  autoStart?: boolean;
  /** If true, the card is a master key with special styling */
  isMasterKey?: boolean;
}

// ============================================================
// Stage icon/color map
// ============================================================

const STAGE_CONFIG: Record<EncodingStage, { icon: typeof Wifi; color: string; pulse: boolean }> = {
  idle: { icon: CreditCard, color: 'text-steel', pulse: false },
  connecting: { icon: Signal, color: 'text-blue-400', pulse: true },
  authenticating: { icon: Shield, color: 'text-amber-400', pulse: true },
  encoding: { icon: KeyRound, color: 'text-teal', pulse: true },
  verifying: { icon: Shield, color: 'text-purple-400', pulse: true },
  success: { icon: Check, color: 'text-emerald-400', pulse: false },
  error: { icon: AlertTriangle, color: 'text-red-400', pulse: false },
};

const CARD_TYPE_LABELS: Record<KeyCardType, { label: string; icon: typeof CreditCard }> = {
  rfid: { label: 'RFID Card', icon: CreditCard },
  magstripe: { label: 'Magnetic Stripe', icon: CreditCard },
  mobile: { label: 'Mobile Key', icon: Smartphone },
  pin: { label: 'PIN Code', icon: Hash },
};

// ============================================================
// Component
// ============================================================

export function KeyCardModal({
  open,
  onClose,
  encodingProgress,
  encodedCards,
  guestName,
  roomNumber,
  cardType,
  numCards,
  providerName,
  onEncode,
  onDone,
  autoStart = true,
  isMasterKey = false,
}: KeyCardModalProps) {
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (open && autoStart && !hasStarted && encodingProgress.stage === 'idle') {
      setHasStarted(true);
      onEncode();
    }
  }, [open, autoStart, hasStarted, encodingProgress.stage, onEncode]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) setHasStarted(false);
  }, [open]);

  const stageConfig = STAGE_CONFIG[encodingProgress.stage];
  const StageIcon = stageConfig.icon;
  const cardInfo = CARD_TYPE_LABELS[cardType];
  const CardIcon = cardInfo.icon;
  const isComplete = encodingProgress.stage === 'success';
  const isError = encodingProgress.stage === 'error';
  const isWorking = !isComplete && !isError && encodingProgress.stage !== 'idle';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isWorking) onClose(); }}>
      <DialogContent variant="dark" className="max-w-md">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              {isMasterKey ? (
                <>
                  <Shield size={18} className="text-amber-400" />
                  <h2 className="text-lg font-display text-white">Master Key Encoding</h2>
                </>
              ) : (
                <>
                  <DoorOpen size={18} className="text-teal" />
                  <h2 className="text-lg font-display text-white">Key Card Encoding</h2>
                </>
              )}
            </div>
            <p className="text-sm text-steel font-body">
              {providerName} — {isMasterKey ? 'All Rooms Access' : `Room ${roomNumber}`}
            </p>
          </div>

          {/* Encoding animation area */}
          <div className="relative">
            {/* Card visual */}
            <div
              className={cn(
                'relative mx-auto w-72 h-44 rounded-2xl overflow-hidden transition-all duration-700',
                isComplete && 'ring-2 ring-emerald-400/40',
                isError && 'ring-2 ring-red-400/40',
                isWorking && 'ring-2 ring-teal/30',
              )}
            >
              {/* Card background */}
              <div className={cn(
                'absolute inset-0',
                isMasterKey
                  ? 'bg-gradient-to-br from-amber-900/80 via-midnight to-amber-950/60'
                  : 'bg-gradient-to-br from-midnight-light via-midnight to-midnight-dark',
              )} />
              <div className={cn(
                'absolute inset-0',
                isMasterKey
                  ? 'bg-gradient-to-tr from-gold/15 via-transparent to-amber-400/10'
                  : 'bg-gradient-to-tr from-teal/10 via-transparent to-gold/5',
              )} />

              {/* NFC chip visual */}
              <div className="absolute top-5 left-5">
                <div className={cn(
                  'w-10 h-8 rounded-md border-2 flex items-center justify-center transition-colors duration-300',
                  isComplete ? 'border-emerald-400/60 bg-emerald-400/10' :
                  isWorking ? (isMasterKey ? 'border-amber-400/40 bg-amber-400/10' : 'border-teal/40 bg-teal/10') :
                  isError ? 'border-red-400/40 bg-red-400/10' :
                  'border-white/20 bg-white/5',
                )}>
                  <Wifi size={14} className={cn(
                    'transition-colors',
                    isComplete ? 'text-emerald-400' :
                    isWorking ? (isMasterKey ? 'text-amber-400' : 'text-teal') :
                    isError ? 'text-red-400' :
                    'text-white/40',
                    stageConfig.pulse && 'animate-pulse',
                  )} />
                </div>
              </div>

              {/* Hotel name + master badge */}
              <div className="absolute top-5 right-5 flex items-center gap-2">
                {isMasterKey && (
                  <span className="text-[9px] font-body font-bold tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.5 rounded uppercase">
                    Master
                  </span>
                )}
                <span className="text-[10px] font-display tracking-[0.3em] text-gold/70 uppercase">Arrivé</span>
              </div>

              {/* Card info */}
              <div className="absolute bottom-5 left-5 right-5">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-white/40 font-body uppercase tracking-wider mb-0.5">
                      {isMasterKey ? 'Staff' : 'Guest'}
                    </p>
                    <p className="text-sm font-display text-white/90">
                      {isMasterKey ? 'Master Key' : guestName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-white/40 font-body uppercase tracking-wider mb-0.5">
                      {isMasterKey ? 'Access' : 'Room'}
                    </p>
                    <p className={cn('text-lg font-display', isMasterKey ? 'text-amber-400' : 'text-gold')}>
                      {isMasterKey ? 'ALL' : roomNumber}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scanning line animation */}
              {isWorking && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className={cn(
                    'absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent to-transparent animate-scan',
                    isMasterKey ? 'via-amber-400' : 'via-teal',
                  )} />
                </div>
              )}

              {/* Success overlay */}
              {isComplete && (
                <div className="absolute inset-0 bg-emerald-400/5 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-400/10 border-2 border-emerald-400/30 flex items-center justify-center animate-scale-in">
                    <Check size={28} className="text-emerald-400" />
                  </div>
                </div>
              )}

              {/* Error overlay */}
              {isError && (
                <div className="absolute inset-0 bg-red-400/5 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-red-400/10 border-2 border-red-400/30 flex items-center justify-center">
                    <X size={28} className="text-red-400" />
                  </div>
                </div>
              )}
            </div>

            {/* Card type badge */}
            <div className="flex justify-center mt-3 gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-body text-steel">
                <CardIcon size={12} />
                {cardInfo.label}
                {numCards > 1 && ` × ${numCards}`}
              </span>
              {isMasterKey && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-xs font-body font-semibold text-amber-300">
                  <Shield size={12} />
                  Master Key
                </span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {(isWorking || isComplete) && (
            <div className="space-y-2">
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500 ease-out',
                    isComplete ? 'bg-emerald-400' : 'bg-teal',
                  )}
                  style={{ width: `${encodingProgress.progress}%` }}
                />
              </div>
              <div className="flex items-center gap-2 justify-center">
                {isWorking && <Loader2 size={12} className="text-teal animate-spin" />}
                <StageIcon size={12} className={stageConfig.color} />
                <p className={cn('text-xs font-body', isComplete ? 'text-emerald-400' : isError ? 'text-red-400' : 'text-steel')}>
                  {encodingProgress.message}
                </p>
              </div>
            </div>
          )}

          {/* Error info */}
          {isError && encodingProgress.error && (
            <div className="bg-red-400/5 border border-red-400/20 rounded-xl px-4 py-3">
              <p className="text-xs text-red-400 font-body">{encodingProgress.error}</p>
            </div>
          )}

          {/* Encoded card details */}
          {isComplete && encodedCards.length > 0 && (
            <div className="space-y-2">
              {encodedCards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white font-body">
                        {card.card_type === 'mobile' ? 'Mobile Key' : `Card ${card.card_number.split(':').slice(0, 3).join(':')}`}
                      </span>
                      {card.is_master && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-400/10 text-[10px] font-semibold text-amber-300 font-body">
                          MASTER
                        </span>
                      )}
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-400/10 text-[10px] font-semibold text-emerald-400 font-body">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-[10px] text-steel font-body">
                      Valid {format(new Date(card.valid_from), 'dd MMM')} — {format(new Date(card.valid_until), 'dd MMM yyyy HH:mm')}
                    </p>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(card.card_number)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-steel hover:text-white transition-colors"
                    title="Copy card UID"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {isComplete ? (
              <Button className="flex-1" onClick={onDone}>
                <Check size={14} className="mr-2" />
                Done
              </Button>
            ) : isError ? (
              <>
                <Button variant="outline-dark" className="flex-1" onClick={onClose}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={onEncode}>
                  Retry
                </Button>
              </>
            ) : isWorking ? (
              <Button variant="outline-dark" className="flex-1" disabled>
                <Loader2 size={14} className="mr-2 animate-spin" />
                Encoding…
              </Button>
            ) : (
              <>
                <Button variant="outline-dark" className="flex-1" onClick={onClose}>
                  Skip
                </Button>
                <Button className="flex-1" onClick={onEncode}>
                  <CreditCard size={14} className="mr-2" />
                  {isMasterKey ? 'Encode Master Key' : 'Encode Key'}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
