import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from '@testing-library/react';

vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/plugin-clipboard-manager');
vi.mock('@/services/sessionService', () => ({
  sessionService: { logout: vi.fn() },
}));

import { invoke } from '@tauri-apps/api/core';
import { renderHookWithProviders, makePassword, makeFolder } from '@/testUtils';
import { useDashboard } from './useDashboard';
import {
  allPasswordsAtom,
  foldersAtom,
  selectedFolderAtom,
  isAuthenticatedAtom,
  activeModalAtom,
  licenseStatusAtom,
} from '@/store/atoms';
import { SPECIAL_FOLDERS, LIMIT_REACHED_PASSWORDS, LIMIT_REACHED_FOLDERS } from '@/constants/folders';

const mockInvoke = vi.mocked(invoke);

function setup() {
  mockInvoke.mockImplementation((cmd: unknown) => {
    if (cmd === 'get_folders') return Promise.resolve([]);
    if (cmd === 'get_passwords') return Promise.resolve([]);
    if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
    return Promise.resolve(undefined);
  });
  return renderHookWithProviders(() => useDashboard());
}

describe('useDashboard', () => {
  afterEach(() => vi.clearAllMocks());
  describe('data loading', () => {
    it('calls loadInitialData on mount', async () => {
      setup();
      await act(async () => {});
      expect(mockInvoke).toHaveBeenCalledWith('get_folders');
      expect(mockInvoke).toHaveBeenCalledWith('get_passwords', { folderId: null });
    });
  });

  describe('visibleFolders', () => {
    it('hides Favorites tab when there are no favorites', async () => {
      const pw = makePassword({ id: 'p1', isFavorite: false });
      mockInvoke.mockImplementation((cmd: unknown) => {
        if (cmd === 'get_folders') return Promise.resolve([]);
        if (cmd === 'get_passwords') return Promise.resolve([{ ...pw, createdAt: pw.createdAt.toISOString(), updatedAt: pw.updatedAt.toISOString() }]);
        return Promise.resolve(undefined);
      });
      const { result } = renderHookWithProviders(() => useDashboard());
      await act(async () => {});
      const ids = result.current.visibleFolders.map(f => f.id);
      expect(ids).not.toContain(SPECIAL_FOLDERS.FAVORITES.toString());
    });

    it('shows Favorites tab when at least one password is favorited', async () => {
      const pw = makePassword({ id: 'p1', isFavorite: true });
      mockInvoke.mockImplementation((cmd: unknown) => {
        if (cmd === 'get_folders') return Promise.resolve([]);
        if (cmd === 'get_passwords') return Promise.resolve([{ ...pw, createdAt: pw.createdAt.toISOString(), updatedAt: pw.updatedAt.toISOString() }]);
        return Promise.resolve(undefined);
      });
      const { result } = renderHookWithProviders(() => useDashboard());
      await act(async () => {});
      const ids = result.current.visibleFolders.map(f => f.id);
      expect(ids).toContain(SPECIAL_FOLDERS.FAVORITES.toString());
    });
  });

  describe('auto-deselect Favorites', () => {
    it('switches to All when selected folder is Favorites and count drops to 0', async () => {
      const favPw = makePassword({ id: 'p1', isFavorite: true });
      const rawFav = { ...favPw, createdAt: favPw.createdAt.toISOString(), updatedAt: favPw.updatedAt.toISOString() };
      mockInvoke.mockImplementation((cmd: unknown) => {
        if (cmd === 'get_folders') return Promise.resolve([]);
        if (cmd === 'get_passwords') return Promise.resolve([rawFav]);
        return Promise.resolve(undefined);
      });
      const { result, store } = renderHookWithProviders(() => useDashboard());
      await act(async () => {});
      await act(async () => { store.set(selectedFolderAtom, SPECIAL_FOLDERS.FAVORITES.toString()); });
      expect(result.current.selectedFolder).toBe(SPECIAL_FOLDERS.FAVORITES.toString());
      // Remove the favorite — count drops to 0
      await act(async () => {
        const nonFav = makePassword({ id: 'p1', isFavorite: false });
        store.set(allPasswordsAtom, [nonFav]);
      });
      expect(result.current.selectedFolder).toBe(SPECIAL_FOLDERS.ALL.toString());
    });
  });

  describe('showFolderTag', () => {
    it('is true when a special folder is selected', async () => {
      const { result, store } = setup();
      await act(async () => {
        store.set(selectedFolderAtom, SPECIAL_FOLDERS.ALL.toString());
      });
      expect(result.current.showFolderTag).toBe(true);
    });

    it('is false when a regular folder is selected', async () => {
      const { result, store } = setup();
      await act(async () => {
        store.set(foldersAtom, [makeFolder({ id: 'f1' })]);
        store.set(selectedFolderAtom, 'f1');
      });
      expect(result.current.showFolderTag).toBe(false);
    });
  });

  describe('logout', () => {
    it('clears isAuthenticated and resets folder selection', async () => {
      const { result, store } = setup();
      store.set(isAuthenticatedAtom, true);
      await act(async () => result.current.confirmLogout());
      expect(store.get(isAuthenticatedAtom)).toBe(false);
    });
  });

  describe('password creation', () => {
    it('handleCreatePassword opens the modal', async () => {
      const { result } = setup();
      await act(async () => result.current.handleCreatePassword());
      expect(result.current.isCreatePasswordOpen).toBe(true);
    });

    it('confirmCreatePassword closes the modal', async () => {
      const pw = makePassword({ id: 'p1' });
      mockInvoke.mockImplementation((cmd: unknown) => {
        if (cmd === 'get_folders') return Promise.resolve([]);
        if (cmd === 'get_passwords') return Promise.resolve([]);
        if (cmd === 'create_password') return Promise.resolve({
          ...pw,
          createdAt: pw.createdAt.toISOString(),
          updatedAt: pw.updatedAt.toISOString(),
        });
        return Promise.resolve(undefined);
      });
      const { result } = renderHookWithProviders(() => useDashboard());
      act(() => result.current.handleCreatePassword());
      await act(async () => result.current.confirmCreatePassword({
        serviceName: 'GitHub', username: 'u', password: 'p',
      }));
      expect(result.current.isCreatePasswordOpen).toBe(false);
    });

    it('confirmCreatePassword opens upgrade modal when limit reached', async () => {
      mockInvoke.mockImplementation((cmd: unknown) => {
        if (cmd === 'get_folders') return Promise.resolve([]);
        if (cmd === 'get_passwords') return Promise.resolve([]);
        if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
        if (cmd === 'create_password') return Promise.reject(new Error(LIMIT_REACHED_PASSWORDS));
        return Promise.resolve(undefined);
      });
      const { result, store } = renderHookWithProviders(() => useDashboard());
      act(() => result.current.handleCreatePassword());
      await act(async () => result.current.confirmCreatePassword({ serviceName: 'GitHub', username: 'u', password: 'p' }));
      expect(result.current.isCreatePasswordOpen).toBe(false);
      expect(store.get(activeModalAtom)).toBe('upgrade');
    });

    it('confirmCreatePassword re-throws non-limit errors', async () => {
      mockInvoke.mockImplementation((cmd: unknown) => {
        if (cmd === 'get_folders') return Promise.resolve([]);
        if (cmd === 'get_passwords') return Promise.resolve([]);
        if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
        if (cmd === 'create_password') return Promise.reject(new Error('DB error'));
        return Promise.resolve(undefined);
      });
      const { result } = renderHookWithProviders(() => useDashboard());
      act(() => result.current.handleCreatePassword());
      await expect(
        act(async () => result.current.confirmCreatePassword({ serviceName: 'GitHub', username: 'u', password: 'p' }))
      ).rejects.toThrow('DB error');
    });
  });

  describe('folder creation', () => {
    it('confirmCreateFolder opens upgrade modal when limit reached', async () => {
      mockInvoke.mockImplementation((cmd: unknown) => {
        if (cmd === 'get_folders') return Promise.resolve([]);
        if (cmd === 'get_passwords') return Promise.resolve([]);
        if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
        if (cmd === 'create_folder') return Promise.reject(new Error(LIMIT_REACHED_FOLDERS));
        return Promise.resolve(undefined);
      });
      const { result, store } = renderHookWithProviders(() => useDashboard());
      act(() => result.current.handleAddFolder());
      await act(async () => result.current.confirmCreateFolder({ name: 'Work', icon: 'folder' }));
      expect(result.current.isCreateFolderOpen).toBe(false);
      expect(store.get(activeModalAtom)).toBe('upgrade');
    });

    it('confirmCreateFolder re-throws non-limit errors', async () => {
      mockInvoke.mockImplementation((cmd: unknown) => {
        if (cmd === 'get_folders') return Promise.resolve([]);
        if (cmd === 'get_passwords') return Promise.resolve([]);
        if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
        if (cmd === 'create_folder') return Promise.reject(new Error('DB error'));
        return Promise.resolve(undefined);
      });
      const { result } = renderHookWithProviders(() => useDashboard());
      act(() => result.current.handleAddFolder());
      await expect(
        act(async () => result.current.confirmCreateFolder({ name: 'Work', icon: 'folder' }))
      ).rejects.toThrow('DB error');
    });
  });

  describe('license status', () => {
    it('sets licenseStatus to null when get_license_status rejects', async () => {
      mockInvoke.mockImplementation((cmd: unknown) => {
        if (cmd === 'get_folders') return Promise.resolve([]);
        if (cmd === 'get_passwords') return Promise.resolve([]);
        if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
        if (cmd === 'get_license_status') return Promise.reject(new Error('network error'));
        return Promise.resolve(undefined);
      });
      const { store } = renderHookWithProviders(() => useDashboard());
      await act(async () => {});
      expect(store.get(licenseStatusAtom)).toBeNull();
    });
  });
});
