import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { invoke } from '@tauri-apps/api/core';
import {
  foldersAtom,
  allPasswordsAtom,
  filteredPasswordsAtom,
  selectedFolderAtom,
  searchQueryAtom,
  createPasswordAtom,
  toggleFavoriteAtom,
  favoriteAlertAtom,
  loadInitialDataAtom,
  licenseStatusAtom,
  isProAtom,
  activeModalAtom,
  pendingLicenseKeyAtom,
  deletePasswordAtom,
  isLogoutConfirmAtom,
} from '@/store/atoms';
import { SPECIAL_FOLDERS, VIRTUAL_FOLDERS, isSpecialFolder, LIMIT_REACHED_PASSWORDS, LIMIT_REACHED_FOLDERS } from '@/constants/folders';
import { CreatePasswordInput, CreateFolderInput, Password } from '@/types';
import { LicenseStatus } from '@/types/license';
import { useClipboard } from './useClipboard';
import { usePasswordSelection } from './usePasswordSelection';
import { useCreateFolder } from './useCreateFolder';
import { useLimitCheck } from './useLimitCheck';
import { useKeyboardNav, resolveSearchInput } from './useKeyboardNav';

const FAVORITES_ID = SPECIAL_FOLDERS.FAVORITES.toString();

export function useDashboard() {
  const [isCreatePasswordOpen, setIsCreatePasswordOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useAtom(isLogoutConfirmAtom);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [passwordToDelete, setPasswordToDelete] = useState<Password | null>(null);
  const searchInputRef = useRef<HTMLInputElement | HTMLElement>(null);
  const setLicenseStatus = useSetAtom(licenseStatusAtom);
  const isPro = useAtomValue(isProAtom);
  const setActiveModal = useSetAtom(activeModalAtom);
  const activeModal = useAtomValue(activeModalAtom);
  const setPendingLicenseKey = useSetAtom(pendingLicenseKeyAtom);

  const realFolders = useAtomValue(foldersAtom);
  const folders = useMemo(() => [...VIRTUAL_FOLDERS, ...realFolders], [realFolders]);
  const allPasswords = useAtomValue(allPasswordsAtom);
  const passwords = useAtomValue(filteredPasswordsAtom);

  const folderCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    map[SPECIAL_FOLDERS.ALL.toString()] = allPasswords.length;
    map[FAVORITES_ID] = 0;
    for (const p of allPasswords) {
      if (p.isFavorite) map[FAVORITES_ID]++;
      map[p.folderId] = (map[p.folderId] || 0) + 1;
    }
    return map;
  }, [allPasswords]);

  const { folderNameMap, folderIconMap } = useMemo(() => {
    const names: Record<string, string> = {};
    const icons: Record<string, string> = {};
    for (const f of realFolders) {
      names[f.id] = f.name;
      icons[f.id] = f.icon;
    }
    return { folderNameMap: names, folderIconMap: icons };
  }, [realFolders]);

  const [selectedFolder, setSelectedFolder] = useAtom(selectedFolderAtom);
  const [searchQuery, setSearchQuery] = useAtom(searchQueryAtom);
  const createPassword = useSetAtom(createPasswordAtom);
  const toggleFavorite = useSetAtom(toggleFavoriteAtom);
  const deletePassword = useSetAtom(deletePasswordAtom);
  const [favoriteAlert, setFavoriteAlert] = useAtom(favoriteAlertAtom);
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
  const visibleFolders = useMemo(
    () => folders.filter(f => f.id !== FAVORITES_ID || (folderCountMap[FAVORITES_ID] ?? 0) > 0),
    [folders, folderCountMap],
  );

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
