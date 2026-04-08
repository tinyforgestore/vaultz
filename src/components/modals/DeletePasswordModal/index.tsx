import { AlertTriangle } from 'lucide-react';
import { Dialog, Flex, Button, Text } from '@radix-ui/themes';

interface DeletePasswordModalProps {
  passwordName: string | number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeletePasswordModal({ passwordName, onConfirm, onCancel }: DeletePasswordModalProps) {
  const isBulk = typeof passwordName === 'number';

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Content style={{ maxWidth: 450 }}>
        <Flex direction="column" gap="3" align="center">
          <AlertTriangle size={48} color="#f59e0b" />

          <Dialog.Title>{isBulk ? 'Delete Passwords?' : 'Delete Password?'}</Dialog.Title>

          {isBulk ? (
            <Text align="center">
              Are you sure you want to delete {passwordName} password{passwordName === 1 ? '' : 's'}?
            </Text>
          ) : (
            <>
              <Text align="center">
                Are you sure you want to delete the password for:
              </Text>
              <Text weight="bold">{passwordName}</Text>
            </>
          )}
          <Text align="center">This action cannot be undone.</Text>

          <Flex gap="3" mt="4" justify="end" style={{ width: '100%' }}>
            <Dialog.Close>
              <Button variant="soft" color="gray">Cancel</Button>
            </Dialog.Close>
            <Button color="red" onClick={onConfirm}>Delete</Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
