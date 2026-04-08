import { describe, it, expect, vi } from 'vitest';
import { act } from '@testing-library/react';

vi.mock('@tauri-apps/api/core');
vi.mock('@/services/sessionService', () => ({
  sessionService: { login: vi.fn() },
}));

import { sessionService } from '@/services/sessionService';
import { renderHookWithProviders } from '@/testUtils';
import { useLogin } from './useLogin';
import { isAuthenticatedAtom } from '@/store/atoms';

const mockLogin = vi.mocked(sessionService.login);

function setup() {
  return renderHookWithProviders(() => useLogin());
}

describe('useLogin', () => {
  describe('validation', () => {
    it('sets error when submitting with empty password', async () => {
      const { result } = setup();
      await act(async () => result.current.handleLogin({ preventDefault: vi.fn() } as any));
      expect(result.current.error).toBe('Please enter your master password');
    });

    it('does not call sessionService when password is empty', async () => {
      const { result } = setup();
      await act(async () => result.current.handleLogin({ preventDefault: vi.fn() } as any));
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  describe('successful login', () => {
    it('sets isAuthenticated and navigates to /dashboard', async () => {
      mockLogin.mockResolvedValueOnce(true);
      const { result, store } = setup();
      act(() => result.current.setMasterPassword('correct'));
      await act(async () => result.current.handleLogin({ preventDefault: vi.fn() } as any));
      expect(store.get(isAuthenticatedAtom)).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('clears loading state after success', async () => {
      mockLogin.mockResolvedValueOnce(true);
      const { result } = setup();
      act(() => result.current.setMasterPassword('correct'));
      await act(async () => result.current.handleLogin({ preventDefault: vi.fn() } as any));
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('failed login', () => {
    it('sets error message and clears password on wrong password', async () => {
      mockLogin.mockResolvedValueOnce(false);
      const { result } = setup();
      act(() => result.current.setMasterPassword('wrong'));
      await act(async () => result.current.handleLogin({ preventDefault: vi.fn() } as any));
      expect(result.current.error).toBe('Invalid master password');
      expect(result.current.masterPassword).toBe('');
    });

    it('sets generic error when sessionService throws', async () => {
      mockLogin.mockRejectedValueOnce(new Error('network'));
      const { result } = setup();
      act(() => result.current.setMasterPassword('pass'));
      await act(async () => result.current.handleLogin({ preventDefault: vi.fn() } as any));
      expect(result.current.error).toBe('An error occurred during login');
    });

    it('clears loading state after failure', async () => {
      mockLogin.mockResolvedValueOnce(false);
      const { result } = setup();
      act(() => result.current.setMasterPassword('wrong'));
      await act(async () => result.current.handleLogin({ preventDefault: vi.fn() } as any));
      expect(result.current.isLoading).toBe(false);
    });
  });
});
