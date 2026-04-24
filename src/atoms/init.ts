import { atom } from 'jotai';
import { storageService } from '@/services/storageService';
import { foldersAtom } from '@/atoms/folders';
import { allPasswordsAtom } from '@/atoms/passwords';

export const loadInitialDataAtom = atom(null, async (get, set) => {
  const [folders, passwords] = await Promise.all([
    storageService.getFolders(),
    storageService.getPasswords(),
  ]);
  set(foldersAtom, folders);
  set(allPasswordsAtom, passwords);
});
