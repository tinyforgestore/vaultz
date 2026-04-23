import { Search, Settings, Plus, LogOut, CheckSquare, Trash2, Heart, HeartOff, Copy, Crown } from 'lucide-react';
import clsx from 'clsx';
import { useEffect, type RefObject } from 'react';
import vaultzLogo from '@/assets/vault-logo.png';
import { Flex, TextField, Box, IconButton, Text, Button } from '@radix-ui/themes';
import DeletePasswordModal from '@/components/modals/DeletePasswordModal';
import CreateFolderModal from '@/components/modals/CreateFolderModal';
import { useDashboard } from '@/hooks/useDashboard';
import { FOLDER_ICON_MAP } from '@/constants/folders';
import CreatePasswordModal from '@/components/modals/CreatePasswordModal';
import { Toast } from '@/components/Toast';
import { PasswordCard } from '@/components/PasswordCard';
import * as styles from './index.css';

export default function Dashboard() {
  const {
    passwords,
    folderNameMap,
    folderIconMap,
    folderCountMap,
    selectedFolder,
    searchQuery,
    isCreatePasswordOpen,
    isCreateFolderOpen,
    isSelectionMode,
    isBulkDeleteOpen,
    selectedIds,
    favoriteAlert,
    copiedId,
    clipboardToast,
    showFolderTag,
    visibleFolders,
    isPro,
    selectedIndex,
    passwordToDelete,
    searchInputRef,
    setSelectedFolder,
    setSearchQuery,
    setIsCreatePasswordOpen,
    setIsCreateFolderOpen,
    setActiveModal,
    setPendingLicenseKey,
    setIsBulkDeleteOpen,
    setSelectedIndex,
    setPasswordToDelete,
    handlePasswordClick,
    handleSettingsClick,
    handleLogout,
    toggleFavorite,
    handleCopyPassword,
    handleCreatePassword,
    handleAddFolder,
    confirmCreatePassword,
    confirmCreateFolder,
    confirmDeletePassword,
    toggleSelectionMode,
    toggleSelection,
    selectAll,
    deselectAll,
    handleBulkDelete,
    confirmBulkDelete,
    handleBulkToggleFavorite,
  } = useDashboard();

  useEffect(() => {
    const el = document.querySelector('[data-selected]');
    if (el && typeof (el as HTMLElement).scrollIntoView === 'function') {
      (el as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  return (
    <>
      <div className={styles.container}>
        <Flex direction="column" className={styles.mainContent}>
          <div className={styles.topPanel}>
            <div className={styles.brandRow} data-tauri-drag-region>
              <Flex align="center" gap="2">
                <div className={styles.brandLogo}>
                  <img src={vaultzLogo} width={32} height={32} alt="Vaultz" />
                </div>
                <span className={styles.brandName}>Vault</span>
              </Flex>
              <Flex gap="1">
                <IconButton size="1" variant={isSelectionMode ? 'solid' : 'ghost'} onClick={toggleSelectionMode} aria-label="Toggle selection mode">
                  <CheckSquare size={14} />
                </IconButton>
                <IconButton size="1" variant="ghost" onClick={handleSettingsClick} aria-label="Settings">
                  <Settings size={14} />
                </IconButton>
                <IconButton size="1" variant="ghost" color="red" onClick={handleLogout} aria-label="Log out">
                  <LogOut size={14} />
                </IconButton>
              </Flex>
            </div>

            <TextField.Root
              ref={searchInputRef as RefObject<HTMLDivElement>}
              placeholder="Search passwords..."
              size="2"
              className={styles.searchContainer}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ '--radius-2': '999px' } as React.CSSProperties}
            >
              <TextField.Slot>
                <Search size={15} />
              </TextField.Slot>
            </TextField.Root>

            {!isPro && (
              <div className={styles.upgradeBanner}>
                <Crown size={12} color="var(--amber-9)" />
                <span className={styles.upgradeBannerText}>Upgrade to Pro — Unlimited entries &amp; folders</span>
                <button
                  className={styles.upgradeBannerCta}
                  onClick={() => {
                    setPendingLicenseKey(null);
                    setActiveModal('upgrade');
                  }}
                >
                  Upgrade to Pro
                </button>
              </div>
            )}

            <div className={styles.tabStrip}>
              {visibleFolders.map((folder) => {
                const Icon = FOLDER_ICON_MAP[folder.icon] || FOLDER_ICON_MAP['folder'];
                return (
                  <button
                    key={folder.id}
                    className={clsx(styles.tab, selectedFolder === folder.id && styles.tabActive)}
                    onClick={() => setSelectedFolder(folder.id)}
                  >
                    <Icon size={12} />
                    {folder.name}
                    <span className={styles.folderCount}>{folderCountMap[folder.id] || 0}</span>
                  </button>
                );
              })}
              <button onClick={handleAddFolder} className={styles.newFolderButton}>
                <Plus size={12} />
                New Folder
              </button>
            </div>
          </div>

          <Flex direction="column" gap="2" className={styles.passwordList}>
            {passwords.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <Search size={22} />
                </div>
                <Text size="2">No passwords found</Text>
              </div>
            ) : (
              passwords.map((password, index) => (
                <PasswordCard
                  key={password.id}
                  password={password}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedIds.has(password.id)}
                  isKeyboardSelected={selectedIndex === index}
                  copiedId={copiedId}
                  showFolderTag={showFolderTag}
                  folderName={folderNameMap[password.folderId]}
                  folderIcon={folderIconMap[password.folderId]}
                  onCardClick={() => handlePasswordClick(password.id)}
                  onCopyPassword={() => handleCopyPassword(password.id, password.password)}
                  onToggleFavorite={() => toggleFavorite(password.id)}
                  onToggleSelection={() => toggleSelection(password.id)}
                  onSelect={() => setSelectedIndex(index)}
                />
              ))
            )}
          </Flex>

          {isSelectionMode ? (
            <Box className={styles.bulkToolbar}>
              <Flex align="center" gap="2">
                <Text size="1" weight="medium">{selectedIds.size} selected</Text>
                <Button size="1" variant="ghost" onClick={selectedIds.size === passwords.length ? deselectAll : selectAll}>
                  {selectedIds.size === passwords.length ? 'Deselect All' : 'Select All'}
                </Button>
              </Flex>
              <Flex gap="1">
                <Button size="1" variant="soft" onClick={() => handleBulkToggleFavorite(true)} disabled={selectedIds.size === 0}>
                  <Heart size={12} /> Favorite
                </Button>
                <Button size="1" variant="soft" onClick={() => handleBulkToggleFavorite(false)} disabled={selectedIds.size === 0}>
                  <HeartOff size={12} /> Unfavorite
                </Button>
                <Button size="1" variant="soft" color="red" onClick={handleBulkDelete} disabled={selectedIds.size === 0}>
                  <Trash2 size={12} /> Delete
                </Button>
              </Flex>
            </Box>
          ) : (
            <Box className={styles.floatingButtonContainer}>
              <IconButton size="3" radius="full" onClick={handleCreatePassword} className={styles.floatingButton} aria-label="Add password">
                <Plus size={20} />
              </IconButton>
            </Box>
          )}

        </Flex>
      </div>

      {isCreatePasswordOpen && (
        <CreatePasswordModal
          onConfirm={confirmCreatePassword}
          onCancel={() => setIsCreatePasswordOpen(false)}
        />
      )}

      {isCreateFolderOpen && (
        <CreateFolderModal
          onConfirm={confirmCreateFolder}
          onCancel={() => setIsCreateFolderOpen(false)}
        />
      )}

      {isBulkDeleteOpen && (
        <DeletePasswordModal
          passwordName={selectedIds.size}
          onConfirm={confirmBulkDelete}
          onCancel={() => setIsBulkDeleteOpen(false)}
        />
      )}

      {passwordToDelete && (
        <DeletePasswordModal
          passwordName={passwordToDelete.name}
          onConfirm={confirmDeletePassword}
          onCancel={() => setPasswordToDelete(null)}
        />
      )}

      {favoriteAlert && (
        <Box className={clsx(styles.toastContainer, styles.toastDefault)}>
          <Toast message={favoriteAlert} variant="warning" />
        </Box>
      )}

      {clipboardToast && (
        <Box className={clsx(styles.toastContainer, favoriteAlert ? styles.toastElevated : styles.toastDefault)}>
          <Toast message={clipboardToast} icon={<Copy size={14} />} />
        </Box>
      )}

    </>
  );
}
