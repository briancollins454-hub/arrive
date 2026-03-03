import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, differenceInDays } from 'date-fns';

/**
 * Merge Tailwind classes safely (handles conflicts)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency with proper locale
 */
/** Currency symbol used across the app — change here to update all labels */
export const CURRENCY_SYMBOL = '£';

export function formatCurrency(amount: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date, fmt = 'dd MMM yyyy'): string {
  return format(new Date(date), fmt);
}

/**
 * Calculate number of nights between two dates
 */
export function calculateNights(checkIn: string | Date, checkOut: string | Date): number {
  return differenceInDays(new Date(checkOut), new Date(checkIn));
}

/**
 * Calculate total booking amount
 */
export function calculateTotal(nightlyRate: number, checkIn: string | Date, checkOut: string | Date): number {
  const nights = calculateNights(checkIn, checkOut);
  return nightlyRate * nights;
}

/**
 * Generate a slug from text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Get status badge variant
 */
export function getStatusVariant(status: string): string {
  const map: Record<string, string> = {
    pending: 'badge-pending',
    confirmed: 'badge-confirmed',
    checked_in: 'badge-checked-in',
    checked_out: 'badge-confirmed',
    cancelled: 'badge-cancelled',
    no_show: 'badge-no-show',
  };
  return map[status] ?? 'badge-pending';
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    checked_in: 'Checked In',
    checked_out: 'Checked Out',
    cancelled: 'Cancelled',
    no_show: 'No Show',
  };
  return map[status] ?? status;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '…';
}
