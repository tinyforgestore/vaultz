import { useState } from 'react';
import { CreateFolderInput } from '@/types';

interface UseFolderFormOptions {
  initialName?: string;
  initialIcon?: string;
  onConfirm: (data: CreateFolderInput) => void;
}

export function useFolderForm({ initialName = '', initialIcon = 'folder', onConfirm }: UseFolderFormOptions) {
  const [folderName, setFolderName] = useState(initialName);
  const [selectedIcon, setSelectedIcon] = useState(initialIcon);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({ name: folderName, icon: selectedIcon });
  };

  return { folderName, setFolderName, selectedIcon, setSelectedIcon, handleSubmit };
}
