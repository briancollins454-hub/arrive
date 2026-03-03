import type { FC } from 'react';
import type { BookingStatus } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { getStatusLabel } from '@/lib/utils';

const variantMap: Record<string, 'confirmed' | 'arriving' | 'checked-in' | 'pending' | 'cancelled' | 'no-show' | 'default'> = {
  pending: 'pending',
  confirmed: 'confirmed',
  checked_in: 'checked-in',
  checked_out: 'default',
  cancelled: 'cancelled',
  no_show: 'no-show',
};

interface StatusBadgeProps {
  status: BookingStatus | string;
  className?: string;
}

export const StatusBadge: FC<StatusBadgeProps> = ({ status, className }) => {
  const variant = variantMap[status] ?? 'default';
  return (
    <Badge variant={variant} className={className}>
      {getStatusLabel(status)}
    </Badge>
  );
};
