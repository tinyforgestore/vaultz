import { describe, it, expect } from 'vitest';
import { formatRelativeTime } from './relativeTime';

const now = new Date('2026-04-28T12:00:00Z');

describe('formatRelativeTime', () => {
  it('returns empty string for empty input', () => {
    expect(formatRelativeTime('', now)).toBe('');
  });

  it('returns empty string for unparseable input', () => {
    expect(formatRelativeTime('not-a-date', now)).toBe('');
  });

  it('returns "just now" for a future timestamp', () => {
    expect(formatRelativeTime('2026-04-28 12:00:30', now)).toBe('just now');
  });

  it('returns "just now" for sub-30-second deltas', () => {
    expect(formatRelativeTime('2026-04-28 11:59:50', now)).toBe('just now');
  });

  it('returns seconds for sub-minute deltas above 30s', () => {
    expect(formatRelativeTime('2026-04-28 11:59:15', now)).toBe('45 sec ago');
  });

  it('returns minutes for sub-hour deltas', () => {
    expect(formatRelativeTime('2026-04-28 11:58:00', now)).toBe('2 min ago');
  });

  it('returns hours for sub-day deltas', () => {
    expect(formatRelativeTime('2026-04-28 09:00:00', now)).toBe('3 h ago');
  });

  it('returns days for sub-week deltas', () => {
    expect(formatRelativeTime('2026-04-25 12:00:00', now)).toBe('3 d ago');
  });

  it('falls back to YYYY-MM-DD for older deltas', () => {
    expect(formatRelativeTime('2026-04-01 12:00:00', now)).toBe('2026-04-01');
  });

  it('parses ISO strings (with T separator) directly', () => {
    expect(formatRelativeTime('2026-04-28T11:55:00Z', now)).toBe('5 min ago');
  });
});
