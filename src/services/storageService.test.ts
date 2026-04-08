import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core');

import { invoke } from '@tauri-apps/api/core';
import { storageService } from './storageService';

const mockInvoke = vi.mocked(invoke);

const RAW_PASSWORD = {
  id: '1',
  name: 'GitHub',
  username: 'user',
  email: 'user@example.com',
  password: 'secret',
  website: 'https://github.com',
  notes: '',
  recoveryEmail: '',
  isFavorite: false,
  folderId: 'f1',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-06-01T00:00:00.000Z',
};

const RAW_FOLDER = {
  id: 'f1',
  name: 'Work',
  icon: 'briefcase',
  isDefault: false,
  createdAt: '2024-01-01T00:00:00.000Z',
};

describe('storageService', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  describe('date parsing', () => {
    it('converts password ISO strings to Date objects', async () => {
      mockInvoke.mockResolvedValueOnce([RAW_PASSWORD]);
      const [pw] = await storageService.getPasswords();
      expect(pw.createdAt).toBeInstanceOf(Date);
      expect(pw.updatedAt).toBeInstanceOf(Date);
      expect(pw.createdAt.toISOString()).toBe('2024-01-01T00:00:00.000Z');
      expect(pw.updatedAt.toISOString()).toBe('2024-06-01T00:00:00.000Z');
    });

    it('converts folder ISO strings to Date objects', async () => {
      mockInvoke.mockResolvedValueOnce([RAW_FOLDER]);
      const [folder] = await storageService.getFolders();
      expect(folder.createdAt).toBeInstanceOf(Date);
    });

    it('returns null for missing password without throwing', async () => {
      mockInvoke.mockResolvedValueOnce(null);
      const result = await storageService.getPasswordById('missing');
      expect(result).toBeNull();
    });
  });

  describe('folders', () => {
    it('getFolders calls get_folders', async () => {
      mockInvoke.mockResolvedValueOnce([RAW_FOLDER]);
      await storageService.getFolders();
      expect(mockInvoke).toHaveBeenCalledWith('get_folders');
    });

    it('createFolder calls create_folder with input', async () => {
      mockInvoke.mockResolvedValueOnce(RAW_FOLDER);
      await storageService.createFolder({ name: 'Work', icon: 'briefcase' });
      expect(mockInvoke).toHaveBeenCalledWith('create_folder', { input: { name: 'Work', icon: 'briefcase' } });
    });

    it('deleteFolder calls delete_folder with folderId', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await storageService.deleteFolder('f1');
      expect(mockInvoke).toHaveBeenCalledWith('delete_folder', { folderId: 'f1' });
    });
  });

  describe('passwords', () => {
    it('getPasswords calls get_passwords with null folderId when omitted', async () => {
      mockInvoke.mockResolvedValueOnce([]);
      await storageService.getPasswords();
      expect(mockInvoke).toHaveBeenCalledWith('get_passwords', { folderId: null });
    });

    it('getPasswords passes folderId when provided', async () => {
      mockInvoke.mockResolvedValueOnce([]);
      await storageService.getPasswords('f1');
      expect(mockInvoke).toHaveBeenCalledWith('get_passwords', { folderId: 'f1' });
    });

    it('createPassword calls create_password', async () => {
      mockInvoke.mockResolvedValueOnce(RAW_PASSWORD);
      const input = { serviceName: 'GitHub', username: 'user', password: 'secret' };
      await storageService.createPassword(input);
      expect(mockInvoke).toHaveBeenCalledWith('create_password', { input });
    });

    it('updatePassword calls update_password with id and updates', async () => {
      mockInvoke.mockResolvedValueOnce(RAW_PASSWORD);
      await storageService.updatePassword('1', { name: 'GitLab' });
      expect(mockInvoke).toHaveBeenCalledWith('update_password', { id: '1', updates: { name: 'GitLab' } });
    });

    it('deletePassword calls delete_password', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await storageService.deletePassword('1');
      expect(mockInvoke).toHaveBeenCalledWith('delete_password', { id: '1' });
    });

    it('deletePasswords calls delete_passwords with ids array', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await storageService.deletePasswords(['1', '2']);
      expect(mockInvoke).toHaveBeenCalledWith('delete_passwords', { ids: ['1', '2'] });
    });

    it('searchPasswords calls search_passwords with query', async () => {
      mockInvoke.mockResolvedValueOnce([]);
      await storageService.searchPasswords('github');
      expect(mockInvoke).toHaveBeenCalledWith('search_passwords', { query: 'github' });
    });
  });

  describe('authentication', () => {
    it('verifyMasterPassword calls verify_master_password', async () => {
      mockInvoke.mockResolvedValueOnce(true);
      const result = await storageService.verifyMasterPassword('pass');
      expect(mockInvoke).toHaveBeenCalledWith('verify_master_password', { password: 'pass' });
      expect(result).toBe(true);
    });

    it('changeMasterPassword calls change_master_password', async () => {
      mockInvoke.mockResolvedValueOnce(true);
      const result = await storageService.changeMasterPassword('old', 'new');
      expect(mockInvoke).toHaveBeenCalledWith('change_master_password', { currentPassword: 'old', newPassword: 'new' });
      expect(result).toBe(true);
    });
  });
});
