import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { createStore } from 'jotai';
import { loadInitialDataAtom } from './init';
import { foldersAtom } from './folders';
import { allPasswordsAtom } from './passwords';
import { makeFolder, makePassword } from '@/testUtils';

vi.mock('@tauri-apps/api/core');

vi.mock('@/services/storageService', () => ({
  storageService: {
    getFolders: vi.fn(),
    getPasswords: vi.fn(),
  },
}));

import { storageService } from '@/services/storageService';
import { invoke } from '@tauri-apps/api/core';
import { licenseStatusAtom } from './license';

const mockInvoke = vi.mocked(invoke);
const mockGetFolders = vi.mocked(storageService.getFolders);
const mockGetPasswords = vi.mocked(storageService.getPasswords);

describe('loadInitialDataAtom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'get_license_status') return Promise.resolve({ is_active: true });
      if (cmd === 'validate_license') return Promise.resolve(true);
      return Promise.resolve(undefined);
    });
  });

  it('sets foldersAtom and allPasswordsAtom from service results (happy path)', async () => {
    const folders = [makeFolder({ id: 'f1', name: 'Work' })];
    const passwords = [makePassword({ id: 'p1', name: 'GitHub' })];

    mockGetFolders.mockResolvedValue(folders);
    mockGetPasswords.mockResolvedValue(passwords);

    const store = createStore();

    await act(async () => {
      await store.set(loadInitialDataAtom);
    });

    expect(store.get(foldersAtom)).toEqual(folders);
    expect(store.get(allPasswordsAtom)).toEqual(passwords);
  });

  it('calls both getFolders and getPasswords exactly once', async () => {
    mockGetFolders.mockResolvedValue([]);
    mockGetPasswords.mockResolvedValue([]);

    const store = createStore();

    await act(async () => {
      await store.set(loadInitialDataAtom);
    });

    expect(mockGetFolders).toHaveBeenCalledTimes(1);
    expect(mockGetPasswords).toHaveBeenCalledTimes(1);
  });

  it('refreshes the license status after loading vault data', async () => {
    mockGetFolders.mockResolvedValue([]);
    mockGetPasswords.mockResolvedValue([]);

    const store = createStore();

    await act(async () => {
      await store.set(loadInitialDataAtom);
    });

    expect(mockInvoke).toHaveBeenCalledWith('get_license_status');
    expect(mockInvoke).toHaveBeenCalledWith('validate_license');
    expect(store.get(licenseStatusAtom)).toEqual({ is_active: true });
  });

  it('does not reject, and does not downgrade the license, when the refresh fails', async () => {
    mockGetFolders.mockResolvedValue([]);
    mockGetPasswords.mockResolvedValue([]);
    mockInvoke.mockRejectedValue(new Error('offline'));

    const store = createStore();
    // Pre-seed so the assertion is not vacuous: the atom starts out null anyway.
    store.set(licenseStatusAtom, { is_active: true });

    await act(async () => {
      await expect(store.set(loadInitialDataAtom)).resolves.toBeUndefined();
    });

    // Unlocking while offline must not turn a Pro user into a Free one.
    expect(store.get(licenseStatusAtom)).toEqual({ is_active: true });
  });
});
