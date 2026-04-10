import { Zap } from 'lucide-react';
import { Dialog, Flex, Button, Text } from '@radix-ui/themes';
import { openUrl } from '@tauri-apps/plugin-opener';
import * as styles from './index.css';

export const GUMROAD_PRODUCT_URL = 'https://tinyforgestore.gumroad.com/l/vaultz';

const LIMIT_MESSAGES: Record<'passwords' | 'folders', string> = {
  passwords: "You've reached the free limit of 20 passwords. Upgrade to Pro to unlock unlimited passwords.",
  folders: "You've reached the free limit of 5 folders. Upgrade to Pro to unlock unlimited folders.",
};

interface UpgradeModalProps {
  limitType: 'passwords' | 'folders';
  onClose: () => void;
}

export default function UpgradeModal({ limitType, onClose }: UpgradeModalProps) {
  const handleUpgrade = () => {
    openUrl(GUMROAD_PRODUCT_URL);
  };

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content style={{ maxWidth: 400 }}>
        <Flex direction="column" gap="3" align="center">
          <Zap size={48} className={styles.icon} />

          <Dialog.Title>Upgrade to Pro</Dialog.Title>

          <Text size="2" className={styles.message}>
            {LIMIT_MESSAGES[limitType]}
          </Text>

          <Flex gap="3" mt="2" justify="end" style={{ width: '100%' }}>
            <Dialog.Close>
              <Button variant="soft" color="gray" onClick={onClose}>
                Not now
              </Button>
            </Dialog.Close>
            <Button onClick={handleUpgrade}>
              Upgrade
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
