import { useCallback } from 'react';
import { Trash2, Pencil, Lock, Folder, ArrowLeft, Download, ShieldOff, Search, Crown, Keyboard, Sun } from 'lucide-react';
import { version, homepage } from '../../../package.json';
import tinyForgeLogo from '@/assets/tinyforge-logo.svg';
import { Flex, Card, Button, Heading, Box, IconButton, TextField, Text, Select } from '@radix-ui/themes';
import ChangeMasterPasswordModal from '@/components/modals/ChangeMasterPasswordModal';
import ExportVaultModal from '@/components/modals/ExportVaultModal';
import CreateFolderModal from '@/components/modals/CreateFolderModal';
import EditFolderModal from '@/components/modals/EditFolderModal';
import DeleteFolderModal from '@/components/modals/DeleteFolderModal';
import { useSettings } from '@/hooks/useSettings';
import { useTheme, Theme } from '@/hooks/useTheme';
import { FOLDER_ICON_MAP } from '@/constants/folders';
import * as styles from './index.css';

export default function SettingsPage() {
  const contentRef = useCallback((node: HTMLDivElement | null) => {
    // preventScroll: true — without this, focus() triggers the browser's scroll-into-view
    // algorithm on ancestor containers (incl. the Radix Theme div), shifting the scroll
    // offset and pulling the Dashboard header toward the traffic lights on return navigation.
    if (node) node.focus({ preventScroll: true });
  }, []);

  const { theme, setTheme } = useTheme();

  const {
    isChangeMasterPasswordOpen,
    isExportVaultOpen,
    isDestroyVaultOpen,
    isDeactivateLicenseOpen,
    isCreateFolderOpen,
    isDeleteFolderOpen,
    lockTimeout,
    lockTimeoutError,
    isPro,
    licenseStatus,
    selectedFolder,
    editingFolder,
    folderFilter,
    filteredFolders,
    deleteFolderName,
    setIsChangeMasterPasswordOpen,
    setIsExportVaultOpen,
    setIsDestroyVaultOpen,
    setIsDeactivateLicenseOpen,
    setIsCreateFolderOpen,
    setIsDeleteFolderOpen,
    setSelectedFolder,
    setFolderFilter,
    handleBack,
    handleChangeMasterPassword,
    handleExportVault,
    handleDestroyVault,
    handleDeactivateLicense,
    handleAddFolder,
    handleEditFolder,
    handleCancelEdit,
    handleDeleteFolder,
    handleSetLockTimeout,
    confirmChangeMasterPassword,
    confirmExportVault,
    confirmDestroyVault,
    confirmDeactivateLicense,
    confirmCreateFolder,
    confirmEditFolder,
    confirmDeleteFolder,
    setActiveModal,
  } = useSettings();

  return (
    <div className={styles.container}>
      <div className={styles.header} data-tauri-drag-region>
        <IconButton size="1" variant="ghost" onClick={handleBack} aria-label="Go back">
          <ArrowLeft size={16} />
        </IconButton>
        <span className={styles.headerTitle}>Settings</span>
      </div>

      <div className={styles.contentArea} ref={contentRef} tabIndex={-1}>
        <Flex direction="column" gap="3">
          {/* License — first card */}
          {isPro ? (
            <Card size="1">
              <Flex direction="column" gap="2">
                <Heading size="2">
                  <Flex as="span" align="center" gap="1"><Crown size={14} color="var(--amber-9)" /> Pro License</Flex>
                </Heading>
                {licenseStatus?.activation_usage != null && licenseStatus?.activation_limit != null && (
                  <Text size="1" color="gray">
                    {licenseStatus.activation_usage} of {licenseStatus.activation_limit} devices activated
                  </Text>
                )}
                {isDeactivateLicenseOpen ? (
                  <>
                    <Text size="2" color="gray">
                      This will deactivate your license on this device. You can re-activate it later.
                    </Text>
                    <Flex gap="2">
                      <Button size="1" variant="soft" color="gray" onClick={() => setIsDeactivateLicenseOpen(false)} className={styles.dangerActionButton}>
                        Cancel
                      </Button>
                      <Button size="1" color="red" onClick={confirmDeactivateLicense} className={styles.dangerActionButton}>
                        Deactivate
                      </Button>
                    </Flex>
                  </>
                ) : (
                  <Button size="1" variant="soft" color="red" onClick={handleDeactivateLicense}>
                    Deactivate License
                  </Button>
                )}
              </Flex>
            </Card>
          ) : (
            <Card size="1" className={styles.upgradeCard}>
              <Flex direction="column" gap="2">
                <Heading size="2">
                  <Flex as="span" align="center" gap="1"><Crown size={14} color="var(--amber-9)" /> Upgrade to Pro</Flex>
                </Heading>
                <Button size="1" variant="soft" color="amber" onClick={() => setActiveModal('activate')}>
                  Activate Pro License
                </Button>
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
              <Flex direction="column" gap="1">
                <Flex align="center" justify="between" gap="2">
                  <Text size="1" color="gray">Lock screen timeout</Text>
                  <Select.Root
                    size="1"
                    value={lockTimeout === null ? 'never' : String(lockTimeout)}
                    onValueChange={(val) => handleSetLockTimeout(val === 'never' ? null : Number(val))}
                  >
                    <Select.Trigger aria-label="Lock screen timeout" />
                    <Select.Content>
                      {/* Lock timeout options — must match ALLOWED_MINUTES in src-tauri/src/commands/settings.rs */}
                      <Select.Item value="1">1 minute</Select.Item>
                      <Select.Item value="5">5 minutes</Select.Item>
                      <Select.Item value="15">15 minutes</Select.Item>
                      <Select.Item value="30">30 minutes</Select.Item>
                      <Select.Item value="never">Never</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Flex>
                {lockTimeoutError && (
                  <Text size="1" color="red">{lockTimeoutError}</Text>
                )}
              </Flex>
            </Flex>
          </Card>

          {/* Appearance */}
          <Card size="1">
            <Flex direction="column" gap="2">
              <Heading size="2">
                <Flex as="span" align="center" gap="1"><Sun size={14} /> Appearance</Flex>
              </Heading>
              <Flex align="center" justify="between" gap="2">
                <Text size="1" color="gray">Theme</Text>
                <Select.Root value={theme} onValueChange={(val) => setTheme(val as Theme)}>
                  <Select.Trigger aria-label="Theme" />
                  <Select.Content>
                    <Select.Item value="system">System</Select.Item>
                    <Select.Item value="light">Light</Select.Item>
                    <Select.Item value="dark">Dark</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Flex>
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
                        <IconButton size="1" variant="ghost" aria-label={`Edit ${folder.name}`} onClick={() => handleEditFolder(folder)}>
                          <Pencil size={14} />
                        </IconButton>
                        <IconButton size="1" variant="ghost" color="red" aria-label={`Delete ${folder.name}`} onClick={() => handleDeleteFolder(folder.id)}>
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

          {/* Keyboard Shortcuts */}
          <Card size="1">
            <Flex direction="column" gap="2">
              <Heading size="2">
                <Flex as="span" align="center" gap="1"><Keyboard size={14} /> Keyboard Shortcuts</Flex>
              </Heading>
              <Flex direction="column" gap="1">
                {(
                  [
                    ['Focus search', ['/', '⌘K']],
                    ['Navigate items', ['↑', '↓']],
                    ['Switch folders', ['←', '→']],
                    ['Open item', ['↵']],
                    ['Copy password', ['C']],
                    ['Toggle favorite', ['F']],
                    ['New password', ['N']],
                    ['New folder', ['⇧N']],
                    ['Delete item', ['Del']],
                    ['Toggle select mode', ['X']],
                    ['Toggle item (select mode)', ['Space']],
                    ['Clear search / deselect', ['Esc']],
                    ['Go to Settings', ['⌘,']],
                    ['Logout', ['⌘⇧L']],
                  ] as [string, string[]][]
                ).map(([action, keys]) => (
                  <Flex key={action} justify="between" align="center" gap="2">
                    <Text size="1" color="gray">{action}</Text>
                    <Flex gap="1" align="center" flexShrink="0">
                      {keys.map((k) => (
                        <kbd key={k} className={styles.kbdKey}>{k}</kbd>
                      ))}
                    </Flex>
                  </Flex>
                ))}
              </Flex>
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
            {isPro ? (
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

    </div>
  );
}
