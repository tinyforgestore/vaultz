import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { storageService } from '@/services/storageService';
import { SPECIAL_FOLDERS } from '@/constants/folders';
import { allPasswordsAtom, selectedFolderAtom, searchQueryAtom } from '@/atoms/passwords';
import { resetLicenseAtom } from '@/atoms/license';
import { activeModalAtom, pendingLicenseKeyAtom } from '@/atoms/ui';
import { loadInitialDataAtom } from '@/atoms/init';

export const isAuthenticatedAtom = atomWithStorage<boolean>('isAuthenticated', false);
export const isLogoutConfirmAtom = atom(false);

export const loginAtom = atom(
  null,
  async (get, set, password: string) => {
    const isValid = await storageService.verifyMasterPassword(password);
    set(isAuthenticatedAtom, isValid);
    if (isValid) {
      await set(loadInitialDataAtom);
    }
    return isValid;
  }
);

export const logoutAtom = atom(null, (get, set) => {
  set(isAuthenticatedAtom, false);
  // Resets the status AND the in-flight refresh memo: clearing only the status
  // would let a refresh chain that is still running write it back after logout.
  set(resetLicenseAtom);
  set(allPasswordsAtom, []);
  set(selectedFolderAtom, SPECIAL_FOLDERS.ALL.toString());
  set(searchQueryAtom, '');
  set(activeModalAtom, null);
  set(pendingLicenseKeyAtom, null);
});
