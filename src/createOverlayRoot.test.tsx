import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('react-dom/client', () => ({
  default: { createRoot: vi.fn(() => ({ render: vi.fn() })) },
}));

import ReactDOMClient from 'react-dom/client';
import { createOverlayRoot } from './createOverlayRoot';

describe('createOverlayRoot', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    // jsdom doesn't ship matchMedia by default — the entry point uses it for
    // initial dark-mode detection.
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
  });

  afterEach(() => {
    document.documentElement.className = '';
  });

  it('throws when #root is missing', () => {
    expect(() => createOverlayRoot(() => <div />)).toThrow(/#root/);
  });

  it('mounts when #root exists and applies a theme class', () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
    const Comp = () => <div data-testid="x" />;
    createOverlayRoot(Comp);
    expect(ReactDOMClient.createRoot).toHaveBeenCalledWith(root);
    // One of light/dark theme class is applied
    expect(document.documentElement.className.length).toBeGreaterThan(0);
  });
});
