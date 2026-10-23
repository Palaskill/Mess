/**
 * Format date string to relative time (e.g. 'just now', '5m ago', '2h ago', '3d ago', '1y ago')
 */
export function timeAgo(date: string | Date): string {
  const timestamp = typeof date === 'string' ? new Date(date).getTime() : date.getTime();
  if (isNaN(timestamp)) return '';

  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${Math.max(1, seconds)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

// Currency symbol mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
  TND: 'DT',
  EUR: '€',
  USD: '$',
  GBP: '£',
  MAD: 'DH',
  DZD: 'DA',
  SAR: 'SAR',
  AED: 'AED',
  QAR: 'QAR',
  KWD: 'KWD',
  EGP: 'E£',
};

export function getCurrencySymbol(code?: string): string {
  if (!code) return 'DT';
  return CURRENCY_SYMBOLS[code.toUpperCase()] || code;
}

/**
 * Format currency amount with appropriate decimal places (3 for TND/DT, 2 for others)
 */
export function formatCurrency(amount: number, currency = 'DT'): string {
  const val = amount || 0;
  if (currency === 'DT' || currency === 'TND') {
    return `${val.toFixed(3)} DT`;
  }
  return `${val.toFixed(2)} ${currency}`;
}
