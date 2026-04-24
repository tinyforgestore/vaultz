import { createContext, useContext, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { foldersAtom } from '@/atoms/folders';
import { allPasswordsAtom } from '@/atoms/passwords';
import { SPECIAL_FOLDERS, VIRTUAL_FOLDERS } from '@/constants/folders';
import { Folder } from '@/types';

const FAVORITES_ID = SPECIAL_FOLDERS.FAVORITES.toString();

interface FoldersStore {
  folders: Folder[];
  visibleFolders: Folder[];
  folderCountMap: Record<string, number>;
  folderNameMap: Record<string, string>;
  folderIconMap: Record<string, string>;
}

export const FoldersStoreContext = createContext<FoldersStore | null>(null);
export type { FoldersStore };

function computeFoldersStore(realFolders: Folder[], allPasswords: ReturnType<typeof useAtomValue<typeof allPasswordsAtom>>): FoldersStore {
  const folders = [...VIRTUAL_FOLDERS, ...realFolders];

  const folderCountMap: Record<string, number> = {};
  folderCountMap[SPECIAL_FOLDERS.ALL.toString()] = allPasswords.length;
  folderCountMap[FAVORITES_ID] = 0;
  for (const p of allPasswords) {
    if (p.isFavorite) folderCountMap[FAVORITES_ID]++;
    folderCountMap[p.folderId] = (folderCountMap[p.folderId] || 0) + 1;
  }

  const folderNameMap: Record<string, string> = {};
  const folderIconMap: Record<string, string> = {};
  for (const f of realFolders) {
    folderNameMap[f.id] = f.name;
    folderIconMap[f.id] = f.icon;
  }

  const visibleFolders = folders.filter(f => f.id !== FAVORITES_ID || (folderCountMap[FAVORITES_ID] ?? 0) > 0);

  return { folders, visibleFolders, folderCountMap, folderNameMap, folderIconMap };
}

export function FoldersStoreProvider({ children }: { children: React.ReactNode }) {
  const realFolders = useAtomValue(foldersAtom);
  const allPasswords = useAtomValue(allPasswordsAtom);

  const value = useMemo(
    () => computeFoldersStore(realFolders, allPasswords),
    [realFolders, allPasswords]
  );

  return <FoldersStoreContext.Provider value={value}>{children}</FoldersStoreContext.Provider>;
}

export function useFoldersStore(): FoldersStore {
  const ctx = useContext(FoldersStoreContext);
  if (!ctx) throw new Error('useFoldersStore must be used within FoldersStoreProvider');
  return ctx;
}
