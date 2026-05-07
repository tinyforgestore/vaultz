/**
 * Returns a short relative-time label like "just now", "2 min ago", "3 h ago",
 * "5 d ago", or — for older values — falls back to a `YYYY-MM-DD` date string.
 *
 * The Rust layer emits `CURRENT_TIMESTAMP` in SQLite's default format
 * (`YYYY-MM-DD HH:MM:SS` in UTC), so we treat naive strings as UTC.
 */
export function formatRelativeTime(input: string, now: Date = new Date()): string {
  if (!input) return '';
  const normalized = input.includes('T') ? input : input.replace(' ', 'T') + 'Z';
  const then = new Date(normalized);
  if (Number.isNaN(then.getTime())) return '';

  const diffMs = now.getTime() - then.getTime();
  if (diffMs < 0) return 'just now';

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 30) return 'just now';
  if (diffSec < 60) return `${diffSec} sec ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} h ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} d ago`;

  return then.toISOString().slice(0, 10);
}
