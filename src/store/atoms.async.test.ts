import { describe, it, expect, vi } from 'vitest';
import { createStore } from 'jotai';

vi.mock('@tauri-apps/api/core');

import { invoke } from '@tauri-apps/api/core';
import {
  allPasswordsAtom,
  foldersAtom,
  selectedFolderAtom,
  selectedPasswordIdsAtom,
  favoriteAlertAtom,
  isAuthenticatedAtom,
  loadInitialDataAtom,
  createPasswordAtom,
  updatePasswordAtom,
  deletePasswordAtom,
  toggleFavoriteAtom,
  createFolderAtom,
  deleteFolderAtom,
  bulkDeleteAtom,
  bulkToggleFavoriteAtom,
  logoutAtom,
  changeMasterPasswordAtom,
} from './atoms';
import { SPECIAL_FOLDERS } from '@/constants/folders';
import type { Password, Folder } from '@/types';

const mockInvoke = vi.mocked(invoke);

const makePassword = (id: string, overrides: Partial<Password> = {}): Password => ({
  id,
  name: `Password ${id}`,
  username: 'user',
  password: 'secret',
  isFavorite: false,
  folderId: 'f1',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeFolder = (id: string): Folder => ({
  id,
  name: `Folder ${id}`,
  icon: 'folder',
  isDefault: false,
  createdAt: new Date(),
});

const raw = (p: Password) => ({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() });
const rawFolder = (f: Folder) => ({ ...f, createdAt: f.createdAt.toISOString() });

function store() {
  return createStore();
}

describe('loadInitialDataAtom', () => {
  it('populates folders and passwords from storageService', async () => {
    const s = store();
    const folders = [makeFolder('f1')];
    const passwords = [makePassword('p1')];
    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'get_folders') return Promise.resolve(folders.map(rawFolder));
      if (cmd === 'get_passwords') return Promise.resolve(passwords.map(raw));
      return Promise.resolve(undefined);
    });
    await s.set(loadInitialDataAtom);
    expect(s.get(foldersAtom)).toHaveLength(1);
    expect(s.get(allPasswordsAtom)).toHaveLength(1);
  });
});

describe('createPasswordAtom', () => {
  it('appends new password to allPasswordsAtom', async () => {
    const s = store();
    const newPw = makePassword('p1');
    mockInvoke.mockResolvedValueOnce(raw(newPw));
    await s.set(createPasswordAtom, { serviceName: 'GitHub', username: 'u', password: 'p' });
    expect(s.get(allPasswordsAtom)).toHaveLength(1);
    expect(s.get(allPasswordsAtom)[0].id).toBe('p1');
  });
});

describe('updatePasswordAtom', () => {
  it('replaces the updated password in the list', async () => {
    const s = store();
    const original = makePassword('p1', { name: 'Old' });
    const updated = makePassword('p1', { name: 'New' });
    s.set(allPasswordsAtom, [original]);
    mockInvoke.mockResolvedValueOnce(raw(updated));
    await s.set(updatePasswordAtom, { id: 'p1', updates: { name: 'New' } });
    expect(s.get(allPasswordsAtom)[0].name).toBe('New');
  });
});

describe('deletePasswordAtom', () => {
  it('removes the password from the list', async () => {
    const s = store();
    s.set(allPasswordsAtom, [makePassword('p1'), makePassword('p2')]);
    mockInvoke.mockResolvedValueOnce(undefined);
    await s.set(deletePasswordAtom, 'p1');
    const ids = s.get(allPasswordsAtom).map(p => p.id);
    expect(ids).not.toContain('p1');
    expect(ids).toContain('p2');
  });
});

describe('toggleFavoriteAtom', () => {
  it('toggles isFavorite on the target password', async () => {
    const s = store();
    const pw = makePassword('p1', { isFavorite: false });
    const updated = makePassword('p1', { isFavorite: true });
    s.set(allPasswordsAtom, [pw]);
    mockInvoke.mockResolvedValueOnce(raw(updated));
    await s.set(toggleFavoriteAtom, 'p1');
    expect(s.get(allPasswordsAtom)[0].isFavorite).toBe(true);
  });

  it('sets favoriteAlertAtom when folder limit reached', async () => {
    const s = store();
    const favs = [
      makePassword('p1', { isFavorite: true, folderId: 'f1' }),
      makePassword('p2', { isFavorite: true, folderId: 'f1' }),
      makePassword('p3', { isFavorite: false, folderId: 'f1' }),
    ];
    s.set(allPasswordsAtom, favs);
    await s.set(toggleFavoriteAtom, 'p3');
    expect(s.get(favoriteAlertAtom)).toContain('Maximum');
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('does nothing for unknown id', async () => {
    const s = store();
    s.set(allPasswordsAtom, [makePassword('p1')]);
    await s.set(toggleFavoriteAtom, 'unknown');
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

describe('createFolderAtom', () => {
  it('appends new folder to foldersAtom', async () => {
    const s = store();
    const newFolder = makeFolder('f1');
    mockInvoke.mockResolvedValueOnce(rawFolder(newFolder));
    await s.set(createFolderAtom, { name: 'Work', icon: 'briefcase' });
    expect(s.get(foldersAtom)).toHaveLength(1);
    expect(s.get(foldersAtom)[0].id).toBe('f1');
  });
});

describe('deleteFolderAtom', () => {
  it('removes folder and reloads passwords', async () => {
    const s = store();
    s.set(foldersAtom, [makeFolder('f1'), makeFolder('f2')]);
    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'get_passwords') return Promise.resolve([]);
      return Promise.resolve(undefined);
    });
    await s.set(deleteFolderAtom, 'f1');
    const ids = s.get(foldersAtom).map(f => f.id);
    expect(ids).not.toContain('f1');
    expect(ids).toContain('f2');
  });
});

describe('bulkDeleteAtom', () => {
  it('deletes selected passwords and clears selection', async () => {
    const s = store();
    s.set(allPasswordsAtom, [makePassword('p1'), makePassword('p2'), makePassword('p3')]);
    s.set(selectedPasswordIdsAtom, new Set(['p1', 'p2']));
    mockInvoke.mockResolvedValueOnce(undefined);
    await s.set(bulkDeleteAtom);
    const ids = s.get(allPasswordsAtom).map(p => p.id);
    expect(ids).toEqual(['p3']);
    expect(s.get(selectedPasswordIdsAtom).size).toBe(0);
  });

  it('does nothing when selection is empty', async () => {
    const s = store();
    s.set(allPasswordsAtom, [makePassword('p1')]);
    await s.set(bulkDeleteAtom);
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

describe('bulkToggleFavoriteAtom', () => {
  it('favorites all selected passwords', async () => {
    const s = store();
    const p1 = makePassword('p1', { isFavorite: false });
    const p2 = makePassword('p2', { isFavorite: false });
    s.set(allPasswordsAtom, [p1, p2]);
    s.set(selectedPasswordIdsAtom, new Set(['p1', 'p2']));
    mockInvoke.mockImplementation((cmd: unknown, args: unknown) => {
      const { updates } = args as { id: string; updates: Partial<Password> };
      return Promise.resolve(raw({ ...p1, ...updates }));
    });
    await s.set(bulkToggleFavoriteAtom, true);
    expect(s.get(selectedPasswordIdsAtom).size).toBe(0);
  });

  it('sets favoriteAlertAtom when limit is reached for some', async () => {
    const s = store();
    const existing = [
      makePassword('p1', { isFavorite: true, folderId: 'f1' }),
      makePassword('p2', { isFavorite: true, folderId: 'f1' }),
      makePassword('p3', { isFavorite: false, folderId: 'f1' }),
    ];
    s.set(allPasswordsAtom, existing);
    s.set(selectedPasswordIdsAtom, new Set(['p3']));
    await s.set(bulkToggleFavoriteAtom, true);
    expect(s.get(favoriteAlertAtom)).toContain('max');
  });

  it('does nothing when selection is empty', async () => {
    const s = store();
    await s.set(bulkToggleFavoriteAtom, true);
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

describe('logoutAtom', () => {
  it('resets auth, passwords, folder selection, and search', () => {
    const s = store();
    s.set(isAuthenticatedAtom, true);
    s.set(allPasswordsAtom, [makePassword('p1')]);
    s.set(selectedFolderAtom, 'f1');
    s.set(logoutAtom);
    expect(s.get(isAuthenticatedAtom)).toBe(false);
    expect(s.get(allPasswordsAtom)).toHaveLength(0);
    expect(s.get(selectedFolderAtom)).toBe(SPECIAL_FOLDERS.ALL.toString());
  });
});

describe('changeMasterPasswordAtom', () => {
  it('delegates to storageService and returns result', async () => {
    const s = store();
    mockInvoke.mockResolvedValueOnce(true);
    const result = await s.set(changeMasterPasswordAtom, { currentPassword: 'old', newPassword: 'new' });
    expect(mockInvoke).toHaveBeenCalledWith('change_master_password', { currentPassword: 'old', newPassword: 'new' });
    expect(result).toBe(true);
  });
});
