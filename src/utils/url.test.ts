import { describe, it, expect } from 'vitest';
import { normalizeUrl } from './url';

describe('normalizeUrl', () => {
  it('returns empty string for empty input', () => {
    expect(normalizeUrl('')).toBe('');
  });

  it('trims and returns empty for whitespace-only input', () => {
    expect(normalizeUrl('   ')).toBe('');
  });

  it('prepends https:// to bare domain', () => {
    expect(normalizeUrl('google.com')).toBe('https://google.com');
  });

  it('prepends https:// to www domain', () => {
    expect(normalizeUrl('www.example.org')).toBe('https://www.example.org');
  });

  it('prepends https:// to domain with path', () => {
    expect(normalizeUrl('example.com/api/v1')).toBe('https://example.com/api/v1');
  });

  it('prepends https:// to localhost with port', () => {
    expect(normalizeUrl('localhost:3000')).toBe('https://localhost:3000');
  });

  it('prepends https:// to IP address', () => {
    expect(normalizeUrl('192.168.1.1')).toBe('https://192.168.1.1');
  });

  it('trims whitespace before normalizing', () => {
    expect(normalizeUrl('  google.com  ')).toBe('https://google.com');
  });

  it('leaves https:// URLs unchanged', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('leaves http:// URLs unchanged', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('leaves uppercase HTTP:// URLs unchanged (case-insensitive guard)', () => {
    expect(normalizeUrl('HTTP://example.com')).toBe('HTTP://example.com');
  });

  it('leaves ftp:// URLs unchanged', () => {
    expect(normalizeUrl('ftp://files.example.com')).toBe('ftp://files.example.com');
  });

  it('prepends https:// to bare word (URL constructor treats it as a hostname)', () => {
    expect(normalizeUrl('somerandomstring')).toBe('https://somerandomstring');
  });
});
