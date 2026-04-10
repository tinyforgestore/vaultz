import { AlertTriangle } from 'lucide-react';
import { Dialog, Flex, Button, Text } from '@radix-ui/themes';
import * as styles from './index.css';
import { fullWidth } from '@/styles/shared.css';

interface DestroyVaultModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DestroyVaultModal({ onConfirm, onCancel }: DestroyVaultModalProps) {
  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Content className={styles.dialogContent}>
        <Flex direction="column" gap="3" align="center">
          <AlertTriangle size={48} color="var(--red-9)" />

          <Dialog.Title>Destroy Vault?</Dialog.Title>

          <Text align="center" color="gray" size="2">
            This will permanently delete the database and all stored passwords from this device. This action cannot be undone.
          </Text>

          <Flex gap="3" mt="2" justify="end" className={fullWidth}>
            <Dialog.Close>
              <Button variant="soft" color="gray" onClick={onCancel}>Cancel</Button>
            </Dialog.Close>
            <Button color="red" onClick={onConfirm}>Destroy Vault</Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
