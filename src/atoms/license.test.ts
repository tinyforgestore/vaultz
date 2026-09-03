import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { createStore } from 'jotai';

vi.mock('@tauri-apps/api/core');

import { invoke } from '@tauri-apps/api/core';
import { licenseStatusAtom, refreshLicenseAtom, resetLicenseAtom } from './license';

const mockInvoke = vi.mocked(invoke);

describe('refreshLicenseAtom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets licenseStatus from get_license_status, then chains validate_license and re-fetches', async () => {
    const calls: string[] = [];
    mockInvoke.mockImplementation((cmd: unknown) => {
      calls.push(cmd as string);
      if (cmd === 'get_license_status') {
        // Second fetch reflects the counts stored by validate_license.
        return Promise.resolve(
          calls.filter((c) => c === 'get_license_status').length === 1
            ? { is_active: true }
            : { is_active: true, activation_usage: 1, activation_limit: 3 }
        );
      }
      if (cmd === 'validate_license') return Promise.resolve(true);
      return Promise.resolve(undefined);
    });

    const store = createStore();
    await act(async () => {
      await store.set(refreshLicenseAtom);
    });

    expect(calls).toEqual(['get_license_status', 'validate_license', 'get_license_status']);
    expect(store.get(licenseStatusAtom)).toEqual({
      is_active: true,
      activation_usage: 1,
      activation_limit: 3,
    });
  });

  it('keeps a known-good status when the initial get_license_status rejects', async () => {
    // A transient IPC failure is not evidence that the license lapsed. Nulling
    // here would flip a user who is showing Pro straight to Free with upgrade
    // prompts — and would defeat the `=== null` guard on the write one line up.
    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'get_license_status') return Promise.reject(new Error('db error'));
      return Promise.resolve(undefined);
    });

    const store = createStore();
    store.set(licenseStatusAtom, { is_active: true, activation_usage: 1, activation_limit: 3 });

    await act(async () => {
      await store.set(refreshLicenseAtom);
    });

    expect(store.get(licenseStatusAtom)).toEqual({
      is_active: true,
      activation_usage: 1,
      activation_limit: 3,
    });
  });

  it('leaves the status null when the initial get_license_status rejects and nothing is known', async () => {
    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'get_license_status') return Promise.reject(new Error('db error'));
      return Promise.resolve(undefined);
    });

    const store = createStore();

    await act(async () => {
      await store.set(refreshLicenseAtom);
    });

    expect(store.get(licenseStatusAtom)).toBeNull();
  });

  it('still re-fetches the status when validate_license rejects (offline tolerance)', async () => {
    // The two fetches return *different* values on purpose: if stage 3 were
    // skipped the atom would keep stage 1's value and this assertion would fail.
    let statusCalls = 0;
    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'get_license_status') {
        statusCalls += 1;
        return Promise.resolve(
          statusCalls === 1
            ? { is_active: true }
            : { is_active: true, activation_usage: 2, activation_limit: 5 }
        );
      }
      if (cmd === 'validate_license') return Promise.reject(new Error('network error'));
      return Promise.resolve(undefined);
    });

    const store = createStore();
    await act(async () => {
      await store.set(refreshLicenseAtom);
    });

    expect(mockInvoke).toHaveBeenCalledWith('validate_license');
    expect(statusCalls).toBe(2);
    expect(store.get(licenseStatusAtom)).toEqual({
      is_active: true,
      activation_usage: 2,
      activation_limit: 5,
    });
  });

  it('keeps the status set by the initial fetch when the second fetch rejects', async () => {
    let statusCalls = 0;
    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'get_license_status') {
        statusCalls += 1;
        return statusCalls === 1
          ? Promise.resolve({ is_active: true })
          : Promise.reject(new Error('db error'));
      }
      if (cmd === 'validate_license') return Promise.resolve(true);
      return Promise.resolve(undefined);
    });

    const store = createStore();
    await act(async () => {
      await store.set(refreshLicenseAtom);
    });

    expect(store.get(licenseStatusAtom)).toEqual({ is_active: true });
  });

  it('shares one chain between concurrent refreshes instead of racing', async () => {
    const calls: string[] = [];
    mockInvoke.mockImplementation((cmd: unknown) => {
      calls.push(cmd as string);
      if (cmd === 'get_license_status') return Promise.resolve({ is_active: true });
      if (cmd === 'validate_license') return Promise.resolve(true);
      return Promise.resolve(undefined);
    });

    const store = createStore();
    await act(async () => {
      const first = store.set(refreshLicenseAtom);
      const second = store.set(refreshLicenseAtom);
      expect(second).toBe(first);
      await Promise.all([first, second]);
    });

    expect(calls).toEqual(['get_license_status', 'validate_license', 'get_license_status']);
  });

  it('does not let a stale pre-validate result clobber a known status', async () => {
    // Stage 1 only writes while the status is still unknown, so a stale
    // pre-validate value can never overwrite a value already on the atom. Stage 3
    // rejects here, so whatever stage 1 did (or did not do) is the final state.
    let statusCalls = 0;
    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'get_license_status') {
        statusCalls += 1;
        return statusCalls === 1
          ? Promise.resolve({ is_active: false })
          : Promise.reject(new Error('db error'));
      }
      if (cmd === 'validate_license') return Promise.resolve(true);
      return Promise.resolve(undefined);
    });

    const store = createStore();
    store.set(licenseStatusAtom, { is_active: true, activation_usage: 1, activation_limit: 3 });

    await act(async () => {
      await store.set(refreshLicenseAtom);
    });

    expect(store.get(licenseStatusAtom)).toEqual({
      is_active: true,
      activation_usage: 1,
      activation_limit: 3,
    });
  });

  it('allows a fresh chain after the previous one settles', async () => {
    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'get_license_status') return Promise.resolve({ is_active: true });
      if (cmd === 'validate_license') return Promise.resolve(true);
      return Promise.resolve(undefined);
    });

    const store = createStore();
    await act(async () => {
      await store.set(refreshLicenseAtom);
    });
    const afterFirst = mockInvoke.mock.calls.length;
    await act(async () => {
      await store.set(refreshLicenseAtom);
    });
    expect(mockInvoke.mock.calls.length).toBeGreaterThan(afterFirst);
  });

  it('resolves without throwing when every invoke rejects, keeping the last known status', async () => {
    mockInvoke.mockRejectedValue(new Error('boom'));

    const store = createStore();
    store.set(licenseStatusAtom, { is_active: true });

    await act(async () => {
      await expect(store.set(refreshLicenseAtom)).resolves.toBeUndefined();
    });

    expect(store.get(licenseStatusAtom)).toEqual({ is_active: true });
  });

  describe('resetLicenseAtom', () => {
    it('clears the status', async () => {
      const store = createStore();
      store.set(licenseStatusAtom, { is_active: true });

      store.set(resetLicenseAtom);

      expect(store.get(licenseStatusAtom)).toBeNull();
    });

    it('abandons an in-flight chain so it cannot repopulate the status after logout', async () => {
      let releaseFirstStatus: (value: unknown) => void = () => {};
      let statusCalls = 0;
      mockInvoke.mockImplementation((cmd: unknown) => {
        if (cmd === 'get_license_status') {
          statusCalls += 1;
          // Only the first read is held open; later ones resolve immediately so
          // the chain can run to completion after the reset.
          if (statusCalls === 1) {
            return new Promise((resolve) => {
              releaseFirstStatus = resolve;
            });
          }
          return Promise.resolve({ is_active: true });
        }
        if (cmd === 'validate_license') return Promise.resolve(true);
        return Promise.resolve(undefined);
      });

      const store = createStore();
      let chain: Promise<void> | undefined;
      act(() => {
        chain = store.set(refreshLicenseAtom) as Promise<void>;
      });

      // Logout lands while the first get_license_status is still pending.
      store.set(resetLicenseAtom);

      await act(async () => {
        releaseFirstStatus({ is_active: true });
        await chain;
      });

      expect(store.get(licenseStatusAtom)).toBeNull();
    });

    it('lets a new chain start after a reset', async () => {
      mockInvoke.mockImplementation((cmd: unknown) => {
        if (cmd === 'get_license_status') return Promise.resolve({ is_active: true });
        if (cmd === 'validate_license') return Promise.resolve(true);
        return Promise.resolve(undefined);
      });

      const store = createStore();
      await act(async () => {
        await store.set(refreshLicenseAtom);
      });
      store.set(resetLicenseAtom);
      const afterReset = mockInvoke.mock.calls.length;

      await act(async () => {
        await store.set(refreshLicenseAtom);
      });

      expect(mockInvoke.mock.calls.length).toBeGreaterThan(afterReset);
      expect(store.get(licenseStatusAtom)).toEqual({ is_active: true });
    });
  });
});
