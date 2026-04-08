import { Dialog, Flex, Text, TextField, Button } from '@radix-ui/themes';
import { Lock } from 'lucide-react';

interface CreateMasterPasswordModalProps {
  open: boolean;
  password: string;
  confirmPassword: string;
  error: string;
  isLoading: boolean;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onCreate: () => void;
}

export function CreateMasterPasswordModal({
  open,
  password,
  confirmPassword,
  error,
  isLoading,
  onPasswordChange,
  onConfirmPasswordChange,
  onCreate,
}: CreateMasterPasswordModalProps) {
  return (
    <Dialog.Root open={open}>
      <Dialog.Content style={{ maxWidth: 380 }}>
        <Dialog.Title>
          <Flex align="center" gap="2">
            <Lock size={20} />
            Create Master Password
          </Flex>
        </Dialog.Title>

        <Dialog.Description size="2" mb="4">
          Create a strong master password to secure your vault. This password cannot be recovered if lost.
        </Dialog.Description>

        <Flex direction="column" gap="3">
          {error && (
            <Text color="red" size="2">
              {error}
            </Text>
          )}

          <label>
            <Text as="div" size="1" mb="1" weight="bold" style={{ fontSize: '13px' }}>
              Master Password
            </Text>
            <TextField.Root
              type="password"
              placeholder="Enter master password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              size="1"
              disabled={isLoading}
            />
          </label>

          <label>
            <Text as="div" size="1" mb="1" weight="bold" style={{ fontSize: '13px' }}>
              Confirm Password
            </Text>
            <TextField.Root
              type="password"
              placeholder="Confirm master password"
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
              size="1"
              disabled={isLoading}
            />
          </label>
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray" size="2" disabled={isLoading}>
              Cancel
            </Button>
          </Dialog.Close>
          <Button 
            size="2" 
            onClick={onCreate}
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Vault'}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
