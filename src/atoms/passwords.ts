import { atom } from 'jotai';
import { Password, CreatePasswordInput } from '@/types';
import { storageService } from '@/services/storageService';
import { SPECIAL_FOLDERS } from '@/constants/folders';

export const allPasswordsAtom = atom<Password[]>([]);
export const selectedFolderAtom = atom<string>(SPECIAL_FOLDERS.ALL.toString());
export const searchQueryAtom = atom<string>('');

export const MAX_FAVORITES_PER_FOLDER = 2;

export const favoriteAlertAtom = atom<string>('');

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
  async (_get, _set, id: string) => {
    return storageService.getPasswordById(id);
  }
);

export const changeMasterPasswordAtom = atom(
  null,
  async (_get, _set, { currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
    return storageService.changeMasterPassword(currentPassword, newPassword);
  }
);

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

export const toggleFavoriteAtom = atom(
  null,
  async (get, set, id: string) => {
    const allPasswords = get(allPasswordsAtom);
    const current = allPasswords.find(p => p.id === id);
    if (!current) return;

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
