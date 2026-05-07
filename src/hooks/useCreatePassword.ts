import { useState, useEffect, useRef, useCallback } from 'react';
import { Password, CreateFolderInput, PasswordFormData } from '@/types';
import { normalizeUrl } from '@/utils/url';
import { recordGeneratedPassword } from '@/utils/recordGeneratedPassword';
import { useCreateFolder } from './useCreateFolder';

interface UseCreatePasswordProps {
  onConfirm: (passwordData: PasswordFormData) => void;
  initialPassword?: string;
  initialData?: Password;
}

export function useCreatePassword({ onConfirm, initialPassword = '', initialData }: UseCreatePasswordProps) {
  const [serviceName, setServiceName] = useState(initialData?.name || '');
  const [username, setUsername] = useState(initialData?.username || initialData?.email || '');
  const [password, setPassword] = useState(initialPassword || initialData?.password || '');
  const [url, setUrl] = useState(initialData?.website || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [folder, setFolder] = useState(initialData?.folderId || '');
  const [showGenerator, setShowGenerator] = useState(false);

  const { confirmCreateFolder: createFolderAction } = useCreateFolder();

  // Guard against stomping on a user-edited password when the modal re-renders
  // with a stale `initialPassword`: we only sync state when the prop itself
  // actually changes (e.g. a new prefilled password arrives).
  const prevInitialPassword = useRef(initialPassword);
  useEffect(() => {
    if (initialPassword && initialPassword !== prevInitialPassword.current) {
      prevInitialPassword.current = initialPassword;
      setPassword(initialPassword);
    }
  }, [initialPassword]);

  const handleUseGeneratedPassword = (generatedPassword: string) => {
    setPassword(generatedPassword);
    setShowGenerator(false);
  };

  /**
   * Records the generated password to history. Failures are swallowed so that
   * the create flow keeps working even if the history table is unavailable.
   */
  const handleRecordGenerated = useCallback((generatedPassword: string) => {
    recordGeneratedPassword(generatedPassword);
  }, []);

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
    serviceName,
    username,
    password,
    url,
    notes,
    folder,
    showGenerator,
    setServiceName,
    setUsername,
    setPassword,
    setUrl,
    setNotes,
    setFolder,
    setShowGenerator,
    handleUseGeneratedPassword,
    handleRecordGenerated,
    confirmCreateFolder,
    handleSubmit,
  };
}
