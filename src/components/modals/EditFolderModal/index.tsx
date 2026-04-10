import { Dialog, Flex, TextField, Button, Box } from '@radix-ui/themes';
import { FOLDER_ICON_PICKER, MAX_FOLDER_NAME_LENGTH } from '@/constants/folders';
import { useFolderForm } from '../FolderModal/useFolderForm';
import { CreateFolderInput } from '@/types';
import * as styles from './index.css';
import { fieldLabel } from '@/styles/shared.css';

interface EditFolderModalProps {
  onConfirm: (data: CreateFolderInput) => void;
  onCancel: () => void;
  initialData: CreateFolderInput;
}

export default function EditFolderModal({ onConfirm, onCancel, initialData }: EditFolderModalProps) {
  const { folderName, setFolderName, selectedIcon, setSelectedIcon, handleSubmit } = useFolderForm({
    initialName: initialData.name,
    initialIcon: initialData.icon,
    onConfirm,
  });

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Content className={styles.dialogContent}>
        <Dialog.Title size="4">Edit Folder</Dialog.Title>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="2">
            <label>
              <Flex direction="column" gap="1">
                <span className={fieldLabel}>Folder Name *</span>
                <TextField.Root
                  size="1"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  maxLength={MAX_FOLDER_NAME_LENGTH}
                  required
                />
              </Flex>
            </label>

            <Box>
              <Flex direction="column" gap="2">
                <span className={fieldLabel}>Icon</span>
                <Flex gap="2" wrap="wrap">
                  {FOLDER_ICON_PICKER.map(({ id, Icon }) => (
                    <Button
                      key={id}
                      type="button"
                      variant={selectedIcon === id ? 'solid' : 'soft'}
                      onClick={() => setSelectedIcon(id)}
                      className={styles.iconPickerButton}
                    >
                      <Icon size={24} />
                    </Button>
                  ))}
                </Flex>
              </Flex>
            </Box>

            <Flex gap="2" mt="3" justify="end">
              <Dialog.Close>
                <Button size="1" variant="soft" color="gray" type="button">Cancel</Button>
              </Dialog.Close>
              <Button size="1" type="submit">Save</Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
