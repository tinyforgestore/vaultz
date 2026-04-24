import { atom } from 'jotai';
import { licenseStatusAtom } from '@/atoms/license';
import { allPasswordsAtom, selectedFolderAtom, searchQueryAtom } from '@/atoms/passwords';
import { SPECIAL_FOLDERS } from '@/constants/folders';

export const isProAtom = atom((get) => get(licenseStatusAtom)?.is_active === true);

export const filteredPasswordsAtom = atom((get) => {
  const allPasswords = get(allPasswordsAtom);
  const selectedFolder = get(selectedFolderAtom);
  const searchQuery = get(searchQueryAtom);

  let filtered = allPasswords;

  const isAllItems = selectedFolder === SPECIAL_FOLDERS.ALL.toString();
  if (selectedFolder === SPECIAL_FOLDERS.FAVORITES.toString()) {
    filtered = filtered.filter(p => p.isFavorite);
  } else if (!isAllItems) {
    filtered = filtered.filter(p => p.folderId === selectedFolder);
  }

  if (searchQuery) {
    const lowerQuery = searchQuery.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.username?.toLowerCase().includes(lowerQuery) ||
      p.email?.toLowerCase().includes(lowerQuery) ||
      p.website?.toLowerCase().includes(lowerQuery)
    );
  }

  if (!isAllItems && selectedFolder !== SPECIAL_FOLDERS.FAVORITES.toString()) {
    const favorites = filtered.filter(p => p.isFavorite).slice(0, 2);
    const favoriteIds = new Set(favorites.map(p => p.id));
    const rest = filtered.filter(p => !favoriteIds.has(p.id));
    filtered = [...favorites, ...rest];
  }

  return filtered;
});
