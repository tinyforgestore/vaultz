import { useState, useMemo, useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { foldersAtom, createFolderAtom, deleteFolderAtom } from '@/store/atoms';
import { MAX_FOLDERS } from '@/constants/folders';

export function useFolderManager() {
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isDeleteFolderOpen, setIsDeleteFolderOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [folderLimitAlert, setFolderLimitAlert] = useState('');
  const [folderFilter, setFolderFilter] = useState('');

  const folders = useAtomValue(foldersAtom);
  const createFolder = useSetAtom(createFolderAtom);
  const deleteFolder = useSetAtom(deleteFolderAtom);

  const handleAddFolder = () => {
    if (folders.length >= MAX_FOLDERS) {
      setFolderLimitAlert(`Maximum ${MAX_FOLDERS} folders allowed`);
      return;
    }
    setIsCreateFolderOpen(true);
  };

  const handleDeleteFolder = (folderId: string) => {
    setSelectedFolder(folderId);
    setIsDeleteFolderOpen(true);
  };

  const confirmCreateFolder = async (folderData: { name: string; icon: string }) => {
    try {
      await createFolder(folderData);
      setIsCreateFolderOpen(false);
    } catch (err) {
      console.error('Error creating folder:', err);
    }
  };

  const confirmDeleteFolder = async () => {
    if (!selectedFolder) return;
    try {
      await deleteFolder(selectedFolder);
      setIsDeleteFolderOpen(false);
      setSelectedFolder(null);
    } catch (err) {
      console.error('Error deleting folder:', err);
    }
  };

  const deleteFolderName = useMemo(
    () => folders.find(f => f.id === selectedFolder)?.name ?? selectedFolder ?? '',
    [folders, selectedFolder],
  );

  const filteredFolders = useMemo(() => {
    const query = folderFilter.trim().toLowerCase();
    return query ? folders.filter(f => f.name.toLowerCase().includes(query)) : folders;
  }, [folders, folderFilter]);

  useEffect(() => {
    if (!folderLimitAlert) return;
    const timer = setTimeout(() => setFolderLimitAlert(''), 2000);
    return () => clearTimeout(timer);
  }, [folderLimitAlert]);

  return {
    folders,
    isCreateFolderOpen,
    isDeleteFolderOpen,
    selectedFolder,
    folderLimitAlert,
    folderFilter,
    filteredFolders,
    deleteFolderName,
    setIsCreateFolderOpen,
    setIsDeleteFolderOpen,
    setSelectedFolder,
    setFolderFilter,
    handleAddFolder,
    handleDeleteFolder,
    confirmCreateFolder,
    confirmDeleteFolder,
  };
}
