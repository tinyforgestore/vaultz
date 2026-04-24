import { atom } from 'jotai';
import { Folder, CreateFolderInput } from '@/types';
import { storageService } from '@/services/storageService';
import { allPasswordsAtom } from '@/atoms/passwords';

export const foldersAtom = atom<Folder[]>([]);

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
    const passwords = await storageService.getPasswords();
    set(allPasswordsAtom, passwords);
  }
);
