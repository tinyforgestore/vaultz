import { Flex, Button } from '@radix-ui/themes';
import { Plus } from 'lucide-react';
import PasswordGenerator from '@/components/PasswordGenerator';
import VaultLockedPanel from '@/components/VaultLockedPanel';
import { useOverlayGenerator } from '@/hooks/useOverlayGenerator';
import * as styles from './index.css';

export default function OverlayGenerator() {
  const { isLocked, hideOverlay, copyToClipboard, saveAsEntry } = useOverlayGenerator();

  if (isLocked) {
    return <VaultLockedPanel />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <strong>Generate Password</strong>
        <Flex gap="2">
          {/* PM-024: button is a stub — disabled until generation-first entry creation lands. */}
          <Button
            size="1"
            variant="soft"
            disabled
            onClick={saveAsEntry}
            title="Save as new entry — coming soon"
          >
            <Plus size={14} /> New entry
          </Button>
        </Flex>
      </div>
      <PasswordGenerator
        isEmbedded
        onUsePassword={(pw) => copyToClipboard(pw)}
        onCancel={hideOverlay}
      />
      <div className={styles.hintRow}>
        <span>Enter: copy & close</span>
        <span>← →: length</span>
        <span>U/L/N/S: toggle</span>
        <span>R: regenerate</span>
        <span>Esc: close</span>
      </div>
    </div>
  );
}
