import { Copy, Eye, EyeOff, ArrowLeft, Check, Star, Globe, User, Lock, FileText } from 'lucide-react';
import { Flex, Button, Heading, IconButton, Box, Text } from '@radix-ui/themes';
import CreatePasswordModal from '@/components/modals/CreatePasswordModal';
import { usePasswordDetails } from '@/hooks/usePasswordDetails';
import { FOLDER_ICON_MAP } from '@/constants/folders';
import { getAvatarColor, getInitials } from '@/utils/avatar';
import { Toast } from '@/components/Toast';
import * as styles from './index.css';

export default function PasswordDetailsPage() {
  const {
    password,
    showPassword,
    isDeleteModalOpen,
    isEditModalOpen,
    toastMessage,
    toastVariant,
    copiedField,
    folderName,
    folderIcon,
    setShowPassword,
    setIsDeleteModalOpen,
    setIsEditModalOpen,
    handleEdit,
    confirmEdit,
    handleDelete,
    confirmDelete,
    handleToggleFavorite,
    handleBack,
    copyField,
  } = usePasswordDetails();

  if (!password) {
    return (
      <Box className={styles.notFoundContainer}>
        <Heading size="3">Password not found</Heading>
      </Box>
    );
  }

  const userField = password.username || password.email || '';
  const FolderIconComp = FOLDER_ICON_MAP[folderIcon] || FOLDER_ICON_MAP['folder'];

  return (
    <Box className={styles.container}>
      <div className={styles.header} data-tauri-drag-region>
        <IconButton size="1" variant="ghost" onClick={handleBack} aria-label="Go back">
          <ArrowLeft size={16} />
        </IconButton>
        <span className={styles.headerTitle}>{password.name}</span>
        <IconButton size="1" variant="ghost" onClick={handleToggleFavorite} className={styles.favoriteButton} aria-label="Toggle favorite">
          <Star size={15} fill={password.isFavorite ? 'currentColor' : 'none'} />
        </IconButton>
        <Button size="1" variant="soft" onClick={handleEdit}>Edit</Button>
        <Button size="1" variant="soft" color="red" onClick={handleDelete}>Delete</Button>
      </div>

      <Box className={styles.contentArea}>
        <div className={styles.avatarStrip}>
          <div className={styles.avatarLarge} style={{ background: getAvatarColor(password.name) }}>
            {getInitials(password.name)}
          </div>
          <div>
            <Box className={styles.entryName}>{password.name}</Box>
            {folderName && (
              <div className={styles.folderBadge}>
                <FolderIconComp size={10} />
                {folderName}
              </div>
            )}
          </div>
        </div>

        <Box className={styles.fieldCard}>
          <Flex align="center" justify="between" className={styles.fieldLabelRow}>
            <Flex align="center" gap="1">
              <User size={13} />
              <span>User / Email</span>
            </Flex>
            {userField && (
              <IconButton size="1" variant="ghost" aria-label="Copy username" onClick={() => copyField('username', userField)}>
                {copiedField === 'username' ? <Check size={12} /> : <Copy size={12} />}
              </IconButton>
            )}
          </Flex>
          {userField
            ? <Box className={styles.fieldValue}>{userField}</Box>
            : <Box className={styles.fieldEmpty}>—</Box>}
        </Box>

        <Box className={styles.fieldCard}>
          <Flex align="center" justify="between" className={styles.fieldLabelRow}>
            <Flex align="center" gap="1">
              <Lock size={13} />
              <span>Password</span>
            </Flex>
            <Flex align="center" gap="1">
              <IconButton size="1" variant="ghost" aria-label="Toggle password visibility" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
              </IconButton>
              <IconButton size="1" variant="ghost" aria-label="Copy password" onClick={() => copyField('password', password.password)}>
                {copiedField === 'password' ? <Check size={12} /> : <Copy size={12} />}
              </IconButton>
            </Flex>
          </Flex>
          <Box className={styles.fieldValueMono}>
            {password.password
              ? showPassword ? password.password : '•'.repeat(Math.min(password.password.length, 20))
              : <span className={styles.fieldEmpty}>—</span>}
          </Box>
        </Box>

        <Box className={styles.fieldCard}>
          <Flex align="center" justify="between" className={styles.fieldLabelRow}>
            <Flex align="center" gap="1">
              <Globe size={13} />
              <span>Website</span>
            </Flex>
            {password.website && (
              <IconButton size="1" variant="ghost" aria-label="Copy website" onClick={() => copyField('website', password.website!)}>
                {copiedField === 'website' ? <Check size={12} /> : <Copy size={12} />}
              </IconButton>
            )}
          </Flex>
          {password.website
            ? <Box className={styles.fieldValue}>{password.website}</Box>
            : <Box className={styles.fieldEmpty}>—</Box>}
        </Box>

        <Box className={styles.fieldCard}>
          <Flex align="center" className={styles.fieldLabelRow}>
            <Flex align="center" gap="1">
              <FileText size={13} />
              <span>Notes</span>
            </Flex>
          </Flex>
          {password.notes
            ? <Box className={styles.fieldValue}>{password.notes}</Box>
            : <Box className={styles.fieldEmpty}>—</Box>}
        </Box>

        {password.recoveryEmail && (
          <Box className={styles.fieldCard}>
            <Flex align="center" justify="between" className={styles.fieldLabelRow}>
              <Flex align="center" gap="1">
                <User size={13} />
                <span>Recovery Email</span>
              </Flex>
              <IconButton size="1" variant="ghost" aria-label="Copy recovery email" onClick={() => copyField('recovery', password.recoveryEmail!)}>
                {copiedField === 'recovery' ? <Check size={12} /> : <Copy size={12} />}
              </IconButton>
            </Flex>
            <Box className={styles.fieldValue}>{password.recoveryEmail}</Box>
          </Box>
        )}
      </Box>

      {isEditModalOpen && (
        <CreatePasswordModal
          onConfirm={confirmEdit}
          onCancel={() => setIsEditModalOpen(false)}
          initialData={password}
        />
      )}

      {isDeleteModalOpen && (
        <div className={styles.deleteOverlay}>
          <div className={styles.deleteSheet}>
            <Heading size="3" mb="1">Delete entry?</Heading>
            <Text size="2" color="gray"><strong>{password.name}</strong> will be permanently deleted.</Text>
            <Flex gap="2" mt="3">
              <Button variant="soft" color="gray" className={styles.deleteActionButton} onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button color="red" className={styles.deleteActionButton} onClick={confirmDelete}>
                Delete
              </Button>
            </Flex>
          </div>
        </div>
      )}

      {toastMessage && (
        <Box className={styles.toastContainer}>
          <Toast message={toastMessage} variant={toastVariant} />
        </Box>
      )}
    </Box>
  );
}
