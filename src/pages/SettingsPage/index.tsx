import { Trash2, Lock, Folder, ArrowLeft, Info, Download, ShieldOff, Search } from 'lucide-react';
import { version } from '../../../package.json';
import { Flex, Card, Button, Heading, Box, IconButton, TextField } from '@radix-ui/themes';
import { Toast } from '@/components/Toast';
import ChangeMasterPasswordModal from '@/components/modals/ChangeMasterPasswordModal';
import ExportVaultModal from '@/components/modals/ExportVaultModal';
import DestroyVaultModal from '@/components/modals/DestroyVaultModal';
import CreateFolderModal from '@/components/modals/CreateFolderModal';
import DeleteFolderModal from '@/components/modals/DeleteFolderModal';
import { useSettings } from '@/hooks/useSettings';
import { FOLDER_ICON_MAP } from '@/constants/folders';
import * as styles from './index.css';

export default function SettingsPage() {
  const {
    folders,
    isChangeMasterPasswordOpen,
    isExportVaultOpen,
    isDestroyVaultOpen,
    isCreateFolderOpen,
    isDeleteFolderOpen,
    selectedFolder,
    folderLimitAlert,
    folderFilter,
    filteredFolders,
    deleteFolderName,
    setIsChangeMasterPasswordOpen,
    setIsExportVaultOpen,
    setIsDestroyVaultOpen,
    setIsCreateFolderOpen,
    setIsDeleteFolderOpen,
    setSelectedFolder,
    setFolderFilter,
    handleBack,
    handleChangeMasterPassword,
    handleExportVault,
    handleDestroyVault,
    handleAddFolder,
    handleDeleteFolder,
    confirmChangeMasterPassword,
    confirmExportVault,
    confirmDestroyVault,
    confirmCreateFolder,
    confirmDeleteFolder,
  } = useSettings();

  return (
    <div className={styles.container}>
      <div className={styles.backButton}>
        <Button variant="ghost" size="1" onClick={handleBack}>
          <ArrowLeft size={14} />
          Back
        </Button>
      </div>

      <div className={styles.contentArea}>
        <Flex direction="column" gap="3">
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
                      <IconButton size="1" variant="ghost" color="red" onClick={() => handleDeleteFolder(folder.id)}>
                        <Trash2 size={14} />
                      </IconButton>
                    </Flex>
                  );
                })}
              </div>
              <Button size="1" variant="outline" onClick={handleAddFolder}>
                + Add New Folder
              </Button>
            </Flex>
          </Card>

          <Card size="1">
            <Flex direction="column" gap="2">
              <Heading size="2" style={{ color: 'var(--red-11)' }}>
                <Flex as="span" align="center" gap="1"><ShieldOff size={14} /> Danger Zone</Flex>
              </Heading>
              <Button
                size="1"
                variant="soft"
                color="red"
                onClick={handleDestroyVault}
                className={styles.securityButton}
              >
                Destroy Vault
              </Button>
            </Flex>
          </Card>

          <Card size="1">
            <Flex direction="column" gap="1">
              <Heading size="2">
                <Flex as="span" align="center" gap="1"><Info size={14} /> About</Flex>
              </Heading>
              <Box className={styles.aboutText}>Vaultz v{version}</Box>
              <Box className={styles.aboutText}>Built with Tauri + React</Box>
            </Flex>
          </Card>
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

      {isDestroyVaultOpen && (
        <DestroyVaultModal
          onConfirm={confirmDestroyVault}
          onCancel={() => setIsDestroyVaultOpen(false)}
        />
      )}

      {isCreateFolderOpen && (
        <CreateFolderModal
          onConfirm={confirmCreateFolder}
          onCancel={() => setIsCreateFolderOpen(false)}
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
    </div>
  );
}
