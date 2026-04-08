import { invoke } from '@tauri-apps/api/core';
import { Password, Folder, CreatePasswordInput, CreateFolderInput } from '@/types';

// Rust returns ISO strings for dates; convert to Date objects at the boundary

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePasswordDates(p: any): Password {
  return { ...p, createdAt: new Date(p.createdAt), updatedAt: new Date(p.updatedAt) };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseFolderDates(f: any): Folder {
  return { ...f, createdAt: new Date(f.createdAt) };
}

export const storageService = {
  // Folders
  getFolders: async (): Promise<Folder[]> => {
    const folders = await invoke<Folder[]>('get_folders');
    return folders.map(parseFolderDates);
  },

  createFolder: async (input: CreateFolderInput): Promise<Folder> => {
    const folder = await invoke<Folder>('create_folder', { input });
    return parseFolderDates(folder);
  },

  deleteFolder: async (folderId: string): Promise<void> => {
    await invoke('delete_folder', { folderId });
  },

  // Passwords
  getPasswords: async (folderId?: string): Promise<Password[]> => {
    const passwords = await invoke<Password[]>('get_passwords', { folderId: folderId ?? null });
    return passwords.map(parsePasswordDates);
  },

  getPasswordById: async (id: string): Promise<Password | null> => {
    const password = await invoke<Password | null>('get_password_by_id', { id });
    return password ? parsePasswordDates(password) : null;
  },

  createPassword: async (input: CreatePasswordInput): Promise<Password> => {
    const password = await invoke<Password>('create_password', { input });
    return parsePasswordDates(password);
  },

  updatePassword: async (id: string, updates: Partial<Password>): Promise<Password> => {
    const password = await invoke<Password>('update_password', { id, updates });
    return parsePasswordDates(password);
  },

  deletePassword: async (id: string): Promise<void> => {
    await invoke('delete_password', { id });
  },

  deletePasswords: async (ids: string[]): Promise<void> => {
    await invoke('delete_passwords', { ids });
  },

  searchPasswords: async (query: string): Promise<Password[]> => {
    const passwords = await invoke<Password[]>('search_passwords', { query });
    return passwords.map(parsePasswordDates);
  },

  // Authentication
  verifyMasterPassword: async (password: string): Promise<boolean> => {
    return invoke<boolean>('verify_master_password', { password });
  },

  changeMasterPassword: async (currentPassword: string, newPassword: string): Promise<boolean> => {
    return invoke<boolean>('change_master_password', { currentPassword, newPassword });
  },
};
