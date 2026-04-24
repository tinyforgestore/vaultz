import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetAtom } from 'jotai';
import { invoke } from '@tauri-apps/api/core';
import {
  selectedFolderAtom,
  searchQueryAtom,
  createPasswordAtom,
  toggleFavoriteAtom,
  favoriteAlertAtom,
  loadInitialDataAtom,
  licenseStatusAtom,
  activeModalAtom,
  pendingLicenseKeyAtom,
  deletePasswordAtom,
  isLogoutConfirmAtom,
} from '@/store/atoms';
import { isSpecialFolder, LIMIT_REACHED_PASSWORDS, LIMIT_REACHED_FOLDERS, SPECIAL_FOLDERS } from '@/constants/folders';
import { CreatePasswordInput, CreateFolderInput, Password } from '@/types';
import { LicenseStatus } from '@/types/license';
import { useClipboard } from './useClipboard';
import { usePasswordSelection } from './usePasswordSelection';
import { useCreateFolder } from './useCreateFolder';
import { useLimitCheck } from './useLimitCheck';
import { useKeyboardNav, resolveSearchInput } from './useKeyboardNav';
import { usePasswordsStore, useFoldersStore, useLicenseStore, useSessionStore } from '@/store';

const FAVORITES_ID = SPECIAL_FOLDERS.FAVORITES.toString();

export function useDashboard() {
  const [isCreatePasswordOpen, setIsCreatePasswordOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [passwordToDelete, setPasswordToDelete] = useState<Password | null>(null);
  const searchInputRef = useRef<HTMLInputElement | HTMLElement | null>(null);
  const setLicenseStatus = useSetAtom(licenseStatusAtom);
  const setActiveModal = useSetAtom(activeModalAtom);
  const setPendingLicenseKey = useSetAtom(pendingLicenseKeyAtom);

  const { filteredPasswords: passwords, selectedFolder, searchQuery, favoriteAlert } = usePasswordsStore();
  const { folders, visibleFolders, folderCountMap, folderNameMap, folderIconMap } = useFoldersStore();
  const { isPro, activeModal } = useLicenseStore();
  const { isLogoutConfirm: isLogoutConfirmOpen } = useSessionStore();
  const setIsLogoutConfirmOpen = useSetAtom(isLogoutConfirmAtom);

  const setSelectedFolder = useSetAtom(selectedFolderAtom);
  const setSearchQuery = useSetAtom(searchQueryAtom);
  const createPassword = useSetAtom(createPasswordAtom);
  const toggleFavorite = useSetAtom(toggleFavoriteAtom);
  const deletePassword = useSetAtom(deletePasswordAtom);
  const setFavoriteAlert = useSetAtom(favoriteAlertAtom);
  const loadData = useSetAtom(loadInitialDataAtom);
  const navigate = useNavigate();

  const { confirmCreateFolder: createFolderAction } = useCreateFolder();
  const { checkAndOpen } = useLimitCheck();

  const clipboard = useClipboard();
  const selection = usePasswordSelection(passwords);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [selectedFolder, searchQuery]);

  useEffect(() => {
    invoke<LicenseStatus>('get_license_status')
      .then((status) => setLicenseStatus(status))
      .catch(() => setLicenseStatus(null));
  }, [setLicenseStatus]);

  const handlePasswordClick = (passwordId: string) => navigate(`/password/${passwordId}`);
  const handleSettingsClick = () => navigate('/settings');
  const handleLogout = () => setIsLogoutConfirmOpen(true);

  const handleCreatePassword = () => {
    checkAndOpen('password', () => setIsCreatePasswordOpen(true));
  };

  const handleAddFolder = () => {
    checkAndOpen('folder', () => setIsCreateFolderOpen(true));
  };

  const confirmCreatePassword = (passwordData: CreatePasswordInput) => {
    return createPassword(passwordData)
      .then(() => {
        setIsCreatePasswordOpen(false);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes(LIMIT_REACHED_PASSWORDS)) {
          setIsCreatePasswordOpen(false);
          setActiveModal('upgrade');
        } else {
          throw err;
        }
      });
  };

  const confirmCreateFolder = (folderData: CreateFolderInput) => {
    return createFolderAction(folderData)
      .then(() => {
        setIsCreateFolderOpen(false);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes(LIMIT_REACHED_FOLDERS)) {
          setIsCreateFolderOpen(false);
          setActiveModal('upgrade');
        } else {
          throw err;
        }
      });
  };

  const showFolderTag = isSpecialFolder(selectedFolder);

  const handleNextFolder = useCallback(() => {
    const idx = visibleFolders.findIndex(f => f.id === selectedFolder);
    const next = visibleFolders[(idx + 1) % visibleFolders.length];
    if (next) setSelectedFolder(next.id);
  }, [visibleFolders, selectedFolder, setSelectedFolder]);

  const handlePrevFolder = useCallback(() => {
    const idx = visibleFolders.findIndex(f => f.id === selectedFolder);
    const prev = visibleFolders[(idx - 1 + visibleFolders.length) % visibleFolders.length];
    if (prev) setSelectedFolder(prev.id);
  }, [visibleFolders, selectedFolder, setSelectedFolder]);

  const handleFocusSearch = useCallback(() => {
    resolveSearchInput(searchInputRef)?.focus();
  }, []);

  const handleKeyboardEnter = useCallback((index: number) => {
    const pw = passwords[index];
    if (pw) navigate(`/password/${pw.id}`);
  }, [passwords, navigate]);

  const handleKeyboardCopy = useCallback((index: number) => {
    const pw = passwords[index];
    if (pw) clipboard.handleCopyPassword(pw.id, pw.password);
  }, [passwords, clipboard]);

  const handleKeyboardFavorite = useCallback((index: number) => {
    const pw = passwords[index];
    if (pw) toggleFavorite(pw.id);
  }, [passwords, toggleFavorite]);

  const handleKeyboardDelete = useCallback((index: number) => {
    const pw = passwords[index];
    if (pw) setPasswordToDelete(pw);
  }, [passwords]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    resolveSearchInput(searchInputRef)?.focus();
  }, [setSearchQuery]);

  const isAnyModalOpen =
    isCreatePasswordOpen ||
    isLogoutConfirmOpen ||
    isCreateFolderOpen ||
    passwordToDelete !== null ||
    activeModal !== null;

  useKeyboardNav({
    itemCount: passwords.length,
    selectedIndex,
    isAnyModalOpen,
    isSelectionMode: selection.isSelectionMode,
    searchInputRef,
    onSelectIndex: setSelectedIndex,
    onFocusSearch: handleFocusSearch,
    onClearSearch: handleClearSearch,
    onNextFolder: handleNextFolder,
    onPrevFolder: handlePrevFolder,
    onToggleSelectionMode: selection.toggleSelectionMode,
    itemActions: {
      onEnter: handleKeyboardEnter,
      onCopy: handleKeyboardCopy,
      onFavorite: handleKeyboardFavorite,
      onDelete: handleKeyboardDelete,
      onNewPassword: () => setIsCreatePasswordOpen(true),
      onNewFolder: () => setIsCreateFolderOpen(true),
      onToggleItemSelection: (index) => {
        const pw = passwords[index];
        if (pw) selection.toggleSelection(pw.id);
      },
    },
  });

  useEffect(() => {
    if (selectedFolder === FAVORITES_ID && (folderCountMap[FAVORITES_ID] || 0) === 0) {
      setSelectedFolder(SPECIAL_FOLDERS.ALL.toString());
    }
  }, [selectedFolder, folderCountMap, setSelectedFolder]);

  useEffect(() => {
    if (!favoriteAlert) return;
    const timer = setTimeout(() => setFavoriteAlert(''), 2000);
    return () => clearTimeout(timer);
  }, [favoriteAlert, setFavoriteAlert]);

  const confirmDeletePassword = useCallback(() => {
    if (!passwordToDelete) return;
    const id = passwordToDelete.id;
    setPasswordToDelete(null);
    setSelectedIndex(-1);
    deletePassword(id).catch(() => {});
  }, [passwordToDelete, deletePassword]);

  return {
    folders,
    passwords,
    folderNameMap,
    folderIconMap,
    folderCountMap,
    selectedFolder,
    searchQuery,
    isCreatePasswordOpen,
    isCreateFolderOpen,
    favoriteAlert,
    showFolderTag,
    visibleFolders,
    isPro,
    selectedIndex,
    passwordToDelete,
    searchInputRef,
    ...clipboard,
    ...selection,

    setSelectedFolder,
    setSearchQuery,
    setIsCreatePasswordOpen,
    setIsCreateFolderOpen,
    setActiveModal,
    setPendingLicenseKey,
    setSelectedIndex,
    setPasswordToDelete,

    handlePasswordClick,
    handleSettingsClick,
    handleLogout,
    toggleFavorite,
    handleCreatePassword,
    handleAddFolder,
    confirmCreatePassword,
    confirmCreateFolder,
    confirmDeletePassword,
  };
}
