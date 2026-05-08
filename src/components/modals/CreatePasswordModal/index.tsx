import { Dialog, Flex, TextField, Button, TextArea, Select, Box, IconButton, Popover } from '@radix-ui/themes';
import { KeyRound, Eye, EyeOff, Plus, Search, Check } from 'lucide-react';
import { useAtomValue } from 'jotai';
import { foldersAtom } from '@/store/atoms';
import { useLimitCheck } from '@/hooks/useLimitCheck';
import PasswordGenerator from '@/components/PasswordGenerator';
import CreateFolderModal from '@/components/modals/CreateFolderModal';
import { FaviconAvatar } from '@/components/FaviconAvatar';
import { useCreatePassword } from '@/hooks/useCreatePassword';
import { Password, PasswordFormData } from '@/types';
import { lookupIcon, type FaviconIcon } from '@/utils/faviconLookup';
import type { PickerTab } from '@/hooks/useFaviconPicker';
import { CELL_INNER_AVATAR, ROW_AVATAR_SIZE } from './pickerConstants';
import * as styles from './index.css';

interface CreatePasswordModalProps {
  onConfirm: (passwordData: PasswordFormData) => void;
  onCancel: () => void;
  initialPassword?: string;
  initialData?: Password;
}

// Hoisted out of the component so the array identity is stable.
const TABS: { key: PickerTab; label: string }[] = [
  { key: 'auto', label: 'Auto' },
  { key: 'popular', label: 'Popular' },
  { key: 'none', label: 'None' },
];

interface IconGridItemProps {
  slug: string;
  icon: FaviconIcon;
  active: boolean;
  showCheck: boolean;
  onClick: () => void;
}

/**
 * Single icon tile — used by both the Auto suggestion (single cell) and the
 * Popular grid (many cells). Centralizing it keeps the avatar size, check
 * badge, and active state consistent across the two branches.
 */
function IconGridItem({ slug, icon, active, showCheck, onClick }: IconGridItemProps) {
  return (
    <button
      type="button"
      className={styles.iconItem}
      data-active={active}
      title={icon.title}
      onClick={onClick}
    >
      <FaviconAvatar slug={slug} name={icon.title} size={CELL_INNER_AVATAR} />
      {showCheck && (
        <span className={styles.iconCheckBadge}>
          <Check size={8} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

export default function CreatePasswordModal({ onConfirm, onCancel, initialPassword = '', initialData }: CreatePasswordModalProps) {
  const {
    serviceName,
    username,
    password,
    url,
    notes,
    folder,
    showGenerator,
    showPassword,
    isCreateFolderOpen,
    setServiceName,
    setUsername,
    setPassword,
    setUrl,
    setNotes,
    setFolder,
    setShowGenerator,
    setShowPassword,
    setIsCreateFolderOpen,
    faviconPicker,
    handleUseGeneratedPassword,
    handleRecordGenerated,
    handleCreateFolderConfirm,
    handleSubmit,
  } = useCreatePassword({ onConfirm, onCancel, initialPassword, initialData });

  const folders = useAtomValue(foldersAtom);
  const { checkAndOpen } = useLimitCheck();

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Content className={styles.dialogContent}>
        <Dialog.Title size="4">{initialData ? 'Edit Password' : 'Create New Password'}</Dialog.Title>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="2">
            <label>
              <Flex direction="column" gap="1">
                <span className={styles.fieldLabel}>Service Name <span className={styles.requiredStar}>*</span></span>
                <TextField.Root
                  size="1"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  required
                />
              </Flex>
            </label>

            <label>
              <Flex direction="column" gap="1">
                <span className={styles.fieldLabel}>Username <span className={styles.requiredStar}>*</span></span>
                <TextField.Root
                  size="1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </Flex>
            </label>

            <label>
              <Flex direction="column" gap="1">
                <span className={styles.fieldLabel}>Password <span className={styles.requiredStar}>*</span></span>
                <Flex gap="2">
                  <TextField.Root
                    size="1"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={styles.passwordInput}
                  >
                    <TextField.Slot side="right">
                      <IconButton size="1" variant="ghost" type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                      </IconButton>
                    </TextField.Slot>
                  </TextField.Root>
                  <Button size="1" type="button" variant="soft" color="violet" onClick={() => setShowGenerator(!showGenerator)}>
                    <KeyRound size={14} />
                    {showGenerator ? 'Hide' : 'Generate'}
                  </Button>
                </Flex>
              </Flex>
            </label>

            {showGenerator && (
              <Box className={styles.generatorBox}>
                <PasswordGenerator
                  onUsePassword={handleUseGeneratedPassword}
                  onCancel={() => setShowGenerator(false)}
                  onRecordGenerated={handleRecordGenerated}
                  isEmbedded
                />
              </Box>
            )}

            <label>
              <Flex direction="column" gap="1">
                <span className={styles.fieldLabel}>URL</span>
                <TextField.Root
                  size="1"
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </Flex>
            </label>

            <Flex direction="column" gap="1">
              <span className={styles.fieldLabel}>Icon</span>
              <div className={styles.iconRow}>
                <FaviconAvatar slug={faviconPicker.favicon} name={serviceName || '?'} size={ROW_AVATAR_SIZE} />
                <div className={styles.iconLabelStack}>
                  <span className={styles.iconLabelPrimary}>{faviconPicker.iconChipText}</span>
                  <span className={styles.iconLabelSecondary}>{faviconPicker.iconChipSubtext}</span>
                </div>
                <Popover.Root
                  open={faviconPicker.iconPickerOpen}
                  onOpenChange={(open) => (open ? faviconPicker.openPicker() : faviconPicker.cancelPicker())}
                >
                  <Popover.Trigger>
                    <Button size="1" type="button" variant="soft" color="gray">
                      Change
                    </Button>
                  </Popover.Trigger>
                  <Popover.Content
                    className={styles.popoverContentReset}
                    sideOffset={6}
                    align="end"
                  >
                    <div className={styles.iconPickerPopup}>
                    <div className={styles.pickerHeader}>
                      <div className={styles.searchWrap}>
                        <Search size={14} className={styles.searchIcon} />
                        <input
                          type="text"
                          className={styles.searchInput}
                          placeholder="Filter icons…"
                          value={faviconPicker.iconFilter}
                          onChange={(e) => faviconPicker.setFilterAndAutoSwitch(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className={styles.tabStrip}>
                        {TABS.map((t) => (
                          <button
                            key={t.key}
                            type="button"
                            className={styles.tab}
                            data-active={faviconPicker.pendingTab === t.key}
                            onClick={() => faviconPicker.selectTab(t.key)}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <span className={styles.sectionLabel}>
                      {faviconPicker.pendingTab === 'auto' ? 'Suggested' : faviconPicker.pendingTab === 'popular' ? 'All icons' : ''}
                    </span>
                    <div className={styles.iconList}>
                      {faviconPicker.pendingTab === 'none' ? (
                        <span className={styles.emptyMessage}>{faviconPicker.noneMessage}</span>
                      ) : faviconPicker.pendingTab === 'auto' ? (
                        faviconPicker.autoSuggestion ? (
                          <IconGridItem
                            slug={faviconPicker.autoSuggestion.slug}
                            icon={faviconPicker.autoSuggestion}
                            active
                            showCheck
                            onClick={() => {
                              /* selecting in auto tab is a no-op preview */
                            }}
                          />
                        ) : (
                          <span className={styles.emptyMessage}>{faviconPicker.autoEmptyMessage}</span>
                        )
                      ) : faviconPicker.filteredSlugs.length === 0 ? (
                        <span className={styles.emptyMessage}>No icons found</span>
                      ) : (
                        faviconPicker.filteredSlugs.map((slug) => {
                          const icon = lookupIcon(slug);
                          if (!icon) return null;
                          const isSelected = faviconPicker.pendingFavicon === slug;
                          return (
                            <IconGridItem
                              key={slug}
                              slug={slug}
                              icon={icon}
                              active={isSelected}
                              showCheck={isSelected}
                              onClick={() => faviconPicker.previewSlug(slug)}
                            />
                          );
                        })
                      )}
                    </div>
                    <div className={styles.pickerFooter}>
                      <Button size="1" variant="soft" color="gray" type="button" onClick={faviconPicker.cancelPicker}>
                        Cancel
                      </Button>
                      <Button size="1" type="button" onClick={faviconPicker.applyPicker}>
                        Apply
                      </Button>
                    </div>
                    </div>
                  </Popover.Content>
                </Popover.Root>
              </div>
            </Flex>

            <label>
              <Flex direction="column" gap="1">
                <span className={styles.fieldLabel}>Select folder...</span>
                <Flex gap="2">
                  <Select.Root value={folder} onValueChange={setFolder} size="1">
                    <Select.Trigger placeholder="Select folder..." />
                    <Select.Content>
                      {folders.map((f) => (
                        <Select.Item key={f.id} value={f.id}>{f.name}</Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                  <Button size="1" type="button" variant="soft" color="gray" onClick={() => checkAndOpen('folder', () => setIsCreateFolderOpen(true), () => onCancel())}>
                    <Plus size={14} />
                    New
                  </Button>
                </Flex>
              </Flex>
            </label>

            <label>
              <Flex direction="column" gap="1">
                <span className={styles.fieldLabel}>Notes</span>
                <TextArea
                  size="1"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </Flex>
            </label>

            <Flex gap="2" mt="3" justify="end">
              <Dialog.Close>
                <Button size="1" variant="soft" color="gray" type="button">Cancel</Button>
              </Dialog.Close>
              <Button size="1" type="submit">Save</Button>
            </Flex>
          </Flex>
        </form>

        {isCreateFolderOpen && (
          <CreateFolderModal
            onConfirm={handleCreateFolderConfirm}
            onCancel={() => setIsCreateFolderOpen(false)}
          />
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}
