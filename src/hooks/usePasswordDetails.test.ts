import { describe, it, expect, vi } from 'vitest';
import { act } from '@testing-library/react';

vi.mock('@tauri-apps/api/core');
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useParams: vi.fn(() => ({ id: 'p1' })) };
});

import { renderHookWithProviders, makePassword, makeFolder } from '@/testUtils';
import { usePasswordDetails } from './usePasswordDetails';
import { allPasswordsAtom, foldersAtom } from '@/store/atoms';

function setup(password = makePassword({ id: 'p1' })) {
  const { result, store } = renderHookWithProviders(() => usePasswordDetails());
  act(() => {
    store.set(allPasswordsAtom, [password]);
    store.set(foldersAtom, [makeFolder({ id: 'f1', name: 'Work', icon: 'briefcase' })]);
  });
  return { result, store };
}

describe('usePasswordDetails', () => {
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
      await act(async () => result.current.copyField('username', 'user'));
      expect(result.current.toastMessage).not.toBe('');
      act(() => vi.advanceTimersByTime(2000));
      expect(result.current.toastMessage).toBe('');
      vi.useRealTimers();
    });
  });

  describe('copyField', () => {
    it('sets copiedField and clears after 1.5s', async () => {
      vi.useFakeTimers();
      const { result } = setup();
      await act(async () => result.current.copyField('username', 'user'));
      expect(result.current.copiedField).toBe('username');
      act(() => vi.advanceTimersByTime(1500));
      expect(result.current.copiedField).toBeNull();
      vi.useRealTimers();
    });

    it('does nothing when value is empty', () => {
      const { result } = setup();
      act(() => result.current.copyField('username', ''));
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
});
