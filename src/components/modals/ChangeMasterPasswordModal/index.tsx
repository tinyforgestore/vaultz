import { useState } from 'react';
import { Dialog, Flex, TextField, Button } from '@radix-ui/themes';

interface ChangeMasterPasswordModalProps {
  onConfirm: (currentPassword: string, newPassword: string) => void;
  onCancel: () => void;
}

export default function ChangeMasterPasswordModal({ onConfirm, onCancel }: ChangeMasterPasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Add validation
    onConfirm(currentPassword, newPassword);
  };

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Content style={{ maxWidth: 380 }}>
        <Dialog.Title size="4">Change Master Password</Dialog.Title>
        
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="2">
            <label>
              <Flex direction="column" gap="1">
                <span style={{ fontSize: '13px' }}>Current Password *</span>
                <TextField.Root
                  size="1"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </Flex>
            </label>

            <label>
              <Flex direction="column" gap="1">
                <span style={{ fontSize: '13px' }}>New Password *</span>
                <TextField.Root
                  size="1"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </Flex>
            </label>

            <label>
              <Flex direction="column" gap="1">
                <span style={{ fontSize: '13px' }}>Confirm New Password *</span>
                <TextField.Root
                  size="1"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </Flex>
            </label>

            <Flex gap="2" mt="3" justify="end">
              <Dialog.Close>
                <Button size="1" variant="soft" color="gray" type="button">Cancel</Button>
              </Dialog.Close>
              <Button size="1" type="submit">Change Password</Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
