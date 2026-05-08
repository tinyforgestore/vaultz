import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from '@testing-library/react';

vi.mock('@tauri-apps/api/core');
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useParams: vi.fn(() => ({ id: 'p1' })) };
});

import { renderHookWithProviders, makePassword, makeFolder } from '@/testUtils';
import { usePasswordDetails } from './usePasswordDetails';
import { allPasswordsAtom, foldersAtom, favoriteAlertAtom } from '@/store/atoms';

function setup(password = makePassword({ id: 'p1' })) {
  const { result, store } = renderHookWithProviders(() => usePasswordDetails());
  act(() => {
    store.set(allPasswordsAtom, [password]);
    store.set(foldersAtom, [makeFolder({ id: 'f1', name: 'Work', icon: 'briefcase' })]);
  });
  return { result, store };
}

describe('usePasswordDetails', () => {
  afterEach(() => vi.clearAllMocks());
  describe('derived state', () => {
    it('derives password from allPasswordsAtom via useParams id', () => {
      const { result } = setup();
      expect(result.current.password?.id).toBe('p1');
    });

    it('returns null when password is not found', () => {
      const { result, store } = renderHookWithProviders(() => usePasswordDetails());
      store.set(allPasswordsAtom, []);
      expect(result.current.password).toBeNull();
    });

    it('derives folderName from foldersAtom', () => {
      const { result } = setup();
      expect(result.current.folderName).toBe('Work');
    });
  });

  describe('toast', () => {
    it('toastMessage is empty initially', () => {
      const { result } = setup();
      expect(result.current.toastMessage).toBe('');
    });

    it('auto-clears toastMessage after 2 seconds', async () => {
      vi.useFakeTimers();
      const { result } = setup();
      await act(async () => result.current.copyToClipboard('username', 'user'));
      expect(result.current.toastMessage).not.toBe('');
      act(() => vi.advanceTimersByTime(2000));
      expect(result.current.toastMessage).toBe('');
      vi.useRealTimers();
    });
  });

  describe('copyToClipboard', () => {
    it('sets copiedField and clears after 1.5s', async () => {
      vi.useFakeTimers();
      const { result } = setup();
      await act(async () => result.current.copyToClipboard('username', 'user'));
      expect(result.current.copiedField).toBe('username');
      act(() => vi.advanceTimersByTime(1500));
      expect(result.current.copiedField).toBeNull();
      vi.useRealTimers();
    });

    it('does nothing when value is empty', () => {
      const { result } = setup();
      act(() => result.current.copyToClipboard('username', ''));
      expect(result.current.copiedField).toBeNull();
    });
  });

  describe('confirmEdit', () => {
    it('calls updatePassword and closes modal', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      const mockInvoke = vi.mocked(invoke);
      const updated = makePassword({ name: 'Updated' });
      mockInvoke.mockResolvedValueOnce({
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      });
      const { result } = setup();
      act(() => result.current.setIsEditModalOpen(true));
      await act(async () => result.current.confirmEdit({
        serviceName: 'Updated', username: 'u', password: 'p', url: '', notes: '', folder: 'f1',
      }));
      expect(result.current.isEditModalOpen).toBe(false);
    });

    it('passes favicon: null through to update_password (clear-on-edit)', async () => {
      // Regression for C1: previously `favicon ?? undefined` collapsed null to
      // undefined, which Tauri's serializer drops. With the tri-state on the
      // Rust side we now MUST send `null` explicitly so the column can be
      // cleared.
      const { invoke } = await import('@tauri-apps/api/core');
      const mockInvoke = vi.mocked(invoke);
      const updated = makePassword({ favicon: undefined });
      mockInvoke.mockResolvedValueOnce({
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      });
      const { result } = setup();
      await act(async () => result.current.confirmEdit({
        serviceName: 'X', username: 'u', password: 'p', url: '', notes: '', folder: 'f1',
        favicon: null,
      }));
      const calls = mockInvoke.mock.calls.filter((c) => c[0] === 'update_password');
      expect(calls.length).toBeGreaterThan(0);
      const arg = calls[0][1] as { updates: { favicon: unknown } };
      expect(arg.updates.favicon).toBeNull();
    });

    it('passes favicon: <slug> through to update_password', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      const mockInvoke = vi.mocked(invoke);
      const updated = makePassword({ favicon: 'github' });
      mockInvoke.mockResolvedValueOnce({
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      });
      const { result } = setup();
      await act(async () => result.current.confirmEdit({
        serviceName: 'X', username: 'u', password: 'p', url: '', notes: '', folder: 'f1',
        favicon: 'github',
      }));
      const calls = mockInvoke.mock.calls.filter((c) => c[0] === 'update_password');
      const arg = calls[0][1] as { updates: { favicon: unknown } };
      expect(arg.updates.favicon).toBe('github');
    });

    it('shows error toast when update_password rejects', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      const mockInvoke = vi.mocked(invoke);
      mockInvoke.mockRejectedValueOnce(new Error('update failed'));
      const { result } = setup();
      act(() => result.current.setIsEditModalOpen(true));
      await act(async () => result.current.confirmEdit({
        serviceName: 'Updated', username: 'u', password: 'p', url: '', notes: '', folder: 'f1',
      }));
      expect(result.current.toastMessage).toBe('Failed to update password');
      expect(result.current.toastVariant).toBe('error');
    });
  });

  describe('confirmDelete', () => {
    it('calls deletePassword and closes modal', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      const mockInvoke = vi.mocked(invoke);
      mockInvoke.mockResolvedValueOnce(undefined);
      const { result } = setup();
      act(() => result.current.setIsDeleteModalOpen(true));
      await act(async () => result.current.confirmDelete());
      expect(mockInvoke).toHaveBeenCalledWith('delete_password', { id: 'p1' });
      expect(result.current.isDeleteModalOpen).toBe(false);
    });
  });

  describe('handleToggleFavorite', () => {
    it('calls toggleFavorite with the current passwordId', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      const mockInvoke = vi.mocked(invoke);
      const pw = makePassword({ id: 'p1', isFavorite: false });
      mockInvoke.mockResolvedValueOnce({
        ...pw,
        isFavorite: true,
        createdAt: pw.createdAt.toISOString(),
        updatedAt: pw.updatedAt.toISOString(),
      });
      const { result } = setup(pw);
      await act(async () => result.current.handleToggleFavorite());
      expect(mockInvoke).toHaveBeenCalledWith('update_password', expect.objectContaining({ id: 'p1' }));
    });
  });

  describe('favoriteAlert effect', () => {
    it('shows toast and clears favoriteAlert when it is set', async () => {
      const { result, store } = setup();
      await act(async () => {
        store.set(favoriteAlertAtom, 'Max favorites reached');
      });
      expect(result.current.toastMessage).toBe('Max favorites reached');
      expect(result.current.toastVariant).toBe('success');
      expect(store.get(favoriteAlertAtom)).toBe('');
    });
  });
});
