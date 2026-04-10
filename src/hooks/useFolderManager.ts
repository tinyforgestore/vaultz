import { useState, useMemo } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { foldersAtom, createFolderAtom, updateFolderAtom, deleteFolderAtom, activeModalAtom } from '@/store/atoms';
import { Folder, CreateFolderInput } from '@/types';
import { LIMIT_REACHED_FOLDERS } from '@/constants/folders';
import { useLimitCheck } from './useLimitCheck';

export function useFolderManager() {
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isDeleteFolderOpen, setIsDeleteFolderOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [folderFilter, setFolderFilter] = useState('');

  const folders = useAtomValue(foldersAtom);
  const createFolder = useSetAtom(createFolderAtom);
  const updateFolder = useSetAtom(updateFolderAtom);
  const deleteFolder = useSetAtom(deleteFolderAtom);
  const setActiveModal = useSetAtom(activeModalAtom);
  const { checkAndOpen } = useLimitCheck();

  const handleAddFolder = () => {
    checkAndOpen('folder', () => setIsCreateFolderOpen(true));
  };

  const handleDeleteFolder = (folderId: string) => {
    setSelectedFolder(folderId);
    setIsDeleteFolderOpen(true);
  };

  const confirmCreateFolder = (folderData: CreateFolderInput) =>
    createFolder(folderData)
      .then(() => setIsCreateFolderOpen(false))
      .catch((err) => {
        const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : JSON.stringify(err);
        if (msg.includes(LIMIT_REACHED_FOLDERS)) {
          setIsCreateFolderOpen(false);
          setActiveModal('upgrade');
        } else {
          console.error('Error creating folder:', err);
        }
      });

  const handleEditFolder = (folder: Folder) => setEditingFolder(folder);
  const handleCancelEdit = () => setEditingFolder(null);

  const confirmEditFolder = (folderData: CreateFolderInput) => {
    if (!editingFolder) return Promise.resolve();
    return updateFolder({ id: editingFolder.id, ...folderData })
      .then(() => setEditingFolder(null))
      .catch((err) => { console.error('Error updating folder:', err); throw err; });
  };

  const confirmDeleteFolder = () => {
    if (!selectedFolder) return;
    deleteFolder(selectedFolder)
      .then(() => {
        setIsDeleteFolderOpen(false);
        setSelectedFolder(null);
      })
      .catch((err) => console.error('Error deleting folder:', err));
  };

  const deleteFolderName = useMemo(
    () => folders.find(f => f.id === selectedFolder)?.name ?? selectedFolder ?? '',
    [folders, selectedFolder],
  );

  const filteredFolders = useMemo(() => {
    const query = folderFilter.trim().toLowerCase();
    return query ? folders.filter(f => f.name.toLowerCase().includes(query)) : folders;
  }, [folders, folderFilter]);

  return {
    folders,
    isCreateFolderOpen,
    isDeleteFolderOpen,
    selectedFolder,
    editingFolder,
    folderFilter,
    filteredFolders,
    deleteFolderName,
    setIsCreateFolderOpen,
    setIsDeleteFolderOpen,
    setSelectedFolder,
    setFolderFilter,
    handleAddFolder,
    handleEditFolder,
    handleCancelEdit,
    handleDeleteFolder,
    confirmCreateFolder,
    confirmEditFolder,
    confirmDeleteFolder,
  };
}
