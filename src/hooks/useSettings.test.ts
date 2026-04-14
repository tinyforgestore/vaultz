import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';

vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/plugin-dialog');

import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { renderHookWithProviders } from '@/testUtils';
import { useSettings } from './useSettings';
import { isAuthenticatedAtom } from '@/store/atoms';

const mockInvoke = vi.mocked(invoke);
const mockSave = vi.mocked(save);

function setup() {
  return renderHookWithProviders(() => useSettings());
}

describe('useSettings', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
    mockInvoke.mockResolvedValue(null);
  });

  describe('lockTimeout', () => {
    it('calls get_lock_timeout on mount and sets lockTimeout state', async () => {
      mockInvoke.mockImplementation((cmd: string) =>
        cmd === 'get_lock_timeout' ? Promise.resolve(15) : Promise.resolve(null)
      );
      const { result } = setup();
      await act(async () => {});
      expect(mockInvoke).toHaveBeenCalledWith('get_lock_timeout');
      expect(result.current.lockTimeout).toBe(15);
    });

    it('sets lockTimeout to null when get_lock_timeout returns null (Never)', async () => {
      mockInvoke.mockImplementation((cmd: string) =>
        cmd === 'get_lock_timeout' ? Promise.resolve(null) : Promise.resolve(null)
      );
      const { result } = setup();
      await act(async () => {});
      expect(result.current.lockTimeout).toBeNull();
    });

    it('handleSetLockTimeout calls set_lock_timeout and updates state', async () => {
      mockInvoke.mockImplementation((cmd: string) =>
        cmd === 'set_lock_timeout' ? Promise.resolve(undefined) : Promise.resolve(null)
      );
      const { result } = setup();
      await act(async () => result.current.handleSetLockTimeout(30));
      expect(mockInvoke).toHaveBeenCalledWith('set_lock_timeout', { minutes: 30 });
      expect(result.current.lockTimeout).toBe(30);
      expect(result.current.lockTimeoutError).toBeNull();
    });

    it('handleSetLockTimeout with null sets lockTimeout to null (Never)', async () => {
      mockInvoke.mockImplementation((cmd: string) =>
        cmd === 'set_lock_timeout' ? Promise.resolve(undefined) : Promise.resolve(null)
      );
      const { result } = setup();
      await act(async () => result.current.handleSetLockTimeout(null));
      expect(mockInvoke).toHaveBeenCalledWith('set_lock_timeout', { minutes: null });
      expect(result.current.lockTimeout).toBeNull();
      expect(result.current.lockTimeoutError).toBeNull();
    });

    it('handleSetLockTimeout does not update lockTimeout when invoke rejects', async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_lock_timeout') return Promise.resolve(15);
        if (cmd === 'set_lock_timeout') return Promise.reject(new Error('DB error'));
        return Promise.resolve(null);
      });
      const { result } = renderHookWithProviders(() => useSettings());
      await act(async () => {}); // flush useEffect
      await act(async () => { result.current.handleSetLockTimeout(30); });
      await act(async () => {}); // flush promise
      expect(result.current.lockTimeout).toBe(15);
      expect(result.current.lockTimeoutError).toBe('Failed to save lock timeout');
    });

    it('lockTimeout stays null when get_lock_timeout fails on mount', async () => {
      mockInvoke.mockRejectedValue(new Error('DB unavailable'));
      const { result } = renderHookWithProviders(() => useSettings());
      await act(async () => {});
      expect(result.current.lockTimeout).toBeNull();
    });
  });
  describe('modal openers', () => {
    it('handleChangeMasterPassword opens modal', () => {
      const { result } = setup();
      act(() => result.current.handleChangeMasterPassword());
      expect(result.current.isChangeMasterPasswordOpen).toBe(true);
    });

    it('handleExportVault opens modal', () => {
      const { result } = setup();
      act(() => result.current.handleExportVault());
      expect(result.current.isExportVaultOpen).toBe(true);
    });

    it('handleDestroyVault opens modal', () => {
      const { result } = setup();
      act(() => result.current.handleDestroyVault());
      expect(result.current.isDestroyVaultOpen).toBe(true);
    });
  });

  describe('confirmChangeMasterPassword', () => {
    it('closes modal on success', async () => {
      mockInvoke.mockImplementation((cmd: string) =>
        cmd === 'change_master_password' ? Promise.resolve(true) : Promise.resolve(null)
      );
      const { result } = setup();
      act(() => result.current.setIsChangeMasterPasswordOpen(true));
      await act(async () => result.current.confirmChangeMasterPassword('old', 'new'));
      expect(result.current.isChangeMasterPasswordOpen).toBe(false);
    });

    it('keeps modal open on failure', async () => {
      mockInvoke.mockImplementation((cmd: string) =>
        cmd === 'change_master_password' ? Promise.resolve(false) : Promise.resolve(null)
      );
      const { result } = setup();
      act(() => result.current.setIsChangeMasterPasswordOpen(true));
      await act(async () => result.current.confirmChangeMasterPassword('wrong', 'new'));
      expect(result.current.isChangeMasterPasswordOpen).toBe(true);
    });

    it('calls change_master_password with correct args', async () => {
      mockInvoke.mockImplementation((cmd: string) =>
        cmd === 'change_master_password' ? Promise.resolve(true) : Promise.resolve(null)
      );
      const { result } = setup();
      await act(async () => result.current.confirmChangeMasterPassword('old', 'new'));
      expect(mockInvoke).toHaveBeenCalledWith('change_master_password', {
        currentPassword: 'old',
        newPassword: 'new',
      });
    });
  });

  describe('confirmExportVault', () => {
    it('calls export_vault and closes modal when path selected', async () => {
      mockSave.mockResolvedValueOnce('/path/vault.pmvault');
      mockInvoke.mockResolvedValueOnce(undefined);
      const { result } = setup();
      act(() => result.current.setIsExportVaultOpen(true));
      await act(async () => result.current.confirmExportVault('passphrase'));
      expect(mockInvoke).toHaveBeenCalledWith('export_vault', {
        passphrase: 'passphrase',
        path: '/path/vault.pmvault',
      });
      expect(result.current.isExportVaultOpen).toBe(false);
    });

    it('does nothing when user cancels file dialog', async () => {
      mockSave.mockResolvedValueOnce(null);
      const { result } = setup();
      act(() => result.current.setIsExportVaultOpen(true));
      await act(async () => result.current.confirmExportVault('passphrase'));
      expect(mockInvoke).not.toHaveBeenCalledWith('export_vault', expect.anything());
      expect(result.current.isExportVaultOpen).toBe(true);
    });
  });

  describe('confirmDestroyVault', () => {
    it('calls destroy_vault and logs out', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      const { result, store } = setup();
      store.set(isAuthenticatedAtom, true);
      await act(async () => result.current.confirmDestroyVault());
      expect(mockInvoke).toHaveBeenCalledWith('destroy_vault');
      expect(store.get(isAuthenticatedAtom)).toBe(false);
    });
  });
});
