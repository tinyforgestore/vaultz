import { useState } from 'react';
import { Dialog, Flex, TextField, Button, TextArea, Select, Box, IconButton } from '@radix-ui/themes';
import { KeyRound, Eye, EyeOff, Plus } from 'lucide-react';
import { useAtomValue, useSetAtom } from 'jotai';
import { foldersAtom, activeModalAtom } from '@/store/atoms';
import { useLimitCheck } from '@/hooks/useLimitCheck';
import { LIMIT_REACHED_FOLDERS } from '@/constants/folders';
import PasswordGenerator from '@/components/PasswordGenerator';
import CreateFolderModal from '@/components/modals/CreateFolderModal';
import { useCreatePassword } from '@/hooks/useCreatePassword';
import { Password, PasswordFormData } from '@/types';
import * as styles from './index.css';

interface CreatePasswordModalProps {
  onConfirm: (passwordData: PasswordFormData) => void;
  onCancel: () => void;
  initialPassword?: string;
  initialData?: Password;
}

export default function CreatePasswordModal({ onConfirm, onCancel, initialPassword = '', initialData }: CreatePasswordModalProps) {
  const {
    serviceName,
    username,
    password,
    url,
    notes,
    folder,
    showGenerator,
    setServiceName,
    setUsername,
    setPassword,
    setUrl,
    setNotes,
    setFolder,
    setShowGenerator,
    handleUseGeneratedPassword,
    confirmCreateFolder,
    handleSubmit,
  } = useCreatePassword({ onConfirm, initialPassword, initialData });

  const folders = useAtomValue(foldersAtom);
  const setActiveModal = useSetAtom(activeModalAtom);
  const { checkAndOpen } = useLimitCheck();
  const [showPassword, setShowPassword] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Content className={styles.dialogContent}>
        <Dialog.Title size="4">{initialData ? 'Edit Password' : 'Create New Password'}</Dialog.Title>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="2">
            <label>
              <Flex direction="column" gap="1">
                <span className={styles.fieldLabel}>Service Name <span className={styles.requiredStar}>*</span></span>
                <TextField.Root
                  size="1"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  required
                />
              </Flex>
            </label>

            <label>
              <Flex direction="column" gap="1">
                <span className={styles.fieldLabel}>Username <span className={styles.requiredStar}>*</span></span>
                <TextField.Root
                  size="1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </Flex>
            </label>

            <label>
              <Flex direction="column" gap="1">
                <span className={styles.fieldLabel}>Password <span className={styles.requiredStar}>*</span></span>
                <Flex gap="2">
                  <TextField.Root
                    size="1"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={styles.passwordInput}
                  >
                    <TextField.Slot side="right">
                      <IconButton size="1" variant="ghost" type="button" tabIndex={-1} onClick={() => setShowPassword(s => !s)}>
                        {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                      </IconButton>
                    </TextField.Slot>
                  </TextField.Root>
                  <Button size="1" type="button" variant="soft" color="violet" onClick={() => setShowGenerator(!showGenerator)}>
                    <KeyRound size={14} />
                    {showGenerator ? 'Hide' : 'Generate'}
                  </Button>
                </Flex>
              </Flex>
            </label>

            {showGenerator && (
              <Box className={styles.generatorBox}>
                <PasswordGenerator
                  onUsePassword={handleUseGeneratedPassword}
                  onCancel={() => setShowGenerator(false)}
                  isEmbedded
                />
              </Box>
            )}

            <label>
              <Flex direction="column" gap="1">
                <span className={styles.fieldLabel}>URL</span>
                <TextField.Root
                  size="1"
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </Flex>
            </label>

            <label>
              <Flex direction="column" gap="1">
                <span className={styles.fieldLabel}>Select folder...</span>
                <Flex gap="2">
                  <Select.Root value={folder} onValueChange={setFolder} size="1">
                    <Select.Trigger placeholder="Select folder..." />
                    <Select.Content>
                      {folders.map((f) => (
                        <Select.Item key={f.id} value={f.id}>{f.name}</Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                  <Button size="1" type="button" variant="soft" color="gray" onClick={() => checkAndOpen('folder', () => setIsCreateFolderOpen(true), () => onCancel())}>
                    <Plus size={14} />
                    New
                  </Button>
                </Flex>
              </Flex>
            </label>

            <label>
              <Flex direction="column" gap="1">
                <span className={styles.fieldLabel}>Notes</span>
                <TextArea
                  size="1"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </Flex>
            </label>

            <Flex gap="2" mt="3" justify="end">
              <Dialog.Close>
                <Button size="1" variant="soft" color="gray" type="button">Cancel</Button>
              </Dialog.Close>
              <Button size="1" type="submit">Save</Button>
            </Flex>
          </Flex>
        </form>

        {isCreateFolderOpen && (
          <CreateFolderModal
            onConfirm={(folderData) => {
              confirmCreateFolder(folderData)
                .then(() => setIsCreateFolderOpen(false))
                .catch((err: unknown) => {
                  const msg = err instanceof Error ? err.message : String(err);
                  if (msg.includes(LIMIT_REACHED_FOLDERS)) {
                    setIsCreateFolderOpen(false);
                    onCancel();
                    setActiveModal('upgrade');
                  }
                });
            }}
            onCancel={() => setIsCreateFolderOpen(false)}
          />
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}
