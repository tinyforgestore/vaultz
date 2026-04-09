import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { allPasswordsAtom, updatePasswordAtom, deletePasswordAtom, toggleFavoriteAtom, favoriteAlertAtom, foldersAtom } from '@/store/atoms';
import { PasswordFormData } from '@/types';
import { normalizeUrl } from '@/utils/url';

export function usePasswordDetails() {
  const { id: passwordId } = useParams();

  const [showPassword, setShowPassword] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyFieldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const folders = useAtomValue(foldersAtom);
  const allPasswords = useAtomValue(allPasswordsAtom);
  const updatePassword = useSetAtom(updatePasswordAtom);
  const deletePassword = useSetAtom(deletePasswordAtom);
  const toggleFavorite = useSetAtom(toggleFavoriteAtom);
  const [favoriteAlert, setFavoriteAlert] = useAtom(favoriteAlertAtom);
  const navigate = useNavigate();

  const password = useMemo(
    () => allPasswords.find(p => p.id === passwordId) ?? null,
    [allPasswords, passwordId],
  );

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (copyFieldTimerRef.current) clearTimeout(copyFieldTimerRef.current);
  }, []);

  const folder = useMemo(
    () => folders.find(f => f.id === password?.folderId),
    [folders, password?.folderId],
  );
  const folderName = folder?.name ?? '';
  const folderIcon = folder?.icon ?? 'folder';

  const showTimedToast = (message: string, variant: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastVariant(variant);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(''), 2000);
  };

  const onError = (message: string) => (err: unknown) => {
    console.error(message, err);
    showTimedToast(message, 'error');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => showTimedToast('Copied — clipboard clears in 45s', 'success'))
      .catch(onError('Failed to copy'));
  };

  const copyField = (field: string, value: string) => {
    if (!value) return;
    handleCopy(value);
    if (copyFieldTimerRef.current) clearTimeout(copyFieldTimerRef.current);
    setCopiedField(field);
    copyFieldTimerRef.current = setTimeout(() => setCopiedField(null), 1500);
  };

  const handleEdit = () => setIsEditModalOpen(true);

  const confirmEdit = (passwordData: PasswordFormData) => {
    if (!passwordId) return;
    updatePassword({
      id: passwordId,
      updates: {
        name: passwordData.serviceName,
        username: passwordData.username,
        password: passwordData.password,
        website: normalizeUrl(passwordData.url),
        notes: passwordData.notes,
        folderId: passwordData.folder,
      },
    })
      .then(() => setIsEditModalOpen(false))
      .catch(onError('Failed to update password'));
  };

  const handleDelete = () => setIsDeleteModalOpen(true);

  const confirmDelete = () => {
    if (!passwordId) return;
    deletePassword(passwordId)
      .then(() => {
        setIsDeleteModalOpen(false);
        navigate('/dashboard');
      })
      .catch(onError('Failed to delete password'));
  };

  useEffect(() => {
    if (!favoriteAlert) return;
    showTimedToast(favoriteAlert, 'success');
    setFavoriteAlert('');
  }, [favoriteAlert, setFavoriteAlert]);

  const handleToggleFavorite = () => {
    if (passwordId) toggleFavorite(passwordId);
  };

  const handleBack = () => navigate('/dashboard');

  return {
    password,
    showPassword,
    isDeleteModalOpen,
    isEditModalOpen,
    toastMessage,
    toastVariant,
    copiedField,
    folderName,
    folderIcon,

    setShowPassword,
    setIsDeleteModalOpen,
    setIsEditModalOpen,

    handleEdit,
    confirmEdit,
    handleDelete,
    confirmDelete,
    handleToggleFavorite,
    handleBack,
    copyField,
  };
}
