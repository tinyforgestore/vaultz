import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  foldersAtom,
  allPasswordsAtom,
  filteredPasswordsAtom,
  selectedFolderAtom,
  searchQueryAtom,
  createPasswordAtom,
  toggleFavoriteAtom,
  favoriteAlertAtom,
  logoutAtom,
  loadInitialDataAtom,
  isAuthenticatedAtom,
} from '@/store/atoms';
import { SPECIAL_FOLDERS, VIRTUAL_FOLDERS, isSpecialFolder } from '@/constants/folders';
import { CreatePasswordInput } from '@/types';
import { sessionService } from '@/services/sessionService';
import { useClipboard } from './useClipboard';
import { usePasswordSelection } from './usePasswordSelection';

const FAVORITES_ID = SPECIAL_FOLDERS.FAVORITES.toString();

export function useDashboard() {
  const [isCreatePasswordOpen, setIsCreatePasswordOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

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
  const [favoriteAlert, setFavoriteAlert] = useAtom(favoriteAlertAtom);
  const logout = useSetAtom(logoutAtom);
  const setIsAuthenticated = useSetAtom(isAuthenticatedAtom);
  const loadData = useSetAtom(loadInitialDataAtom);
  const navigate = useNavigate();

  const clipboard = useClipboard();
  const selection = usePasswordSelection(passwords);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePasswordClick = (passwordId: string) => navigate(`/password/${passwordId}`);
  const handleSettingsClick = () => navigate('/settings');
  const handleLogout = () => setIsLogoutConfirmOpen(true);

  const confirmLogout = async () => {
    await sessionService.logout();
    logout();
    setIsAuthenticated(false);
    navigate('/login');
  };

  const handleCreatePassword = () => setIsCreatePasswordOpen(true);

  const confirmCreatePassword = async (passwordData: CreatePasswordInput) => {
    await createPassword(passwordData);
    setIsCreatePasswordOpen(false);
  };

  const showFolderTag = isSpecialFolder(selectedFolder);
  const visibleFolders = useMemo(
    () => folders.filter(f => f.id !== FAVORITES_ID || (folderCountMap[FAVORITES_ID] ?? 0) > 0),
    [folders, folderCountMap],
  );

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

  return {
    folders,
    passwords,
    folderNameMap,
    folderIconMap,
    folderCountMap,
    selectedFolder,
    searchQuery,
    isCreatePasswordOpen,
    isLogoutConfirmOpen,
    favoriteAlert,
    showFolderTag,
    visibleFolders,
    ...clipboard,
    ...selection,

    setSelectedFolder,
    setSearchQuery,
    setIsCreatePasswordOpen,
    setIsLogoutConfirmOpen,

    handlePasswordClick,
    handleSettingsClick,
    handleLogout,
    confirmLogout,
    toggleFavorite,
    handleCreatePassword,
    confirmCreatePassword,
  };
}
