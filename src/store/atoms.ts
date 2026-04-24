// Re-export barrel — all existing imports of @/store/atoms continue to work
export { isAuthenticatedAtom, isLogoutConfirmAtom, loginAtom, logoutAtom } from '@/atoms/session';
export { foldersAtom, createFolderAtom, updateFolderAtom, deleteFolderAtom } from '@/atoms/folders';
export {
  allPasswordsAtom,
  selectedFolderAtom,
  searchQueryAtom,
  favoriteAlertAtom,
  createPasswordAtom,
  updatePasswordAtom,
  toggleFavoriteAtom,
  deletePasswordAtom,
  selectedPasswordIdsAtom,
  bulkDeleteAtom,
  bulkToggleFavoriteAtom,
  getPasswordByIdAtom,
  changeMasterPasswordAtom,
} from '@/atoms/passwords';
export { loadInitialDataAtom } from '@/atoms/init';
export { licenseStatusAtom } from '@/atoms/license';
export { activeModalAtom, pendingLicenseKeyAtom, themeAtom } from '@/atoms/ui';
export type { ActiveModal } from '@/atoms/ui';
export { isProAtom, filteredPasswordsAtom } from '@/atoms/derived';
