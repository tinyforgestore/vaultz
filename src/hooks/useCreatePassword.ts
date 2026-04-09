import { useState, useEffect } from 'react';
import { Password, CreateFolderInput } from '@/types';
import { normalizeUrl } from '@/utils/url';
import { useCreateFolder } from './useCreateFolder';

interface UseCreatePasswordProps {
  onConfirm: (passwordData: any) => void;
  onCancel: () => void;
  initialPassword?: string;
  initialData?: Password;
}

export function useCreatePassword({ onConfirm, onCancel, initialPassword = '', initialData }: UseCreatePasswordProps) {
  const [serviceName, setServiceName] = useState(initialData?.name || '');
  const [username, setUsername] = useState(initialData?.username || initialData?.email || '');
  const [password, setPassword] = useState(initialPassword || initialData?.password || '');
  const [url, setUrl] = useState(initialData?.website || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [folder, setFolder] = useState(initialData?.folderId || '');
  const [showGenerator, setShowGenerator] = useState(false);

  const { confirmCreateFolder: createFolderAction } = useCreateFolder();

  // Update password when initialPassword changes (from generator)
  useEffect(() => {
    if (initialPassword) {
      setPassword(initialPassword);
    }
  }, [initialPassword]);

  const handleUseGeneratedPassword = (generatedPassword: string) => {
    setPassword(generatedPassword);
    setShowGenerator(false);
  };

  const confirmCreateFolder = (folderData: CreateFolderInput) => {
    return createFolderAction(folderData).then((newFolder) => {
      setFolder(newFolder.id);
      return newFolder;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      serviceName,
      username,
      password,
      url: normalizeUrl(url),
      notes,
      folder,
    });
  };

  return {
    // State
    serviceName,
    username,
    password,
    url,
    notes,
    folder,
    showGenerator,

    // Setters
    setServiceName,
    setUsername,
    setPassword,
    setUrl,
    setNotes,
    setFolder,
    setShowGenerator,

    // Handlers
    handleUseGeneratedPassword,
    confirmCreateFolder,
    handleSubmit,
  };
}
