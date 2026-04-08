import { memo } from 'react';
import { Check, Copy, Star } from 'lucide-react';
import { Card, Flex, Box, Heading, IconButton } from '@radix-ui/themes';
import { Password } from '@/types';
import { getAvatarColor, getInitials } from '@/utils/avatar';
import { FOLDER_ICON_MAP } from '@/constants/folders';
import * as styles from './index.css';

interface PasswordCardProps {
  password: Password;
  isSelectionMode: boolean;
  isSelected: boolean;
  copiedId: string | null;
  showFolderTag: boolean;
  folderName: string | undefined;
  folderIcon: string | undefined;
  onCardClick: () => void;
  onCopyPassword: () => void;
  onToggleFavorite: () => void;
  onToggleSelection: () => void;
}

export const PasswordCard = memo(function PasswordCard({
  password,
  isSelectionMode,
  isSelected,
  copiedId,
  showFolderTag,
  folderName,
  folderIcon,
  onCardClick,
  onCopyPassword,
  onToggleFavorite,
  onToggleSelection,
}: PasswordCardProps) {
  const FolderIconComp = FOLDER_ICON_MAP[folderIcon || 'folder'] || FOLDER_ICON_MAP['folder'];

  return (
    <Card
      size="1"
      className={`${styles.passwordCard}${isSelectionMode && isSelected ? ` ${styles.selectedCard}` : ''}`}
      onClick={() => isSelectionMode ? onToggleSelection() : onCardClick()}
    >
      <Flex align="center" gap="3">
        {isSelectionMode && (
          <Box
            className={styles.checkbox}
            data-checked={isSelected}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelection();
            }}
          >
            {isSelected && <Check size={14} color="white" />}
          </Box>
        )}
        {!isSelectionMode && (
          <div className={styles.avatar} style={{ background: getAvatarColor(password.name) }}>
            {getInitials(password.name)}
          </div>
        )}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Flex align="center" gap="1" mb="0">
            <Heading size="2" mb="0" className={styles.passwordTitle}>{password.name}</Heading>
            {password.isFavorite && <Star size={11} className={styles.starBadge} fill="currentColor" />}
          </Flex>
          <div className={styles.passwordSubtitle}>
            {password.email || password.username}
          </div>
          {showFolderTag && folderName && (
            <div className={styles.passwordFolderTag}>
              <FolderIconComp size={10} />
              {folderName}
            </div>
          )}
        </Box>
        {!isSelectionMode && (
          <Flex gap="1" flexShrink="0">
            <IconButton
              size="1"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onCopyPassword(); }}
              className={copiedId === password.id ? styles.copyButtonCopied : styles.copyButton}
            >
              {copiedId === password.id ? <Check size={14} /> : <Copy size={14} />}
            </IconButton>
            <IconButton
              size="1"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              className={styles.starButton}
            >
              <Star size={14} fill={password.isFavorite ? 'currentColor' : 'none'} />
            </IconButton>
          </Flex>
        )}
      </Flex>
    </Card>
  );
});
