import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { VAULT_FILE_FILTER } from '@/constants/vault';
import { useLogin } from './useLogin';
import { useCreateMasterPassword } from './useCreateMasterPassword';

export function useLoginPage() {
  const login = useLogin();
  const createMasterPassword = useCreateMasterPassword();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [isCheckingDatabase, setIsCheckingDatabase] = useState(true);
  const [isDatabaseExist, setIsDatabaseExist] = useState(false);
  const [importFilePath, setImportFilePath] = useState<string | null>(null);
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [vaultCreated, setVaultCreated] = useState(false);

  useEffect(() => {
    if (!importSuccess) return;
    const timer = setTimeout(() => setImportSuccess(false), 3000);
    return () => clearTimeout(timer);
  }, [importSuccess]);

  useEffect(() => {
    if (!vaultCreated) return;
    const timer = setTimeout(() => setVaultCreated(false), 3000);
    return () => clearTimeout(timer);
  }, [vaultCreated]);

  useEffect(() => {
    if (!login.error) return;
    setShaking(true);
    const timer = setTimeout(() => setShaking(false), 400);
    return () => clearTimeout(timer);
  }, [login.error]);

  useEffect(() => {
    let cancelled = false;
    invoke<boolean>('database_exists')
      .then(exists => { if (!cancelled) setIsDatabaseExist(exists); })
      .catch(err => console.error('Failed to check database:', err))
      .finally(() => { if (!cancelled) setIsCheckingDatabase(false); });
    return () => { cancelled = true; };
  }, []);

  const handleCreateMasterPassword = () => {
    createMasterPassword.createMasterPassword()
      .then(success => {
        if (!success) return;
        setShowCreateModal(false);
        setShowLoadingModal(true);
        setTimeout(() => {
          setShowLoadingModal(false);
          setIsDatabaseExist(true);
          setVaultCreated(true);
        }, 500);
      });
  };

  const handleImportVault = () => {
    open({ multiple: false, filters: [VAULT_FILE_FILTER] })
      .then(path => { if (typeof path === 'string') setImportFilePath(path); })
      .catch(() => {});
  };

  const confirmImportVault = (passphrase: string): Promise<void> => {
    return invoke('import_vault', { passphrase, path: importFilePath })
      .then(() => {
        setImportFilePath(null);
        setImportSuccess(true);
        setIsDatabaseExist(true);
      })
      .catch(err => { console.error('Failed to import vault:', err); });
  };

  return {
    ...login,
    createMasterPassword,
    showCreateModal,
    setShowCreateModal,
    showLoadingModal,
    isCheckingDatabase,
    isDatabaseExist,
    importFilePath,
    setImportFilePath,
    showMasterPassword,
    setShowMasterPassword,
    shaking,
    handleCreateMasterPassword,
    handleImportVault,
    confirmImportVault,
    importSuccess,
    vaultCreated,
  };
}
