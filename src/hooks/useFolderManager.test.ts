import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';

vi.mock('@tauri-apps/api/core');

import { invoke } from '@tauri-apps/api/core';
import { renderHookWithProviders, makeFolder } from '@/testUtils';
import { useFolderManager } from './useFolderManager';

const mockInvoke = vi.mocked(invoke);

describe('useFolderManager', () => {
  afterEach(() => vi.clearAllMocks());
  describe('handleAddFolder', () => {
    beforeEach(() => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'check_limit_status') {
          return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
        }
        return Promise.resolve(undefined);
      });
    });

    it('opens create modal when under the limit', async () => {
      const { result } = renderHookWithProviders(() => useFolderManager());
      await act(async () => result.current.handleAddFolder());
      expect(result.current.isCreateFolderOpen).toBe(true);
    });

    it('opens upgrade modal when folders_at_limit is true (free user)', async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'check_limit_status') {
          return Promise.resolve({ passwords_at_limit: false, folders_at_limit: true });
        }
        return Promise.resolve(undefined);
      });
      const { result, store } = renderHookWithProviders(() => useFolderManager());
      const { activeModalAtom } = await import('@/store/atoms');
      await act(async () => result.current.handleAddFolder());
      expect(store.get(activeModalAtom)).toBe('upgrade');
      expect(result.current.isCreateFolderOpen).toBe(false);
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
      const newFolder = makeFolder({ id: 'f99', name: 'New' });
      mockInvoke.mockResolvedValueOnce({ ...newFolder, createdAt: newFolder.createdAt.toISOString() });
      const { result } = renderHookWithProviders(() => useFolderManager());
      act(() => result.current.setIsCreateFolderOpen(true));
      await act(async () => result.current.confirmCreateFolder({ name: 'New', icon: 'folder' }));
      expect(mockInvoke).toHaveBeenCalledWith('create_folder', { input: { name: 'New', icon: 'folder' } });
      expect(result.current.isCreateFolderOpen).toBe(false);
    });

    it('closes modal and opens upgrade modal when limit is reached', async () => {
      const { LIMIT_REACHED_FOLDERS } = await import('@/constants/folders');
      mockInvoke.mockRejectedValueOnce(new Error(LIMIT_REACHED_FOLDERS));
      const { result, store } = renderHookWithProviders(() => useFolderManager());
      const { activeModalAtom } = await import('@/store/atoms');
      act(() => result.current.setIsCreateFolderOpen(true));
      await act(async () => result.current.confirmCreateFolder({ name: 'New', icon: 'folder' }));
      expect(result.current.isCreateFolderOpen).toBe(false);
      expect(store.get(activeModalAtom)).toBe('upgrade');
    });

    it('keeps modal open and logs when a non-limit error occurs', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('DB error'));
      const { result } = renderHookWithProviders(() => useFolderManager());
      act(() => result.current.setIsCreateFolderOpen(true));
      await act(async () => result.current.confirmCreateFolder({ name: 'New', icon: 'folder' }));
      expect(result.current.isCreateFolderOpen).toBe(true);
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

    it('keeps modal open and logs when delete_folder rejects', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('delete failed'));
      const { result } = renderHookWithProviders(() => useFolderManager());
      act(() => result.current.handleDeleteFolder('f1'));
      await act(async () => result.current.confirmDeleteFolder());
      expect(result.current.isDeleteFolderOpen).toBe(true);
      expect(result.current.selectedFolder).toBe('f1');
    });
  });

  describe('filteredFolders', () => {
    it('returns all folders when filter is empty', async () => {
      const { store } = renderHookWithProviders(() => useFolderManager());
      const { foldersAtom } = await import('@/store/atoms');
      store.set(foldersAtom, [makeFolder({ id: 'f1', name: 'Work' }), makeFolder({ id: 'f2', name: 'Personal' })]);
      const { result } = renderHookWithProviders(() => useFolderManager(), { store });
      expect(result.current.filteredFolders).toHaveLength(2);
    });

    it('filters folders case-insensitively', async () => {
      const { store } = renderHookWithProviders(() => useFolderManager());
      const { foldersAtom } = await import('@/store/atoms');
      store.set(foldersAtom, [makeFolder({ id: 'f1', name: 'Work' }), makeFolder({ id: 'f2', name: 'Personal' })]);
      const { result } = renderHookWithProviders(() => useFolderManager(), { store });
      act(() => result.current.setFolderFilter('WORK'));
      expect(result.current.filteredFolders).toHaveLength(1);
      expect(result.current.filteredFolders[0].name).toBe('Work');
    });

    it('returns empty array when no folders match', async () => {
      const { store } = renderHookWithProviders(() => useFolderManager());
      const { foldersAtom } = await import('@/store/atoms');
      store.set(foldersAtom, [makeFolder({ id: 'f1', name: 'Work' })]);
      const { result } = renderHookWithProviders(() => useFolderManager(), { store });
      act(() => result.current.setFolderFilter('zzz'));
      expect(result.current.filteredFolders).toHaveLength(0);
    });
  });

  describe('handleEditFolder / confirmEditFolder', () => {
    it('sets editingFolder when handleEditFolder is called', () => {
      const folder = makeFolder({ id: 'f1', name: 'Work' });
      const { result } = renderHookWithProviders(() => useFolderManager());
      act(() => result.current.handleEditFolder(folder));
      expect(result.current.editingFolder).toEqual(folder);
    });

    it('clears editingFolder when handleCancelEdit is called', () => {
      const folder = makeFolder({ id: 'f1', name: 'Work' });
      const { result } = renderHookWithProviders(() => useFolderManager());
      act(() => result.current.handleEditFolder(folder));
      act(() => result.current.handleCancelEdit());
      expect(result.current.editingFolder).toBeNull();
    });

    it('calls invoke and clears editingFolder on success', async () => {
      const folder = makeFolder({ id: 'f1', name: 'Work' });
      const updated = { ...folder, name: 'Updated', createdAt: folder.createdAt.toISOString() };
      mockInvoke.mockResolvedValueOnce(updated);
      const { result } = renderHookWithProviders(() => useFolderManager());
      act(() => result.current.handleEditFolder(folder));
      await act(async () => result.current.confirmEditFolder({ name: 'Updated', icon: 'star' }));
      expect(mockInvoke).toHaveBeenCalledWith('update_folder', {
        folderId: 'f1',
        input: { name: 'Updated', icon: 'star' },
      });
      expect(result.current.editingFolder).toBeNull();
    });

    it('does nothing when editingFolder is null', async () => {
      const { result } = renderHookWithProviders(() => useFolderManager());
      await act(async () => result.current.confirmEditFolder({ name: 'X', icon: 'folder' }));
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('re-throws when update_folder rejects', async () => {
      const folder = makeFolder({ id: 'f1', name: 'Work' });
      mockInvoke.mockRejectedValueOnce(new Error('update failed'));
      const { result } = renderHookWithProviders(() => useFolderManager());
      act(() => result.current.handleEditFolder(folder));
      await expect(
        act(async () => result.current.confirmEditFolder({ name: 'Updated', icon: 'folder' }))
      ).rejects.toThrow('update failed');
    });
  });

  describe('deleteFolderName', () => {
    it('returns the folder name when found', async () => {
      const { store } = renderHookWithProviders(() => useFolderManager());
      const { foldersAtom } = await import('@/store/atoms');
      store.set(foldersAtom, [makeFolder({ id: 'f1', name: 'Work' })]);
      const { result } = renderHookWithProviders(() => useFolderManager(), { store });
      act(() => result.current.handleDeleteFolder('f1'));
      expect(result.current.deleteFolderName).toBe('Work');
    });
  });
});
