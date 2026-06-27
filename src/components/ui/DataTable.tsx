import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  variant?: 'light' | 'dark';
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: T) => void;
};

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  variant = 'dark',
  emptyMessage = 'No results',
  className,
  onRowClick,
}: DataTableProps<T>) {
  const dark = variant === 'dark';

  if (data.length === 0) {
    return (
      <div
        className={cn(
          'rounded-xl border px-4 py-12 text-center text-sm font-body',
          dark
            ? 'border-white/[0.08] bg-white/[0.02] text-steel'
            : 'border-cloud bg-white text-charcoal/60',
          className,
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border overflow-hidden',
        dark ? 'border-white/[0.08] bg-white/[0.02]' : 'border-cloud bg-white shadow-card',
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm font-body">
          <thead>
            <tr
              className={cn(
                'border-b text-left text-[11px] uppercase tracking-wider font-semibold',
                dark ? 'border-white/[0.06] bg-white/[0.03] text-steel' : 'border-cloud bg-snow text-charcoal/60',
              )}
            >
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={cn('px-4 py-3 whitespace-nowrap', col.headerClassName)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b last:border-b-0 transition-colors',
                  dark ? 'border-white/[0.04] hover:bg-white/[0.03]' : 'border-cloud/80 hover:bg-snow',
                  onRowClick && 'cursor-pointer',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={cn(
                      'px-4 py-3 align-middle',
                      dark ? 'text-silver' : 'text-midnight',
                      col.className,
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
