import { Link, useLocation, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 'hotel', label: 'Hotel', path: '' },
  { id: 'rooms', label: 'Rooms', path: 'rooms' },
  { id: 'checkout', label: 'Checkout', path: 'checkout' },
  { id: 'confirmation', label: 'Confirmed', path: 'confirmation' },
] as const;

function stepIndex(pathname: string): number {
  if (pathname.includes('/confirmation')) return 3;
  if (pathname.includes('/checkout')) return 2;
  if (pathname.includes('/rooms')) return 1;
  if (pathname.includes('/manage') || pathname.includes('/checkin')) return 3;
  return 0;
}

export function BookingStepper() {
  const { slug } = useParams<{ slug: string }>();
  const { pathname } = useLocation();
  const current = stepIndex(pathname);
  const base = `/book/${slug}`;

  // Hide on manage / self-check-in — not part of the booking funnel
  if (pathname.includes('/manage') || pathname.includes('/checkin')) return null;

  return (
    <div className="border-b border-cloud bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        <ol className="flex items-center justify-between gap-2">
          {STEPS.map((step, i) => {
            const done = i < current;
            const active = i === current;
            const href = step.path ? `${base}/${step.path}` : base;
            const clickable = i <= current;

            return (
              <li key={step.id} className="flex flex-1 items-center min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  {clickable && i < current ? (
                    <Link
                      to={href}
                      className="flex items-center gap-2 min-w-0 group"
                    >
                      <StepDot done active={false} index={i + 1} />
                      <span className="hidden sm:inline text-xs font-semibold font-body text-teal group-hover:text-teal-dark truncate">
                        {step.label}
                      </span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      <StepDot done={done} active={active} index={i + 1} />
                      <span
                        className={cn(
                          'hidden sm:inline text-xs font-semibold font-body truncate',
                          active ? 'text-midnight' : done ? 'text-teal' : 'text-steel',
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-px mx-2 sm:mx-4',
                      i < current ? 'bg-teal/50' : 'bg-cloud',
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function StepDot({
  done,
  active,
  index,
}: {
  done: boolean;
  active: boolean;
  index: number;
}) {
  return (
    <span
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold font-body border',
        done && 'bg-teal border-teal text-white',
        active && !done && 'bg-midnight border-midnight text-white',
        !done && !active && 'bg-white border-cloud text-steel',
      )}
    >
      {done ? <Check size={14} /> : index}
    </span>
  );
}
