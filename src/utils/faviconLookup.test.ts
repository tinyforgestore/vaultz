import { describe, it, expect } from 'vitest';
import { slugFromUrl, slugFromText, lookupIcon, listAvailableSlugs } from './faviconLookup';

describe('slugFromUrl', () => {
  it('extracts slug from https URL', () => {
    expect(slugFromUrl('https://github.com')).toBe('github');
  });

  it('extracts slug from http URL', () => {
    expect(slugFromUrl('http://github.com')).toBe('github');
  });

  it('extracts slug from URL with path', () => {
    expect(slugFromUrl('https://accounts.google.com/x/y')).toBe('google');
  });

  it('extracts slug when scheme is missing', () => {
    expect(slugFromUrl('example.org')).toBe('example');
  });

  it('handles multi-part TLDs (co.uk)', () => {
    expect(slugFromUrl('https://mail.example.co.uk')).toBe('example');
  });

  it('handles multi-part TLDs (com.au)', () => {
    expect(slugFromUrl('https://shop.example.com.au')).toBe('example');
  });

  it('returns null for IPv4', () => {
    expect(slugFromUrl('http://192.168.0.1')).toBeNull();
  });

  it('returns null for IPv6', () => {
    expect(slugFromUrl('http://[::1]')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(slugFromUrl('')).toBeNull();
    expect(slugFromUrl(null)).toBeNull();
    expect(slugFromUrl(undefined)).toBeNull();
    expect(slugFromUrl('   ')).toBeNull();
  });

  it('returns null for single-label hosts', () => {
    expect(slugFromUrl('http://localhost')).toBeNull();
  });

  it('sanitizes non-alphanumeric chars', () => {
    expect(slugFromUrl('https://my-app.com')).toBe('myapp');
  });

  it('returns null when SLD sanitizes to empty', () => {
    // No alphanumerics in SLD — effectively edge case.
    expect(slugFromUrl('https://---.com')).toBeNull();
  });

  it('handles URL with port', () => {
    expect(slugFromUrl('https://github.com:443')).toBe('github');
  });
});

describe('lookupIcon', () => {
  it('returns the icon for a known slug', () => {
    const icon = lookupIcon('github');
    expect(icon).not.toBeNull();
    expect(icon?.slug).toBe('github');
    expect(typeof icon?.path).toBe('string');
    expect(icon?.path.length).toBeGreaterThan(0);
    expect(typeof icon?.hex).toBe('string');
  });

  it('returns null for unknown slug', () => {
    expect(lookupIcon('not-a-real-brand')).toBeNull();
  });

  it('returns null for nullish input', () => {
    expect(lookupIcon(null)).toBeNull();
    expect(lookupIcon(undefined)).toBeNull();
    expect(lookupIcon('')).toBeNull();
  });
});

describe('listAvailableSlugs', () => {
  it('returns all slugs in sorted order', () => {
    const slugs = listAvailableSlugs();
    const sorted = [...slugs].sort();
    expect(slugs).toEqual(sorted);
  });

  it('includes well-known slugs', () => {
    const slugs = listAvailableSlugs();
    expect(slugs).toContain('github');
    expect(slugs).toContain('google');
    expect(slugs).toContain('figma');
  });

  it('returns a non-empty set of slugs', () => {
    expect(listAvailableSlugs().length).toBeGreaterThan(0);
  });

  it('every returned slug resolves via lookupIcon', () => {
    for (const slug of listAvailableSlugs()) {
      expect(lookupIcon(slug)).not.toBeNull();
    }
  });
});

describe('slugFromText', () => {
  it('lowercases and strips non-alphanumeric', () => {
    expect(slugFromText('GitHub')).toBe('github');
    expect(slugFromText('1Password')).toBe('1password');
    expect(slugFromText('Cash App')).toBe('cashapp');
  });

  it('returns null for empty / whitespace-only / unsluggable input', () => {
    expect(slugFromText('')).toBeNull();
    expect(slugFromText(null)).toBeNull();
    expect(slugFromText(undefined)).toBeNull();
    expect(slugFromText('   ')).toBeNull();
    expect(slugFromText('---')).toBeNull();
  });

  it('preserves digits', () => {
    expect(slugFromText('Steam 2024')).toBe('steam2024');
  });
});
