import { createContext, useContext, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { allPasswordsAtom, selectedFolderAtom, searchQueryAtom, favoriteAlertAtom } from '@/atoms/passwords';
import { filteredPasswordsAtom } from '@/atoms/derived';
import { Password } from '@/types';

interface PasswordsStore {
  allPasswords: Password[];
  filteredPasswords: Password[];
  selectedFolder: string;
  searchQuery: string;
  favoriteAlert: string;
}

export const PasswordsStoreContext = createContext<PasswordsStore | null>(null);
export type { PasswordsStore };

export function PasswordsStoreProvider({ children }: { children: React.ReactNode }) {
  const allPasswords = useAtomValue(allPasswordsAtom);
  const filteredPasswords = useAtomValue(filteredPasswordsAtom);
  const selectedFolder = useAtomValue(selectedFolderAtom);
  const searchQuery = useAtomValue(searchQueryAtom);
  const favoriteAlert = useAtomValue(favoriteAlertAtom);
  const value = useMemo(
    () => ({ allPasswords, filteredPasswords, selectedFolder, searchQuery, favoriteAlert }),
    [allPasswords, filteredPasswords, selectedFolder, searchQuery, favoriteAlert]
  );
  return <PasswordsStoreContext.Provider value={value}>{children}</PasswordsStoreContext.Provider>;
}

export function usePasswordsStore(): PasswordsStore {
  const ctx = useContext(PasswordsStoreContext);
  if (!ctx) throw new Error('usePasswordsStore must be used within PasswordsStoreProvider');
  return ctx;
}
