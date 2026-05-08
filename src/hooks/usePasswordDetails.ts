import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { invoke } from '@tauri-apps/api/core';
import { allPasswordsAtom, updatePasswordAtom, deletePasswordAtom, toggleFavoriteAtom, favoriteAlertAtom, foldersAtom } from '@/store/atoms';
import { PasswordFormData } from '@/types';
import { normalizeUrl } from '@/utils/url';
import { CLIPBOARD_CLEAR_DELAY_MS, CLIPBOARD_CLEAR_DELAY_S } from '@/constants/clipboard';
import { usePasswordDetailsKeys } from './usePasswordDetailsKeys';

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
  const clipboardClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (clipboardClearTimerRef.current) clearTimeout(clipboardClearTimerRef.current);
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

  const flashCopiedField = (field: string) => {
    if (copyFieldTimerRef.current) clearTimeout(copyFieldTimerRef.current);
    setCopiedField(field);
    copyFieldTimerRef.current = setTimeout(() => setCopiedField(null), 1500);
  };

  // `secure: true` routes through Rust (ConcealedType on macOS) and schedules
  // a clipboard wipe after CLIPBOARD_CLEAR_DELAY_MS. Plain copies are direct
  // navigator.clipboard writes with no auto-clear.
  const copyToClipboard = (
    field: string,
    value: string,
    options: { secure?: boolean } = {},
  ) => {
    if (!value) return;
    const write = options.secure
      ? invoke('write_secret_to_clipboard', { text: value })
      : navigator.clipboard.writeText(value);

    write
      .then(() =>
        showTimedToast(
          options.secure ? `Copied — clipboard clears in ${CLIPBOARD_CLEAR_DELAY_S}s` : 'Copied',
          'success',
        ),
      )
      .catch(onError('Failed to copy'));

    flashCopiedField(field);

    if (options.secure) {
      if (clipboardClearTimerRef.current) clearTimeout(clipboardClearTimerRef.current);
      clipboardClearTimerRef.current = setTimeout(() => {
        navigator.clipboard.writeText('').catch(() => {});
      }, CLIPBOARD_CLEAR_DELAY_MS);
    }
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
        // Always include the field — `null` is meaningful (user picked "None").
        // The Rust side's tri-state Option<Option<String>> reads JSON `null` as
        // "set column to NULL" and a string as "set to slug".
        favicon: passwordData.favicon,
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

  // PM-022: keyboard shortcuts on the detail page (Esc/Backspace, 1/2/3, E, F).
  // Suppressed while a modal is open so its own keyboard handling can win.
  // Mirrors the page's `userField = username || email` fallback so the
  // shortcut still copies even when only `email` is set.
  usePasswordDetailsKeys({
    enabled: !isEditModalOpen && !isDeleteModalOpen,
    password: password
      ? {
          username: password.username || password.email || '',
          password: password.password,
          website: password.website,
        }
      : null,
    onBack: handleBack,
    onEdit: handleEdit,
    onToggleFavorite: handleToggleFavorite,
    onCopyField: (field, value) => copyToClipboard(field, value, { secure: field === 'password' }),
  });

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
    copyToClipboard,
  };
}
