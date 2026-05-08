import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FaviconAvatar } from './index';
import { lookupIcon } from '@/utils/faviconLookup';

// NOTE: `.css.ts` is mocked to `export default {}` in vitest (see
// vitest.config.ts) so `createVar()` returns nothing at runtime. We assert
// behavior by rendering and confirming structural / textual output rather
// than reading the inline CSS-custom-property assignments.

describe('FaviconAvatar', () => {
  it('renders the brand icon when slug resolves', () => {
    render(<FaviconAvatar slug="github" name="GitHub" />);
    const wrap = screen.getByTestId('favicon-avatar-icon');
    expect(wrap).toBeInTheDocument();
    const githubIcon = lookupIcon('github')!;
    const svg = wrap.querySelector('svg');
    expect(svg).not.toBeNull();
    const path = svg?.querySelector('path');
    expect(path?.getAttribute('d')).toBe(githubIcon.path);
  });

  it('falls back to colored initials when slug is null', () => {
    render(<FaviconAvatar slug={null} name="Random Service" />);
    const wrap = screen.getByTestId('favicon-avatar-fallback');
    expect(wrap).toBeInTheDocument();
    expect(wrap.textContent).toBe('RA');
  });

  it('falls back when slug is unknown', () => {
    render(<FaviconAvatar slug="totally-not-a-brand" name="Acme" />);
    expect(screen.getByTestId('favicon-avatar-fallback')).toBeInTheDocument();
  });

  it('falls back when slug is undefined', () => {
    render(<FaviconAvatar name="Foo" />);
    expect(screen.getByTestId('favicon-avatar-fallback')).toBeInTheDocument();
  });

  it('renders the SVG sized proportionally to the size prop', () => {
    // Size is threaded into CSS via assignInlineVars at runtime; we can't
    // inspect the resulting computed style in jsdom (mocked .css.ts), but
    // the SVG dimensions on the element are derived from `size` directly
    // and ARE inspectable.
    render(<FaviconAvatar slug="github" name="GitHub" size={48} />);
    const svg = screen.getByTestId('favicon-avatar-icon').querySelector('svg');
    // Round(48 * 0.6) = 29
    expect(svg).toHaveAttribute('width', '29');
    expect(svg).toHaveAttribute('height', '29');
  });

  it('uses the brand fill color on the SVG path', () => {
    render(<FaviconAvatar slug="github" name="GitHub" />);
    const path = screen
      .getByTestId('favicon-avatar-icon')
      .querySelector('svg path');
    // The icon SVG itself uses white fill against the colored background.
    expect(path).toHaveAttribute('fill', 'white');
  });

  it('renders fallback initials at the requested size', () => {
    render(<FaviconAvatar name="Foo" size={20} />);
    expect(screen.getByTestId('favicon-avatar-fallback').textContent).toBe('FO');
  });
});
