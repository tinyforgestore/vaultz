import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';

vi.mock('@tauri-apps/api/core');

import { invoke } from '@tauri-apps/api/core';
import { renderHookWithProviders, createTestStore } from '@/testUtils';
import { useLicenseRefreshOnFocus } from './useLicenseRefreshOnFocus';
import { licenseStatusAtom } from '@/atoms/license';
import { isAuthenticatedAtom } from '@/atoms/session';

const mockInvoke = vi.mocked(invoke);

/**
 * The hook only listens while the vault is unlocked, so every case that expects
 * a refresh has to render against an authenticated store.
 */
function renderAuthenticated() {
  const store = createTestStore();
  store.set(isAuthenticatedAtom, true);
  return renderHookWithProviders(() => useLicenseRefreshOnFocus(), { store });
}

function licenseCalls() {
  return mockInvoke.mock.calls
    .map(([cmd]) => cmd as string)
    .filter((cmd) => cmd === 'get_license_status' || cmd === 'validate_license');
}

describe('useLicenseRefreshOnFocus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // `isAuthenticatedAtom` is an `atomWithStorage`, so a `true` written by one
    // test would otherwise leak into the unauthenticated case via localStorage.
    localStorage.clear();
    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'get_license_status') return Promise.resolve({ is_active: true });
      if (cmd === 'validate_license') return Promise.resolve(true);
      return Promise.resolve(undefined);
    });
  });

  it('does not refresh on mount alone — the unlock path already did', async () => {
    renderAuthenticated();
    await act(async () => {});
    expect(licenseCalls()).toEqual([]);
  });

  it('runs the full refresh chain when the window regains focus', async () => {
    const { store } = renderAuthenticated();

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(licenseCalls()).toEqual([
      'get_license_status',
      'validate_license',
      'get_license_status',
    ]);
    expect(store.get(licenseStatusAtom)).toEqual({ is_active: true });
  });

  it('does not refresh on blur', async () => {
    renderAuthenticated();

    await act(async () => {
      window.dispatchEvent(new Event('blur'));
    });

    expect(licenseCalls()).toEqual([]);
  });

  it('removes its focus listener on unmount', async () => {
    const { unmount } = renderAuthenticated();
    unmount();

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(licenseCalls()).toEqual([]);
  });

  it('shares the in-flight chain when a focus event races an ongoing refresh', async () => {
    // refreshLicenseAtom memoizes the chain while it is in flight, so two focus
    // events in the same tick (or a focus racing the unlock refresh) must not
    // produce two rounds of IPC.
    renderAuthenticated();

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('focus'));
    });

    expect(licenseCalls()).toEqual([
      'get_license_status',
      'validate_license',
      'get_license_status',
    ]);
  });

  it('refreshes again on a later focus once the previous chain has settled', async () => {
    renderAuthenticated();

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    const afterFirst = licenseCalls().length;

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(licenseCalls().length).toBeGreaterThan(afterFirst);
  });

  it('does not refresh on focus while unauthenticated', async () => {
    // The backend commands only take `DbState`, so they would happily talk to
    // Lemon Squeezy over a locked vault — the gate is what stops them.
    renderHookWithProviders(() => useLicenseRefreshOnFocus());

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(licenseCalls()).toEqual([]);
  });

  it('refreshes on focus once authenticated', async () => {
    const store = createTestStore();
    const { rerender } = renderHookWithProviders(() => useLicenseRefreshOnFocus(), { store });

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(licenseCalls()).toEqual([]);

    await act(async () => {
      store.set(isAuthenticatedAtom, true);
    });
    rerender();

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(licenseCalls()).toEqual([
      'get_license_status',
      'validate_license',
      'get_license_status',
    ]);
  });
});
