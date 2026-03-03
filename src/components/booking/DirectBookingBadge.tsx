import type { FC } from 'react';
import { Shield } from 'lucide-react';

export const DirectBookingBadge: FC<{ className?: string }> = ({ className }) => (
  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal/10 border border-teal/20 ${className ?? ''}`}>
    <Shield size={12} className="text-teal" />
    <span className="text-xs font-semibold text-teal font-body">
      Direct Booking — Best Price
    </span>
  </div>
);
