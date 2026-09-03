import { atom } from 'jotai';
import { storageService } from '@/services/storageService';
import { foldersAtom } from '@/atoms/folders';
import { allPasswordsAtom } from '@/atoms/passwords';
import { refreshLicenseAtom } from '@/atoms/license';

export const loadInitialDataAtom = atom(null, async (get, set) => {
  const [folders, passwords] = await Promise.all([
    storageService.getFolders(),
    storageService.getPasswords(),
  ]);
  set(foldersAtom, folders);
  set(allPasswordsAtom, passwords);
  // Refresh Pro entitlement once per unlocked session (this atom runs after a
  // successful login), so the rolling license grace window is renewed even for a
  // user who never opens Settings. Fire-and-forget: it must not block vault data.
  set(refreshLicenseAtom);
});
