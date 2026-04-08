import { describe, it, expect, vi } from 'vitest';
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
      mockInvoke.mockResolvedValueOnce(true);
      const { result } = setup();
      act(() => result.current.setIsChangeMasterPasswordOpen(true));
      await act(async () => result.current.confirmChangeMasterPassword('old', 'new'));
      expect(result.current.isChangeMasterPasswordOpen).toBe(false);
    });

    it('keeps modal open on failure', async () => {
      mockInvoke.mockResolvedValueOnce(false);
      const { result } = setup();
      act(() => result.current.setIsChangeMasterPasswordOpen(true));
      await act(async () => result.current.confirmChangeMasterPassword('wrong', 'new'));
      expect(result.current.isChangeMasterPasswordOpen).toBe(true);
    });

    it('calls change_master_password with correct args', async () => {
      mockInvoke.mockResolvedValueOnce(true);
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
      expect(mockInvoke).not.toHaveBeenCalled();
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
