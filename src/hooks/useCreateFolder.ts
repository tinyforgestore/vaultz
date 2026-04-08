import { useSetAtom } from 'jotai';
import { createFolderAtom } from '@/store/atoms';

export function useCreateFolder() {
  const createFolder = useSetAtom(createFolderAtom);

  const confirmCreateFolder = (folderData: { name: string; icon: string }) => {
    return createFolder(folderData).catch((err) => {
      console.error('Error creating folder:', err);
      throw err;
    });
  };

  return { confirmCreateFolder };
}
