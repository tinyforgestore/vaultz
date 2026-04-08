import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import vaultLogo from '@/assets/vault-logo.png';
import { Flex, Dialog, Text } from '@radix-ui/themes';
import { CreateMasterPasswordModal } from '@/components/modals/CreateMasterPasswordModal';
import ImportVaultModal from '@/components/modals/ImportVaultModal';
import { useLoginPage } from '@/hooks/useLoginPage';
import * as styles from './index.css';

export default function LoginPage() {
  const {
    masterPassword,
    setMasterPassword,
    error,
    isLoading,
    handleLogin,
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
  } = useLoginPage();

  if (isCheckingDatabase) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.lockIconBox}>
            <img src={vaultLogo} alt="Vault" className={styles.lockIcon} />
          </div>
          <h1 className={styles.cardTitle}>Vaultz</h1>
          <p className={styles.cardSubtitle}>Checking database...</p>
        </div>
      </div>
    );
  }

  if (!isDatabaseExist) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.lockIconBox}>
            <img src={vaultLogo} alt="Vault" className={styles.lockIcon} />
          </div>
          <h1 className={styles.cardTitle}>Welcome to Vaultz</h1>
          <p className={styles.cardSubtitle}>
            Start by creating your vault to securely store and manage all your passwords in one place.
          </p>
          <div className={styles.welcomeActions}>
            <button className={styles.createButton} onClick={() => setShowCreateModal(true)}>
              Create Vault
            </button>
            <button className={styles.importButton} onClick={handleImportVault}>
              Import Existing Vault
            </button>
          </div>
        </div>

        <CreateMasterPasswordModal
          open={showCreateModal}
          password={createMasterPassword.password}
          confirmPassword={createMasterPassword.confirmPassword}
          error={createMasterPassword.error}
          isLoading={createMasterPassword.isLoading}
          onPasswordChange={createMasterPassword.setPassword}
          onConfirmPasswordChange={createMasterPassword.setConfirmPassword}
          onCreate={handleCreateMasterPassword}
        />

        <Dialog.Root open={showLoadingModal}>
          <Dialog.Content style={{ maxWidth: 380 }}>
            <Dialog.Title>Setting Up Your Vault</Dialog.Title>
            <Dialog.Description size="2" mb="4">
              Creating encrypted database and default folders...
            </Dialog.Description>
            <Flex justify="center" py="4">
              <Text size="2">Please wait...</Text>
            </Flex>
          </Dialog.Content>
        </Dialog.Root>

        {importFilePath && (
          <ImportVaultModal
            filePath={importFilePath}
            isReplacing={false}
            onConfirm={confirmImportVault}
            onCancel={() => setImportFilePath(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.card}${shaking ? ` ${styles.cardShaking}` : ''}`}>
        <div className={styles.lockIconBox}>
          <img src={vaultLogo} alt="Vault" className={styles.lockIcon} />
        </div>

        <h1 className={styles.cardTitle}>Vaultz</h1>
        <p className={styles.cardSubtitle}>Enter your master password</p>

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputWrapper}>
            <input
              type={showMasterPassword ? 'text' : 'password'}
              placeholder="Master password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              disabled={isLoading}
              className={styles.passwordInput}
              autoFocus
            />
            <button
              type="button"
              className={styles.eyeToggle}
              onClick={() => setShowMasterPassword(s => !s)}
              tabIndex={-1}
            >
              {showMasterPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <p className={styles.errorText}>{error}</p>}

          <button
            type="submit"
            disabled={isLoading || !masterPassword}
            className={styles.unlockButton}
          >
            <ShieldCheck size={18} />
            {isLoading ? 'Unlocking...' : 'Unlock Vault'}
          </button>

          <button type="button" className={styles.restoreLink} onClick={handleImportVault}>
            Restore from backup
          </button>
        </form>
      </div>

      {importFilePath && (
        <ImportVaultModal
          filePath={importFilePath}
          isReplacing={true}
          onConfirm={confirmImportVault}
          onCancel={() => setImportFilePath(null)}
        />
      )}
    </div>
  );
}
