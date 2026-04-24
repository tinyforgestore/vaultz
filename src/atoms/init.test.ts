import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { createStore } from 'jotai';
import { loadInitialDataAtom } from './init';
import { foldersAtom } from './folders';
import { allPasswordsAtom } from './passwords';
import { makeFolder, makePassword } from '@/testUtils';

vi.mock('@/services/storageService', () => ({
  storageService: {
    getFolders: vi.fn(),
    getPasswords: vi.fn(),
  },
}));

import { storageService } from '@/services/storageService';

const mockGetFolders = vi.mocked(storageService.getFolders);
const mockGetPasswords = vi.mocked(storageService.getPasswords);

describe('loadInitialDataAtom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
