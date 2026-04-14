import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtomValue, useSetAtom } from 'jotai';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { VAULT_FILE_FILTER } from '@/constants/vault';
import { changeMasterPasswordAtom, licenseStatusAtom, isProAtom, logoutAtom, activeModalAtom } from '@/store/atoms';
import { LicenseStatus } from '@/types/license';
import { useFolderManager } from './useFolderManager';

export function useSettings() {
  const [isChangeMasterPasswordOpen, setIsChangeMasterPasswordOpen] = useState(false);
  const [isExportVaultOpen, setIsExportVaultOpen] = useState(false);
  const [isDestroyVaultOpen, setIsDestroyVaultOpen] = useState(false);
  const [lockTimeout, setLockTimeout] = useState<number | null>(null);
  const [lockTimeoutError, setLockTimeoutError] = useState<string | null>(null);
  const setLicenseStatus = useSetAtom(licenseStatusAtom);
  const isPro = useAtomValue(isProAtom);
  const setActiveModal = useSetAtom(activeModalAtom);

  const changeMasterPassword = useSetAtom(changeMasterPasswordAtom);
  const logout = useSetAtom(logoutAtom);
  const navigate = useNavigate();

  const folderManager = useFolderManager();

  useEffect(() => {
    invoke<LicenseStatus>('get_license_status')
      .then((status) => setLicenseStatus(status))
      .catch(() => setLicenseStatus(null));

    invoke<boolean>('validate_license')
      .then((isActive) => setLicenseStatus({ is_active: isActive }))
      .catch(() => { /* keep status from above */ });

    invoke<number | null>('get_lock_timeout')
      .then((val) => setLockTimeout(val))
      .catch(() => {
        console.warn('get_lock_timeout: failed to load, keeping default');
      });
  }, [setLicenseStatus]);

  const handleSetLockTimeout = (minutes: number | null) => {
    return invoke('set_lock_timeout', { minutes })
      .then(() => {
        setLockTimeoutError(null);
        setLockTimeout(minutes);
      })
      .catch((err: unknown) => {
        console.error('Error setting lock timeout:', err);
        setLockTimeoutError('Failed to save lock timeout');
      });
  };

  const handleBack = () => navigate('/dashboard');
  const handleChangeMasterPassword = () => setIsChangeMasterPasswordOpen(true);
  const handleExportVault = () => setIsExportVaultOpen(true);
  const handleDestroyVault = () => setIsDestroyVaultOpen(true);

  const confirmDestroyVault = () => {
    return invoke('destroy_vault')
      .then(() => {
        logout();
        navigate('/login');
      })
      .catch((err: unknown) => {
        console.error('Error destroying vault:', err);
      });
  };

  const confirmExportVault = (passphrase: string) => {
    return save({
      defaultPath: 'vault-export.pmvault',
      filters: [VAULT_FILE_FILTER],
    }).then((path) => {
      if (!path) return;
      return invoke('export_vault', { passphrase, path }).then(() => {
        setIsExportVaultOpen(false);
      });
    });
  };

  const confirmChangeMasterPassword = (currentPassword: string, newPassword: string) => {
    return changeMasterPassword({ currentPassword, newPassword })
      .then((success) => {
        if (success) {
          setIsChangeMasterPasswordOpen(false);
        } else {
          console.error('Failed to change master password');
        }
      })
      .catch((err: unknown) => {
        console.error('Error changing master password:', err);
      });
  };

  return {
    isChangeMasterPasswordOpen,
    isExportVaultOpen,
    isDestroyVaultOpen,
    lockTimeout,
    lockTimeoutError,
    isPro,
    setActiveModal,
    ...folderManager,

    setIsChangeMasterPasswordOpen,
    setIsExportVaultOpen,
    setIsDestroyVaultOpen,

    handleBack,
    handleChangeMasterPassword,
    handleExportVault,
    handleDestroyVault,
    handleSetLockTimeout,
    confirmChangeMasterPassword,
    confirmExportVault,
    confirmDestroyVault,
  };
}
