export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatTime(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Value for `<input type="datetime-local" />` in the user's local timezone. */
export function toDatetimeLocalValue(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
