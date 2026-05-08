import { useState, useEffect, useRef, useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { Password, CreateFolderInput, PasswordFormData } from '@/types';
import { normalizeUrl } from '@/utils/url';
import { recordGeneratedPassword } from '@/utils/recordGeneratedPassword';
import { activeModalAtom } from '@/store/atoms';
import { LIMIT_REACHED_FOLDERS } from '@/constants/folders';
import { useCreateFolder } from './useCreateFolder';
import { useFaviconPicker } from './useFaviconPicker';

interface UseCreatePasswordProps {
  onConfirm: (passwordData: PasswordFormData) => void;
  onCancel?: () => void;
  initialPassword?: string;
  initialData?: Password;
}

export function useCreatePassword({ onConfirm, onCancel, initialPassword = '', initialData }: UseCreatePasswordProps) {
  // ----- state -----
  const [serviceName, setServiceName] = useState(initialData?.name || '');
  const [username, setUsername] = useState(initialData?.username || initialData?.email || '');
  const [password, setPassword] = useState(initialPassword || initialData?.password || '');
  const [url, setUrl] = useState(initialData?.website || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [folder, setFolder] = useState(initialData?.folderId || '');
  const [showGenerator, setShowGenerator] = useState(false);

  // Modal-local UI state — moved here so the component file is JSX-only.
  const [showPassword, setShowPassword] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);

  // Favicon + icon-picker concerns live in their own sub-hook, exposed as a
  // single grouped object so the modal can `faviconPicker.openPicker()` etc.
  // instead of destructuring 13+ fields here.
  const faviconPicker = useFaviconPicker(url, initialData?.favicon, initialData != null, serviceName);

  const setActiveModal = useSetAtom(activeModalAtom);
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

  // ----- handlers -----
  const handleUseGeneratedPassword = (generatedPassword: string) => {
    setPassword(generatedPassword);
    setShowGenerator(false);
  };

  // Thin passthrough kept as a stable hook export so the test surface
  // (and modal) doesn't depend on importing `recordGeneratedPassword`
  // directly. Errors are already swallowed inside the util.
  const handleRecordGenerated = useCallback((generatedPassword: string) => {
    recordGeneratedPassword(generatedPassword);
  }, []);

  const confirmCreateFolder = useCallback(
    (folderData: CreateFolderInput) => {
      return createFolderAction(folderData).then((newFolder) => {
        setFolder(newFolder.id);
        return newFolder;
      });
    },
    [createFolderAction]
  );

  // Wrapper used by the embedded CreateFolderModal: closes the inline folder
  // modal on success, and on the limit-reached error closes both modals and
  // routes to the upgrade prompt.
  const handleCreateFolderConfirm = useCallback(
    (folderData: CreateFolderInput) => {
      confirmCreateFolder(folderData)
        .then(() => setIsCreateFolderOpen(false))
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes(LIMIT_REACHED_FOLDERS)) {
            setIsCreateFolderOpen(false);
            onCancel?.();
            setActiveModal('upgrade');
          }
        });
    },
    [confirmCreateFolder, onCancel, setActiveModal]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      serviceName,
      username,
      password,
      url: normalizeUrl(url),
      notes,
      folder,
      favicon: faviconPicker.favicon,
    });
  };

  return {
    // ----- state values -----
    serviceName,
    username,
    password,
    url,
    notes,
    folder,
    showGenerator,
    showPassword,
    isCreateFolderOpen,
    // ----- setters -----
    setServiceName,
    setUsername,
    setPassword,
    setUrl,
    setNotes,
    setFolder,
    setShowGenerator,
    setShowPassword,
    setIsCreateFolderOpen,
    // ----- nested sub-hook (favicon + icon picker) -----
    faviconPicker,
    // ----- handlers -----
    handleUseGeneratedPassword,
    handleRecordGenerated,
    handleCreateFolderConfirm,
    handleSubmit,
  };
}
