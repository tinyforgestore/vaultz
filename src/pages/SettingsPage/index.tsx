import { Trash2, Pencil, Lock, Folder, ArrowLeft, Download, ShieldOff, Search, Crown } from 'lucide-react';
import { version, homepage } from '../../../package.json';
import tinyForgeLogo from '@/assets/tinyforge-logo.svg';
import { Flex, Card, Button, Heading, Box, IconButton, TextField, Text } from '@radix-ui/themes';
import { Toast } from '@/components/Toast';
import ChangeMasterPasswordModal from '@/components/modals/ChangeMasterPasswordModal';
import ExportVaultModal from '@/components/modals/ExportVaultModal';
import CreateFolderModal from '@/components/modals/CreateFolderModal';
import EditFolderModal from '@/components/modals/EditFolderModal';
import DeleteFolderModal from '@/components/modals/DeleteFolderModal';
import { useSettings } from '@/hooks/useSettings';
import { FOLDER_ICON_MAP } from '@/constants/folders';
import * as styles from './index.css';

export default function SettingsPage() {
  const {
    isChangeMasterPasswordOpen,
    isExportVaultOpen,
    isDestroyVaultOpen,
    isCreateFolderOpen,
    isDeleteFolderOpen,
    licenseStatus,
    licenseKeyInput,
    licenseActivating,
    licenseError,
    showProWelcome,
    selectedFolder,
    editingFolder,
    folderLimitAlert,
    folderFilter,
    filteredFolders,
    deleteFolderName,
    setIsChangeMasterPasswordOpen,
    setIsExportVaultOpen,
    setIsDestroyVaultOpen,
    setIsCreateFolderOpen,
    setIsDeleteFolderOpen,
    setLicenseKeyInput,
    setSelectedFolder,
    setFolderFilter,
    setShowProWelcome,
    handleBack,
    handleChangeMasterPassword,
    handleExportVault,
    handleDestroyVault,
    handleAddFolder,
    handleEditFolder,
    handleCancelEdit,
    handleDeleteFolder,
    activateLicense,
    confirmChangeMasterPassword,
    confirmExportVault,
    confirmDestroyVault,
    confirmCreateFolder,
    confirmEditFolder,
    confirmDeleteFolder,
  } = useSettings();

  return (
    <div className={styles.container}>
      <div className={styles.header} data-tauri-drag-region>
        <IconButton size="1" variant="ghost" onClick={handleBack}>
          <ArrowLeft size={16} />
        </IconButton>
        <span className={styles.headerTitle}>Settings</span>
      </div>

      <div className={styles.contentArea}>
        <Flex direction="column" gap="3">
          {/* License (free only) — first card */}
          {!licenseStatus?.is_active && (
            <Card size="1" className={styles.licenseCard}>
              <Flex direction="column" gap="3">
                <Flex align="center" gap="2">
                  <div className={styles.licenseIconWrap}>
                    <Crown size={16} color="var(--amber-9)" />
                  </div>
                  <Heading size="3">Activate Pro License</Heading>
                </Flex>
                <Text size="2" color="gray">Enter your license key to unlock unlimited entries and folders.</Text>
                <Flex gap="2">
                  <TextField.Root
                    size="2"
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    value={licenseKeyInput}
                    onChange={(e) => setLicenseKeyInput(e.target.value)}
                    className={styles.licenseInput}
                  />
                  <Button
                    size="2"
                    disabled={licenseActivating || licenseKeyInput.trim() === ''}
                    onClick={() => activateLicense(licenseKeyInput.trim())}
                  >
                    {licenseActivating ? 'Activating…' : 'Activate'}
                  </Button>
                </Flex>
                {licenseError && <Text size="1" color="red">{licenseError}</Text>}
              </Flex>
            </Card>
          )}

          {/* Security */}
          <Card size="1">
            <Flex direction="column" gap="2">
              <Heading size="2">
                <Flex as="span" align="center" gap="1"><Lock size={14} /> Security</Flex>
              </Heading>
              <Button
                size="1"
                variant="soft"
                onClick={handleChangeMasterPassword}
                className={styles.securityButton}
              >
                Change Master Password
              </Button>
            </Flex>
          </Card>

          {/* Backup */}
          <Card size="1">
            <Flex direction="column" gap="2">
              <Heading size="2">
                <Flex as="span" align="center" gap="1"><Download size={14} /> Backup</Flex>
              </Heading>
              <Button
                size="1"
                variant="soft"
                onClick={handleExportVault}
                className={styles.securityButton}
              >
                Export Vault
              </Button>
            </Flex>
          </Card>

          {/* Folders */}
          <Card size="1">
            <Flex direction="column" gap="2">
              <Heading size="2">
                <Flex as="span" align="center" gap="1"><Folder size={14} /> Folders</Flex>
              </Heading>
              <TextField.Root
                size="1"
                placeholder="Filter folders..."
                value={folderFilter}
                onChange={(e) => setFolderFilter(e.target.value)}
              >
                <TextField.Slot>
                  <Search size={12} />
                </TextField.Slot>
              </TextField.Root>
              <div className={styles.folderList}>
                {filteredFolders.map((folder) => {
                  const Icon = FOLDER_ICON_MAP[folder.icon] || FOLDER_ICON_MAP['folder'];
                  return (
                    <Flex key={folder.id} justify="between" align="center" className={styles.folderRow}>
                      <Flex align="center" gap="2">
                        <Icon size={14} />
                        <Box>{folder.name}</Box>
                      </Flex>
                      <Flex gap="1">
                        <IconButton size="1" variant="ghost" onClick={() => handleEditFolder(folder)}>
                          <Pencil size={14} />
                        </IconButton>
                        <IconButton size="1" variant="ghost" color="red" onClick={() => handleDeleteFolder(folder.id)}>
                          <Trash2 size={14} />
                        </IconButton>
                      </Flex>
                    </Flex>
                  );
                })}
              </div>
              <Button size="1" variant="outline" onClick={handleAddFolder}>
                + Add New Folder
              </Button>
            </Flex>
          </Card>

          {/* Danger Zone */}
          <Card size="1" className={styles.dangerCard}>
            <Flex direction="column" gap="2">
              <Heading size="2" className={styles.dangerHeading}>
                <Flex as="span" align="center" gap="1"><ShieldOff size={14} /> Danger Zone</Flex>
              </Heading>
              {isDestroyVaultOpen ? (
                <>
                  <Text size="2" color="gray">
                    This will permanently destroy all vault data. This cannot be undone.
                  </Text>
                  <Flex gap="2">
                    <Button size="1" variant="soft" color="gray" onClick={() => setIsDestroyVaultOpen(false)} className={styles.dangerActionButton}>
                      Cancel
                    </Button>
                    <Button size="1" color="red" onClick={confirmDestroyVault} className={styles.dangerActionButton}>
                      Destroy Vault
                    </Button>
                  </Flex>
                </>
              ) : (
                <Button
                  size="1"
                  variant="soft"
                  color="red"
                  onClick={handleDestroyVault}
                  className={styles.securityButton}
                >
                  Destroy Vault
                </Button>
              )}
            </Flex>
          </Card>

          {/* About section */}
          <Flex direction="column" align="center" gap="2" mt="5">
            {licenseStatus?.is_active ? (
              <span className={styles.membershipPlanPro}>
                <Crown size={12} color="var(--amber-9)" /> Pro Member
              </span>
            ) : (
              <span className={styles.membershipPlanFree}>Free Member</span>
            )}

            <Flex align="center" gap="2">
              <img src={tinyForgeLogo} alt="Tiny Forge" width={24} height={24} />
              <span className={styles.aboutFooter}>
                Vaultz v{version} &copy; {new Date().getFullYear()}{' '}
                <a href={homepage} target="_blank" rel="noopener noreferrer">Tiny Forge</a>
              </span>
            </Flex>
          </Flex>
        </Flex>
      </div>

      {isChangeMasterPasswordOpen && (
        <ChangeMasterPasswordModal
          onConfirm={confirmChangeMasterPassword}
          onCancel={() => setIsChangeMasterPasswordOpen(false)}
        />
      )}

      {isExportVaultOpen && (
        <ExportVaultModal
          onConfirm={confirmExportVault}
          onCancel={() => setIsExportVaultOpen(false)}
        />
      )}

      {isCreateFolderOpen && (
        <CreateFolderModal
          onConfirm={confirmCreateFolder}
          onCancel={() => setIsCreateFolderOpen(false)}
        />
      )}

      {editingFolder && (
        <EditFolderModal
          initialData={{ name: editingFolder.name, icon: editingFolder.icon }}
          onConfirm={confirmEditFolder}
          onCancel={handleCancelEdit}
        />
      )}

      {isDeleteFolderOpen && selectedFolder && (
        <DeleteFolderModal
          folderName={deleteFolderName}
          onConfirm={confirmDeleteFolder}
          onCancel={() => {
            setIsDeleteFolderOpen(false);
            setSelectedFolder(null);
          }}
        />
      )}

      {folderLimitAlert && (
        <Box className={styles.toastContainer}>
          <Toast message={folderLimitAlert} variant="warning" />
        </Box>
      )}

      {showProWelcome && (
        <div className={styles.proWelcomeOverlay} onClick={() => setShowProWelcome(false)}>
          <div className={styles.proWelcomeContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.proWelcomeIconWrap}>
              <Crown size={44} color="white" />
            </div>
            <h2 className={styles.proWelcomeTitle}>Welcome to Pro!</h2>
            <p className={styles.proWelcomeSubtitle}>You now have unlimited entries and folders. Enjoy the full Vaultz experience!</p>
            <button className={styles.proWelcomeDismiss} onClick={() => setShowProWelcome(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
