import { useSetAtom } from 'jotai';
import { createFolderAtom } from '@/store/atoms';
import { CreateFolderInput } from '@/types';

export function useCreateFolder() {
  const createFolder = useSetAtom(createFolderAtom);

  const confirmCreateFolder = (folderData: CreateFolderInput) => {
    return createFolder(folderData).catch((err) => {
      console.error('Error creating folder:', err);
      throw err;
    });
  };

  return { confirmCreateFolder };
}
