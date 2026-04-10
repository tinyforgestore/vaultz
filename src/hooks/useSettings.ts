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
    licenseStatus,
    licenseKeyInput,
    licenseActivating,
    licenseError,
    ...folderManager,

    setIsChangeMasterPasswordOpen,
    setIsExportVaultOpen,
    setIsDestroyVaultOpen,
    setLicenseKeyInput,

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
