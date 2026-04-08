import { describe, it, expect, vi } from 'vitest';
import { act } from '@testing-library/react';

vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/plugin-dialog');
vi.mock('@/services/sessionService', () => ({
  sessionService: { login: vi.fn() },
}));

import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { renderHookWithProviders } from '@/testUtils';
import { useLoginPage } from './useLoginPage';

const mockInvoke = vi.mocked(invoke);
const mockOpen = vi.mocked(open);

function setup() {
  mockInvoke.mockImplementation((cmd: unknown) => {
    if (cmd === 'database_exists') return Promise.resolve(true);
    return Promise.resolve(undefined);
  });
  return renderHookWithProviders(() => useLoginPage());
}

describe('useLoginPage', () => {
  describe('database check on mount', () => {
    it('checks database_exists and sets isDatabaseExist', async () => {
      mockInvoke.mockImplementation((cmd: unknown) => {
        if (cmd === 'database_exists') return Promise.resolve(true);
        return Promise.resolve(undefined);
      });
      const { result } = renderHookWithProviders(() => useLoginPage());
      await act(async () => {});
      expect(result.current.isDatabaseExist).toBe(true);
      expect(result.current.isCheckingDatabase).toBe(false);
    });

    it('sets isDatabaseExist to false when db does not exist', async () => {
      mockInvoke.mockImplementation((cmd: unknown) => {
        if (cmd === 'database_exists') return Promise.resolve(false);
        return Promise.resolve(undefined);
      });
      const { result } = renderHookWithProviders(() => useLoginPage());
      await act(async () => {});
      expect(result.current.isDatabaseExist).toBe(false);
    });
  });

  describe('handleImportVault', () => {
    it('sets importFilePath when user selects a file', async () => {
      const { result } = setup();
      await act(async () => {});
      mockOpen.mockResolvedValueOnce('/path/to/vault.pmvault');
      await act(async () => result.current.handleImportVault());
      expect(result.current.importFilePath).toBe('/path/to/vault.pmvault');
    });

    it('does not set importFilePath when user cancels', async () => {
      const { result } = setup();
      await act(async () => {});
      mockOpen.mockResolvedValueOnce(null);
      await act(async () => result.current.handleImportVault());
      expect(result.current.importFilePath).toBeNull();
    });
  });

  describe('confirmImportVault', () => {
    it('calls import_vault and sets isDatabaseExist on success', async () => {
      const { result } = setup();
      await act(async () => {});
      mockInvoke.mockResolvedValueOnce(undefined);
      act(() => result.current.setImportFilePath('/vault.pmvault'));
      await act(async () => result.current.confirmImportVault('passphrase'));
      expect(mockInvoke).toHaveBeenCalledWith('import_vault', {
        passphrase: 'passphrase',
        path: '/vault.pmvault',
      });
      expect(result.current.isDatabaseExist).toBe(true);
      expect(result.current.importFilePath).toBeNull();
    });
  });

  describe('handleCreateMasterPassword', () => {
    it('shows loading modal on success then transitions to isDatabaseExist', async () => {
      vi.useFakeTimers();
      mockInvoke.mockImplementation((cmd: unknown) => {
        if (cmd === 'database_exists') return Promise.resolve(false);
        if (cmd === 'initialize_database') return Promise.resolve(undefined);
        return Promise.resolve(undefined);
      });
      const { result } = renderHookWithProviders(() => useLoginPage());
      await act(async () => {});
      act(() => {
        result.current.createMasterPassword.setPassword('strongpass1');
        result.current.createMasterPassword.setConfirmPassword('strongpass1');
      });
      await act(async () => result.current.handleCreateMasterPassword());
      expect(result.current.showLoadingModal).toBe(true);
      act(() => vi.advanceTimersByTime(500));
      expect(result.current.showLoadingModal).toBe(false);
      expect(result.current.isDatabaseExist).toBe(true);
      vi.useRealTimers();
    });
  });

  describe('shaking on login error', () => {
    it('sets shaking when login error appears and clears after 400ms', async () => {
      vi.useFakeTimers();
      const { sessionService } = await import('@/services/sessionService');
      vi.mocked(sessionService.login).mockResolvedValueOnce(false);
      const { result } = setup();
      await act(async () => {});
      act(() => result.current.setMasterPassword('wrong'));
      await act(async () => result.current.handleLogin({ preventDefault: vi.fn() } as any));
      expect(result.current.shaking).toBe(true);
      act(() => vi.advanceTimersByTime(400));
      expect(result.current.shaking).toBe(false);
      vi.useRealTimers();
    });
  });
});
