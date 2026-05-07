import { Flex, Button } from '@radix-ui/themes';
import { Plus } from 'lucide-react';
import PasswordGenerator from '@/components/PasswordGenerator';
import VaultLockedPanel from '@/components/VaultLockedPanel';
import { useOverlayGenerator } from '@/hooks/useOverlayGenerator';
import * as styles from './index.css';

export default function OverlayGenerator() {
  const {
    isLocked,
    hideOverlay,
    copyToClipboard,
    recordGenerated,
    handleGeneratedChange,
    saveAsEntry,
  } = useOverlayGenerator();

  if (isLocked) {
    return <VaultLockedPanel />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <strong>Generate Password</strong>
        <Flex gap="2">
          <Button
            size="1"
            variant="soft"
            onClick={saveAsEntry}
            title="Save as new entry"
          >
            <Plus size={14} /> New entry
          </Button>
        </Flex>
      </div>
      <PasswordGenerator
        isEmbedded
        onUsePassword={(pw) => copyToClipboard(pw)}
        onCancel={hideOverlay}
        onRecordGenerated={recordGenerated}
        onGeneratedChange={handleGeneratedChange}
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
