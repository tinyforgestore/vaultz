import { describe, it, expect, vi } from 'vitest';
import { act } from '@testing-library/react';

vi.mock('@tauri-apps/api/core');

import { invoke } from '@tauri-apps/api/core';
import { renderHookWithProviders } from '@/testUtils';
import { useFolderManager } from './useFolderManager';
import { MAX_FOLDERS } from '@/constants/folders';
import type { Folder } from '@/types';

const mockInvoke = vi.mocked(invoke);

const makeFolder = (id: string, name = `Folder ${id}`): Folder => ({
  id,
  name,
  icon: 'folder',
  isDefault: false,
  createdAt: new Date(),
});

describe('useFolderManager', () => {
  describe('handleAddFolder', () => {
    it('opens create modal when under the limit', () => {
      const { result } = renderHookWithProviders(() => useFolderManager());
      act(() => result.current.handleAddFolder());
      expect(result.current.isCreateFolderOpen).toBe(true);
    });

    it('shows limit alert when at MAX_FOLDERS', async () => {
      vi.useFakeTimers();
      const { result } = renderHookWithProviders(() => useFolderManager());
      const fullList = Array.from({ length: MAX_FOLDERS }, (_, i) => makeFolder(`f${i}`));
      mockInvoke.mockResolvedValueOnce(fullList.map(f => ({ ...f, createdAt: f.createdAt.toISOString() })));
      await act(async () => { /* load initial data is not called here; set folders directly via atom */ });
      // Simulate folders being at capacity via the atom store
      const { store } = renderHookWithProviders(() => useFolderManager());
      const { foldersAtom } = await import('@/store/atoms');
      store.set(foldersAtom, fullList);
      const { result: r2 } = renderHookWithProviders(() => useFolderManager(), { store });
      act(() => r2.current.handleAddFolder());
      expect(r2.current.folderLimitAlert).toContain(`${MAX_FOLDERS}`);
      expect(r2.current.isCreateFolderOpen).toBe(false);
      vi.useRealTimers();
    });
  });

  describe('folderLimitAlert', () => {
    it('auto-clears after 2 seconds', async () => {
      vi.useFakeTimers();
      const { store } = renderHookWithProviders(() => useFolderManager());
      const { foldersAtom } = await import('@/store/atoms');
      const fullList = Array.from({ length: MAX_FOLDERS }, (_, i) => makeFolder(`f${i}`));
      store.set(foldersAtom, fullList);
      const { result } = renderHookWithProviders(() => useFolderManager(), { store });
      act(() => result.current.handleAddFolder());
      expect(result.current.folderLimitAlert).not.toBe('');
      act(() => vi.advanceTimersByTime(2000));
      expect(result.current.folderLimitAlert).toBe('');
      vi.useRealTimers();
    });
  });

  describe('handleDeleteFolder', () => {
    it('sets selectedFolder and opens delete modal', () => {
      const { result } = renderHookWithProviders(() => useFolderManager());
      act(() => result.current.handleDeleteFolder('f1'));
      expect(result.current.selectedFolder).toBe('f1');
      expect(result.current.isDeleteFolderOpen).toBe(true);
    });
  });

  describe('confirmCreateFolder', () => {
    it('calls invoke and closes modal on success', async () => {
      const newFolder = makeFolder('f99', 'New');
      mockInvoke.mockResolvedValueOnce({ ...newFolder, createdAt: newFolder.createdAt.toISOString() });
      const { result } = renderHookWithProviders(() => useFolderManager());
      act(() => result.current.setIsCreateFolderOpen(true));
      await act(async () => result.current.confirmCreateFolder({ name: 'New', icon: 'folder' }));
      expect(mockInvoke).toHaveBeenCalledWith('create_folder', { input: { name: 'New', icon: 'folder' } });
      expect(result.current.isCreateFolderOpen).toBe(false);
    });
  });

  describe('confirmDeleteFolder', () => {
    it('does nothing when selectedFolder is null', async () => {
      const { result } = renderHookWithProviders(() => useFolderManager());
      await act(async () => result.current.confirmDeleteFolder());
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('calls invoke and resets state on success', async () => {
      mockInvoke.mockImplementation((cmd: unknown) =>
        cmd === 'get_passwords' ? Promise.resolve([]) : Promise.resolve(undefined)
      );
      const { result } = renderHookWithProviders(() => useFolderManager());
      act(() => result.current.handleDeleteFolder('f1'));
      await act(async () => result.current.confirmDeleteFolder());
      expect(mockInvoke).toHaveBeenCalledWith('delete_folder', { folderId: 'f1' });
      expect(result.current.isDeleteFolderOpen).toBe(false);
      expect(result.current.selectedFolder).toBeNull();
    });
  });

  describe('filteredFolders', () => {
    it('returns all folders when filter is empty', async () => {
      const { store } = renderHookWithProviders(() => useFolderManager());
      const { foldersAtom } = await import('@/store/atoms');
      store.set(foldersAtom, [makeFolder('f1', 'Work'), makeFolder('f2', 'Personal')]);
      const { result } = renderHookWithProviders(() => useFolderManager(), { store });
      expect(result.current.filteredFolders).toHaveLength(2);
    });

    it('filters folders case-insensitively', async () => {
      const { store } = renderHookWithProviders(() => useFolderManager());
      const { foldersAtom } = await import('@/store/atoms');
      store.set(foldersAtom, [makeFolder('f1', 'Work'), makeFolder('f2', 'Personal')]);
      const { result } = renderHookWithProviders(() => useFolderManager(), { store });
      act(() => result.current.setFolderFilter('WORK'));
      expect(result.current.filteredFolders).toHaveLength(1);
      expect(result.current.filteredFolders[0].name).toBe('Work');
    });

    it('returns empty array when no folders match', async () => {
      const { store } = renderHookWithProviders(() => useFolderManager());
      const { foldersAtom } = await import('@/store/atoms');
      store.set(foldersAtom, [makeFolder('f1', 'Work')]);
      const { result } = renderHookWithProviders(() => useFolderManager(), { store });
      act(() => result.current.setFolderFilter('zzz'));
      expect(result.current.filteredFolders).toHaveLength(0);
    });
  });

  describe('deleteFolderName', () => {
    it('returns the folder name when found', async () => {
      const { store } = renderHookWithProviders(() => useFolderManager());
      const { foldersAtom } = await import('@/store/atoms');
      store.set(foldersAtom, [makeFolder('f1', 'Work')]);
      const { result } = renderHookWithProviders(() => useFolderManager(), { store });
      act(() => result.current.handleDeleteFolder('f1'));
      expect(result.current.deleteFolderName).toBe('Work');
    });
  });
});
