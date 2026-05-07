import clsx from 'clsx';
import { Check, Copy, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { IconButton } from '@radix-ui/themes';
import { formatRelativeTime } from '@/utils/relativeTime';
import * as styles from './index.css';

const MASKED = '••••••••••••';

export interface GeneratedPasswordItemData {
  id: number;
  password: string;
  createdAt: string;
}

interface GeneratedPasswordItemProps {
  item: GeneratedPasswordItemData;
  isHidden: boolean;
  isSelected: boolean;
  isCopied: boolean;
  onSelect: () => void;
  onReveal: () => void;
  onHide: () => void;
  onCopy: () => void;
  onCreateEntry: () => void;
  onDelete: () => void;
}

export default function GeneratedPasswordItem({
  item,
  isHidden,
  isSelected,
  isCopied,
  onSelect,
  onReveal,
  onHide,
  onCopy,
  onCreateEntry,
  onDelete,
}: GeneratedPasswordItemProps) {
  return (
    <li className={clsx(styles.row, isSelected && styles.rowSelected)} onClick={onSelect}>
      <div className={styles.rowMain}>
        <span className={styles.passwordText} data-testid={`password-${item.id}`}>
          {isHidden ? MASKED : item.password}
        </span>
        <span className={styles.timestamp}>{formatRelativeTime(item.createdAt)}</span>
      </div>
      <div className={styles.actions}>
        {isHidden ? (
          <IconButton size="1" variant="ghost" onClick={onReveal} aria-label="Reveal password">
            <Eye size={12} />
          </IconButton>
        ) : (
          <IconButton size="1" variant="ghost" onClick={onHide} aria-label="Hide password">
            <EyeOff size={12} />
          </IconButton>
        )}
        <IconButton size="1" variant="ghost" onClick={onCopy} aria-label="Copy password">
          {isCopied ? <Check size={12} /> : <Copy size={12} />}
        </IconButton>
        <IconButton
          size="1"
          variant="ghost"
          onClick={onCreateEntry}
          aria-label="Create entry"
          title="Create entry"
        >
          <Plus size={12} />
        </IconButton>
        <IconButton size="1" variant="ghost" color="red" onClick={onDelete} aria-label="Delete">
          <Trash2 size={12} />
        </IconButton>
      </div>
    </li>
  );
}
