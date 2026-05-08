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

  describe('handleRecordGenerated', () => {
    it('invokes record_generated_password with the password', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      const mockInvoke = vi.mocked(invoke);
      mockInvoke.mockClear();
      mockInvoke.mockResolvedValue(undefined);
      const { result } = renderHookWithProviders(() => useCreatePassword(makeProps()));
      act(() => result.current.handleRecordGenerated('hunter2'));
      expect(mockInvoke).toHaveBeenCalledWith('record_generated_password', {
        password: 'hunter2',
      });
    });

    it('is a no-op for empty password', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      const mockInvoke = vi.mocked(invoke);
      mockInvoke.mockClear();
      const { result } = renderHookWithProviders(() => useCreatePassword(makeProps()));
      act(() => result.current.handleRecordGenerated(''));
      expect(mockInvoke).not.toHaveBeenCalledWith('record_generated_password', expect.anything());
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

  describe('favicon auto-detection', () => {
    it('auto-derives favicon slug when url changes', () => {
      const { result } = renderHookWithProviders(() => useCreatePassword(makeProps()));
      act(() => result.current.setUrl('https://github.com'));
      expect(result.current.faviconPicker.favicon).toBe('github');
      expect(result.current.faviconPicker.manualOverride).toBe(false);
    });

    it('clears favicon when url is cleared', () => {
      const { result } = renderHookWithProviders(() => useCreatePassword(makeProps()));
      act(() => result.current.setUrl('https://github.com'));
      expect(result.current.faviconPicker.favicon).toBe('github');
      act(() => result.current.setUrl(''));
      expect(result.current.faviconPicker.favicon).toBeNull();
    });

    it('selectFavicon overrides URL-derived slug', () => {
      const { result } = renderHookWithProviders(() => useCreatePassword(makeProps()));
      act(() => result.current.setUrl('https://github.com'));
      act(() => result.current.faviconPicker.selectFavicon('figma'));
      expect(result.current.faviconPicker.favicon).toBe('figma');
      expect(result.current.faviconPicker.manualOverride).toBe(true);
      // URL change does NOT overwrite when overridden.
      act(() => result.current.setUrl('https://google.com'));
      expect(result.current.faviconPicker.favicon).toBe('figma');
    });

    it('resetFaviconToAuto re-syncs to URL', () => {
      const { result } = renderHookWithProviders(() => useCreatePassword(makeProps()));
      act(() => result.current.setUrl('https://github.com'));
      act(() => result.current.faviconPicker.selectFavicon('figma'));
      act(() => result.current.faviconPicker.resetFaviconToAuto());
      expect(result.current.faviconPicker.manualOverride).toBe(false);
      expect(result.current.faviconPicker.favicon).toBe('github');
    });

    it('edit mode with None preserves null across URL change', () => {
      // Regression: previously, manualOverride was init'd from `!!initialData?.favicon`,
      // so an entry saved with favicon=null treated the URL as the source of truth and
      // re-derived a slug on mount. Edit mode must preserve a saved "None" choice.
      const initialData = {
        id: '1',
        name: 'GitHub',
        password: 'secret',
        website: 'https://github.com',
        folderId: 'f1',
        favicon: null as unknown as string | undefined,
        isFavorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const { result } = renderHookWithProviders(() =>
        useCreatePassword(makeProps({ initialData }))
      );
      // None preserved on mount.
      expect(result.current.faviconPicker.favicon).toBeNull();
      expect(result.current.faviconPicker.manualOverride).toBe(true);
      // URL change does NOT clobber None.
      act(() => result.current.setUrl('https://google.com'));
      expect(result.current.faviconPicker.favicon).toBeNull();
    });

    it('edit mode "Auto" reset re-derives from current URL', () => {
      const initialData = {
        id: '1',
        name: 'GitHub',
        password: 'secret',
        website: 'https://github.com',
        folderId: 'f1',
        favicon: 'figma',
        isFavorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const { result } = renderHookWithProviders(() =>
        useCreatePassword(makeProps({ initialData }))
      );
      expect(result.current.faviconPicker.favicon).toBe('figma');
      act(() => result.current.faviconPicker.resetFaviconToAuto());
      expect(result.current.faviconPicker.manualOverride).toBe(false);
      expect(result.current.faviconPicker.favicon).toBe('github');
    });

    it('initialData favicon is treated as a manual override', () => {
      const initialData = {
        id: '1',
        name: 'GitHub',
        password: 'secret',
        website: 'https://github.com',
        folderId: 'f1',
        favicon: 'figma',
        isFavorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const { result } = renderHookWithProviders(() =>
        useCreatePassword(makeProps({ initialData }))
      );
      expect(result.current.faviconPicker.favicon).toBe('figma');
      expect(result.current.faviconPicker.manualOverride).toBe(true);
      // URL is github but override keeps favicon stable.
      act(() => result.current.setUrl('https://google.com'));
      expect(result.current.faviconPicker.favicon).toBe('figma');
    });

    it('handleSubmit includes favicon in payload', () => {
      const onConfirm = vi.fn();
      const { result } = renderHookWithProviders(() => useCreatePassword({ onConfirm }));
      act(() => result.current.setServiceName('GitHub'));
      act(() => result.current.setUsername('u'));
      act(() => result.current.setPassword('p'));
      act(() => result.current.setUrl('https://github.com'));
      const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;
      act(() => result.current.handleSubmit(fakeEvent));
      const called = onConfirm.mock.calls[0][0] as PasswordFormData;
      expect(called.favicon).toBe('github');
    });
  });

  describe('handleCreateFolderConfirm', () => {
    it('calls createFolder, updates folder state, and closes the inline folder modal', async () => {
      const { result } = renderHookWithProviders(() => useCreatePassword(makeProps()));
      act(() => result.current.setIsCreateFolderOpen(true));
      await act(async () => {
        result.current.handleCreateFolderConfirm({ name: 'Work', icon: 'folder' });
        // allow the .then chain to flush
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(result.current.folder).toBe('f2');
      expect(result.current.isCreateFolderOpen).toBe(false);
    });
  });
});
