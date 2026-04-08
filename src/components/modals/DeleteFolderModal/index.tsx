import { AlertTriangle } from 'lucide-react';
import { Dialog, Flex, Button, Text } from '@radix-ui/themes';

interface DeleteFolderModalProps {
  folderName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteFolderModal({ folderName, onConfirm, onCancel }: DeleteFolderModalProps) {
  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Content style={{ maxWidth: 450 }}>
        <Flex direction="column" gap="3" align="center">
          <AlertTriangle size={48} color="#f59e0b" />
          
          <Dialog.Title>Delete Folder?</Dialog.Title>
          
          <Text align="center">
            Are you sure you want to delete:
          </Text>
          <Text weight="bold">{folderName}</Text>
          <Text align="center">
            All passwords in this folder will be moved to the default folder.
          </Text>

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
