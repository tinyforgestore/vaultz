import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetAtom } from 'jotai';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { VAULT_FILE_FILTER } from '@/constants/vault';
import { changeMasterPasswordAtom, logoutAtom } from '@/store/atoms';
import { useFolderManager } from './useFolderManager';

export function useSettings() {
  const [isChangeMasterPasswordOpen, setIsChangeMasterPasswordOpen] = useState(false);
  const [isExportVaultOpen, setIsExportVaultOpen] = useState(false);
  const [isDestroyVaultOpen, setIsDestroyVaultOpen] = useState(false);

  const changeMasterPassword = useSetAtom(changeMasterPasswordAtom);
  const logout = useSetAtom(logoutAtom);
  const navigate = useNavigate();

  const folderManager = useFolderManager();

  const handleBack = () => navigate('/dashboard');
  const handleChangeMasterPassword = () => setIsChangeMasterPasswordOpen(true);
  const handleExportVault = () => setIsExportVaultOpen(true);
  const handleDestroyVault = () => setIsDestroyVaultOpen(true);

  const confirmDestroyVault = async () => {
    try {
      await invoke('destroy_vault');
      logout();
      navigate('/login');
    } catch (err) {
      console.error('Error destroying vault:', err);
    }
  };

  const confirmExportVault = async (passphrase: string) => {
    const path = await save({
      defaultPath: 'vault-export.pmvault',
      filters: [VAULT_FILE_FILTER],
    });
    if (!path) return;
    await invoke('export_vault', { passphrase, path });
    setIsExportVaultOpen(false);
  };

  const confirmChangeMasterPassword = async (currentPassword: string, newPassword: string) => {
    try {
      const success = await changeMasterPassword({ currentPassword, newPassword });
      if (success) {
        setIsChangeMasterPasswordOpen(false);
      } else {
        console.error('Failed to change master password');
      }
    } catch (err) {
      console.error('Error changing master password:', err);
    }
  };

  return {
    isChangeMasterPasswordOpen,
    isExportVaultOpen,
    isDestroyVaultOpen,
    ...folderManager,

    setIsChangeMasterPasswordOpen,
    setIsExportVaultOpen,
    setIsDestroyVaultOpen,

    handleBack,
    handleChangeMasterPassword,
    handleExportVault,
    handleDestroyVault,
    confirmChangeMasterPassword,
    confirmExportVault,
    confirmDestroyVault,
  };
}
