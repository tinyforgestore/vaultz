import { describe, it, expect } from 'vitest';
import { getAvatarColor, getInitials, AVATAR_COLORS } from './avatar';

describe('getInitials', () => {
  it('returns the first two characters uppercased', () => {
    expect(getInitials('GitHub')).toBe('GI');
  });

  it('uppercases lowercase input', () => {
    expect(getInitials('amazon')).toBe('AM');
  });

  it('returns a single char when name has length 1', () => {
    expect(getInitials('A')).toBe('A');
  });

  it('returns empty string for empty input', () => {
    expect(getInitials('')).toBe('');
  });
});

describe('getAvatarColor', () => {
  it('returns a valid color from the palette', () => {
    const color = getAvatarColor('GitHub');
    expect(AVATAR_COLORS).toContain(color);
  });

  it('returns a consistent color for the same name', () => {
    expect(getAvatarColor('Spotify')).toBe(getAvatarColor('Spotify'));
  });

  it('returns a color even for a single-character name', () => {
    const color = getAvatarColor('X');
    expect(AVATAR_COLORS).toContain(color);
  });

  it('returns a color for an empty string (charCode 0 path)', () => {
    const color = getAvatarColor('');
    expect(AVATAR_COLORS).toContain(color);
  });
});
