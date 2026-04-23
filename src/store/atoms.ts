import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { Password, Folder, CreatePasswordInput, CreateFolderInput } from '@/types';
import { LicenseStatus } from '@/types/license';
import { storageService } from '@/services/storageService';
import { SPECIAL_FOLDERS } from '@/constants/folders';

// Base atoms
export const licenseStatusAtom = atom<LicenseStatus | null>(null);

// Modal state atoms
export type ActiveModal = 'upgrade' | 'activate' | 'proWelcome' | null;
export const activeModalAtom = atom<ActiveModal>(null);
export const pendingLicenseKeyAtom = atom<string | null>(null);
export const foldersAtom = atom<Folder[]>([]);
export const allPasswordsAtom = atom<Password[]>([]);
export const selectedFolderAtom = atom<string>(SPECIAL_FOLDERS.ALL.toString());
export const searchQueryAtom = atom<string>('');
export const isAuthenticatedAtom = atomWithStorage<boolean>('isAuthenticated', false);

// Derived atoms
export const isProAtom = atom((get) => get(licenseStatusAtom)?.is_active === true);

export const filteredPasswordsAtom = atom((get) => {
  const allPasswords = get(allPasswordsAtom);
  const selectedFolder = get(selectedFolderAtom);
  const searchQuery = get(searchQueryAtom);

  let filtered = allPasswords;

  // Filter by folder
  const isAllItems = selectedFolder === SPECIAL_FOLDERS.ALL.toString();
  if (selectedFolder === SPECIAL_FOLDERS.FAVORITES.toString()) {
    filtered = filtered.filter(p => p.isFavorite);
  } else if (!isAllItems) {
    filtered = filtered.filter(p => p.folderId === selectedFolder);
  }

  // Filter by search query
  if (searchQuery) {
    const lowerQuery = searchQuery.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.username?.toLowerCase().includes(lowerQuery) ||
      p.email?.toLowerCase().includes(lowerQuery) ||
      p.website?.toLowerCase().includes(lowerQuery)
    );
  }

  // Show favorited passwords first (max 2) for individual folder views
  if (!isAllItems && selectedFolder !== SPECIAL_FOLDERS.FAVORITES.toString()) {
    const favorites = filtered.filter(p => p.isFavorite).slice(0, 2);
    const favoriteIds = new Set(favorites.map(p => p.id));
    const rest = filtered.filter(p => !favoriteIds.has(p.id));
    filtered = [...favorites, ...rest];
  }

  return filtered;
});

// Async atoms for data operations
export const loadInitialDataAtom = atom(null, async (get, set) => {
  const [folders, passwords] = await Promise.all([
    storageService.getFolders(),
    storageService.getPasswords(),
  ]);
  set(foldersAtom, folders);
  set(allPasswordsAtom, passwords);
});

// Folder actions
export const createFolderAtom = atom(
  null,
  async (get, set, input: CreateFolderInput) => {
    const newFolder = await storageService.createFolder(input);
    set(foldersAtom, [...get(foldersAtom), newFolder]);
    return newFolder;
  }
);

export const updateFolderAtom = atom(
  null,
  async (get, set, { id, name, icon }: { id: string } & CreateFolderInput) => {
    const updated = await storageService.updateFolder(id, { name, icon });
    set(foldersAtom, get(foldersAtom).map(f => f.id === id ? updated : f));
    return updated;
  }
);

export const deleteFolderAtom = atom(
  null,
  async (get, set, folderId: string) => {
    await storageService.deleteFolder(folderId);
    set(foldersAtom, get(foldersAtom).filter(f => f.id !== folderId));
    // Reload passwords to reflect moved items
    const passwords = await storageService.getPasswords();
    set(allPasswordsAtom, passwords);
  }
);

// Password actions
export const createPasswordAtom = atom(
  null,
  async (get, set, input: CreatePasswordInput) => {
    const newPassword = await storageService.createPassword(input);
    set(allPasswordsAtom, [...get(allPasswordsAtom), newPassword]);
  }
);

export const updatePasswordAtom = atom(
  null,
  async (get, set, { id, updates }: { id: string; updates: Partial<Password> }) => {
    const updated = await storageService.updatePassword(id, updates);
    set(allPasswordsAtom, get(allPasswordsAtom).map(p => p.id === id ? updated : p));
  }
);

const MAX_FAVORITES_PER_FOLDER = 2;

export const favoriteAlertAtom = atom<string>('');

export const toggleFavoriteAtom = atom(
  null,
  async (get, set, id: string) => {
    const allPasswords = get(allPasswordsAtom);
    const current = allPasswords.find(p => p.id === id);
    if (!current) return;

    // When favoriting, check limit per folder
    if (!current.isFavorite) {
      const favoritesInFolder = allPasswords.filter(
        p => p.folderId === current.folderId && p.isFavorite
      );
      if (favoritesInFolder.length >= MAX_FAVORITES_PER_FOLDER) {
        set(favoriteAlertAtom, `Maximum ${MAX_FAVORITES_PER_FOLDER} favorites per folder`);
        return;
      }
    }

    set(favoriteAlertAtom, '');
    const updated = await storageService.updatePassword(id, { isFavorite: !current.isFavorite });
    set(allPasswordsAtom, allPasswords.map(p => p.id === id ? updated : p));
  }
);

export const deletePasswordAtom = atom(
  null,
  async (get, set, id: string) => {
    await storageService.deletePassword(id);
    set(allPasswordsAtom, get(allPasswordsAtom).filter(p => p.id !== id));
  }
);

// Bulk selection & actions
export const selectedPasswordIdsAtom = atom<Set<string>>(new Set<string>());

export const bulkDeleteAtom = atom(
  null,
  async (get, set) => {
    const selectedIds = get(selectedPasswordIdsAtom);
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    await storageService.deletePasswords(ids);
    set(allPasswordsAtom, get(allPasswordsAtom).filter(p => !selectedIds.has(p.id)));
    set(selectedPasswordIdsAtom, new Set());
  }
);

export const bulkToggleFavoriteAtom = atom(
  null,
  async (get, set, favorite: boolean) => {
    const selectedIds = get(selectedPasswordIdsAtom);
    if (selectedIds.size === 0) return;
    const allPasswords = get(allPasswordsAtom);
    let updatedPasswords = [...allPasswords];
    let limitReached = false;

    for (const id of selectedIds) {
      const current = updatedPasswords.find(p => p.id === id);
      if (!current || current.isFavorite === favorite) continue;

      if (favorite) {
        const favoritesInFolder = updatedPasswords.filter(
          p => p.folderId === current.folderId && p.isFavorite
        );
        if (favoritesInFolder.length >= MAX_FAVORITES_PER_FOLDER) {
          limitReached = true;
          continue;
        }
      }

      const updated = await storageService.updatePassword(id, { isFavorite: favorite });
      updatedPasswords = updatedPasswords.map(p => p.id === id ? updated : p);
    }

    set(allPasswordsAtom, updatedPasswords);
    set(selectedPasswordIdsAtom, new Set());
    if (limitReached) {
      set(favoriteAlertAtom, `Some passwords were not favorited (max ${MAX_FAVORITES_PER_FOLDER} per folder)`);
    }
  }
);

export const getPasswordByIdAtom = atom(
  null,
  async (get, set, id: string) => {
    return storageService.getPasswordById(id);
  }
);

// UI state atoms
export const isLogoutConfirmAtom = atom(false);

// Auth actions
export const loginAtom = atom(
  null,
  async (get, set, password: string) => {
    const isValid = await storageService.verifyMasterPassword(password);
    set(isAuthenticatedAtom, isValid);
    if (isValid) {
      // Load data on successful login
      await set(loadInitialDataAtom);
    }
    return isValid;
  }
);

export const logoutAtom = atom(null, (get, set) => {
  set(isAuthenticatedAtom, false);
  set(licenseStatusAtom, null);
  set(allPasswordsAtom, []);
  set(selectedFolderAtom, SPECIAL_FOLDERS.ALL.toString());
  set(searchQueryAtom, '');
  set(activeModalAtom, null);
  set(pendingLicenseKeyAtom, null);
});

export const changeMasterPasswordAtom = atom(
  null,
  async (get, set, { currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
    return storageService.changeMasterPassword(currentPassword, newPassword);
  }
);

export const themeAtom = atomWithStorage<'light' | 'dark' | 'system'>('vaultz-theme', 'system');
