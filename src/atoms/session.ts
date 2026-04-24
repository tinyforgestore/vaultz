import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { storageService } from '@/services/storageService';
import { SPECIAL_FOLDERS } from '@/constants/folders';
import { allPasswordsAtom, selectedFolderAtom, searchQueryAtom } from '@/atoms/passwords';
import { licenseStatusAtom } from '@/atoms/license';
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
  set(licenseStatusAtom, null);
  set(allPasswordsAtom, []);
  set(selectedFolderAtom, SPECIAL_FOLDERS.ALL.toString());
  set(searchQueryAtom, '');
  set(activeModalAtom, null);
  set(pendingLicenseKeyAtom, null);
});
