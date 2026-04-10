import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtom, useSetAtom } from 'jotai';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { VAULT_FILE_FILTER } from '@/constants/vault';
import { changeMasterPasswordAtom, licenseStatusAtom, logoutAtom } from '@/store/atoms';
import { LicenseStatus } from '@/types/license';
import { useFolderManager } from './useFolderManager';

export function useSettings() {
  const [isChangeMasterPasswordOpen, setIsChangeMasterPasswordOpen] = useState(false);
  const [isExportVaultOpen, setIsExportVaultOpen] = useState(false);
  const [isDestroyVaultOpen, setIsDestroyVaultOpen] = useState(false);
  const [licenseStatus, setLicenseStatus] = useAtom(licenseStatusAtom);
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [licenseActivating, setLicenseActivating] = useState(false);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [showProWelcome, setShowProWelcome] = useState(false);

  const changeMasterPassword = useSetAtom(changeMasterPasswordAtom);
  const logout = useSetAtom(logoutAtom);
  const navigate = useNavigate();

  const folderManager = useFolderManager();

  useEffect(() => {
    // Fetch current local status immediately.
    invoke<LicenseStatus>('get_license_status')
      .then((status) => setLicenseStatus(status))
      .catch(() => setLicenseStatus(null));

    // Trigger online re-validation; if >7 days have passed Gumroad is contacted
    // and a revoked license is evicted from the DB immediately.
    invoke<boolean>('validate_license')
      .then(() => invoke<LicenseStatus>('get_license_status'))
      .then((status) => setLicenseStatus(status))
      .catch(() => {
        // Network or other error — keep the status from the local check above.
      });
  }, []);

  const activateLicense = (key: string) => {
    setLicenseActivating(true);
    setLicenseError(null);
    return invoke('activate_license', { key })
      .then(() => invoke<LicenseStatus>('get_license_status'))
      .then((status) => {
        setLicenseStatus(status);
        setLicenseKeyInput('');
        setShowProWelcome(true);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setLicenseError(msg || 'Activation failed');
      })
      .finally(() => {
        setLicenseActivating(false);
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
    licenseStatus,
    licenseKeyInput,
    licenseActivating,
    licenseError,
    showProWelcome,
    ...folderManager,

    setIsChangeMasterPasswordOpen,
    setIsExportVaultOpen,
    setIsDestroyVaultOpen,
    setLicenseKeyInput,
    setShowProWelcome,

    handleBack,
    handleChangeMasterPassword,
    handleExportVault,
    handleDestroyVault,
    activateLicense,
    confirmChangeMasterPassword,
    confirmExportVault,
    confirmDestroyVault,
  };
}
