import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Dialog, Flex, TextField, Button, Text, IconButton } from '@radix-ui/themes';

interface ExportVaultModalProps {
  onConfirm: (passphrase: string) => Promise<void>;
  onCancel: () => void;
}

export default function ExportVaultModal({ onConfirm, onCancel }: ExportVaultModalProps) {
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match');
      return;
    }
    if (passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters');
      return;
    }
    setIsExporting(true);
    try {
      await onConfirm(passphrase);
    } catch (err) {
      setError(typeof err === 'string' ? err : err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setError('');
  };

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Content style={{ maxWidth: 380 }}>
        <Dialog.Title size="4">Export Vault</Dialog.Title>
        <Dialog.Description size="2" mb="3" color="gray">
          Your vault will be encrypted with the passphrase you set. Keep it safe — you'll need it to import the vault.
        </Dialog.Description>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="2">
            <label>
              <Flex direction="column" gap="1">
                <span style={{ fontSize: '13px' }}>Export Passphrase *</span>
                <TextField.Root
                  size="1"
                  type={showPassphrase ? 'text' : 'password'}
                  value={passphrase}
                  onChange={handleChange(setPassphrase)}
                  required
                >
                  <TextField.Slot side="right">
                    <IconButton size="1" variant="ghost" type="button" tabIndex={-1} onClick={() => setShowPassphrase(s => !s)}>
                      {showPassphrase ? <EyeOff size={12} /> : <Eye size={12} />}
                    </IconButton>
                  </TextField.Slot>
                </TextField.Root>
              </Flex>
            </label>

            <label>
              <Flex direction="column" gap="1">
                <span style={{ fontSize: '13px' }}>Confirm Passphrase *</span>
                <TextField.Root
                  size="1"
                  type={showPassphrase ? 'text' : 'password'}
                  value={confirmPassphrase}
                  onChange={handleChange(setConfirmPassphrase)}
                  required
                >
                  <TextField.Slot side="right">
                    <IconButton size="1" variant="ghost" type="button" tabIndex={-1} onClick={() => setShowPassphrase(s => !s)}>
                      {showPassphrase ? <EyeOff size={12} /> : <Eye size={12} />}
                    </IconButton>
                  </TextField.Slot>
                </TextField.Root>
              </Flex>
            </label>

            {error && <Text size="1" color="red">{error}</Text>}

            <Flex gap="2" mt="3" justify="end">
              <Dialog.Close>
                <Button size="1" variant="soft" color="gray" type="button" disabled={isExporting}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button size="1" type="submit" loading={isExporting}>
                Export
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
