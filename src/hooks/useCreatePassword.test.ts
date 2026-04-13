import { describe, it, expect, vi } from 'vitest';
import { act } from '@testing-library/react';

vi.mock('@tauri-apps/api/core');
vi.mock('@/services/storageService', () => ({
  storageService: {
    createFolder: vi.fn().mockResolvedValue({ id: 'f2', name: 'Work', icon: 'folder', isDefault: false, createdAt: new Date() }),
    getFolders: vi.fn().mockResolvedValue([]),
    getPasswords: vi.fn().mockResolvedValue([]),
  },
}));

import { renderHookWithProviders } from '@/testUtils';
import { useCreatePassword } from './useCreatePassword';
import type { PasswordFormData } from '@/types';

const makeProps = (overrides: Partial<Parameters<typeof useCreatePassword>[0]> = {}) => ({
  onConfirm: vi.fn(),
  ...overrides,
});

describe('useCreatePassword', () => {
  describe('initial state', () => {
    it('initializes with empty fields when no initialData is provided', () => {
      const { result } = renderHookWithProviders(() => useCreatePassword(makeProps()));
      expect(result.current.serviceName).toBe('');
      expect(result.current.username).toBe('');
      expect(result.current.password).toBe('');
      expect(result.current.url).toBe('');
      expect(result.current.notes).toBe('');
      expect(result.current.folder).toBe('');
      expect(result.current.showGenerator).toBe(false);
    });

    it('pre-fills fields from initialData', () => {
      const initialData = {
        id: '1',
        name: 'GitHub',
        username: 'user@example.com',
        email: undefined,
        password: 'secret',
        website: 'https://github.com',
        notes: 'My notes',
        folderId: 'f1',
        isFavorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const { result } = renderHookWithProviders(() =>
        useCreatePassword(makeProps({ initialData }))
      );
      expect(result.current.serviceName).toBe('GitHub');
      expect(result.current.username).toBe('user@example.com');
      expect(result.current.password).toBe('secret');
      expect(result.current.url).toBe('https://github.com');
      expect(result.current.notes).toBe('My notes');
      expect(result.current.folder).toBe('f1');
    });

    it('pre-fills password from initialPassword prop', () => {
      const { result } = renderHookWithProviders(() =>
        useCreatePassword(makeProps({ initialPassword: 'generated123' }))
      );
      expect(result.current.password).toBe('generated123');
    });
  });

  describe('field setters', () => {
    it('updates serviceName', () => {
      const { result } = renderHookWithProviders(() => useCreatePassword(makeProps()));
      act(() => result.current.setServiceName('Spotify'));
      expect(result.current.serviceName).toBe('Spotify');
    });

    it('toggles showGenerator', () => {
      const { result } = renderHookWithProviders(() => useCreatePassword(makeProps()));
      act(() => result.current.setShowGenerator(true));
      expect(result.current.showGenerator).toBe(true);
    });
  });

  describe('handleUseGeneratedPassword', () => {
    it('sets password and hides generator', () => {
      const { result } = renderHookWithProviders(() => useCreatePassword(makeProps()));
      act(() => result.current.setShowGenerator(true));
      act(() => result.current.handleUseGeneratedPassword('newPass!'));
      expect(result.current.password).toBe('newPass!');
      expect(result.current.showGenerator).toBe(false);
    });
  });

  describe('handleSubmit', () => {
    it('calls onConfirm with form data on submit', () => {
      const onConfirm = vi.fn();
      const { result } = renderHookWithProviders(() => useCreatePassword({ onConfirm }));
      act(() => {
        result.current.setServiceName('Netflix');
        result.current.setUsername('user@example.com');
        result.current.setPassword('hunter2');
      });
      const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;
      act(() => result.current.handleSubmit(fakeEvent));
      expect(fakeEvent.preventDefault).toHaveBeenCalled();
      const called = onConfirm.mock.calls[0][0] as PasswordFormData;
      expect(called.serviceName).toBe('Netflix');
      expect(called.username).toBe('user@example.com');
      expect(called.password).toBe('hunter2');
    });
  });

  describe('confirmCreateFolder', () => {
    it('calls createFolder and updates folder state', async () => {
      const { result } = renderHookWithProviders(() => useCreatePassword(makeProps()));
      await act(async () => {
        await result.current.confirmCreateFolder({ name: 'Work', icon: 'folder' });
      });
      expect(result.current.folder).toBe('f2');
    });
  });
});
