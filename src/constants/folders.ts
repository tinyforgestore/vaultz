import type { LucideIcon } from 'lucide-react';
import { Folder as FolderIcon, Star, Briefcase, CreditCard, User, DollarSign, Home, Layers, Heart } from 'lucide-react';
import type { Folder } from '@/types';

export const SPECIAL_FOLDERS = {
  ALL: -1,
  FAVORITES: -2,
} as const;

export const isSpecialFolder = (folderId: string | number): boolean => {
  const numericId = typeof folderId === 'string' ? parseInt(folderId) : folderId;
  return (Object.values(SPECIAL_FOLDERS) as number[]).includes(numericId);
};

export const FOLDER_ICON_MAP: Record<string, LucideIcon> = {
  folder: FolderIcon,
  star: Star,
  briefcase: Briefcase,
  'credit-card': CreditCard,
  user: User,
  dollar: DollarSign,
  home: Home,
  layers: Layers,
  heart: Heart,
};

export const MAX_FOLDERS = 10;

// Virtual folders that exist only in the UI, not in the database
export const VIRTUAL_FOLDERS: Folder[] = [
  { id: SPECIAL_FOLDERS.ALL.toString(), name: 'All Items', icon: 'layers', isDefault: true, createdAt: new Date(0) },
  { id: SPECIAL_FOLDERS.FAVORITES.toString(), name: 'Favorites', icon: 'heart', isDefault: true, createdAt: new Date(0) },
];
