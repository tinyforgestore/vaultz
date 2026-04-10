import { useState } from 'react';
import { Dialog, Flex, TextField, Button, Text, Callout } from '@radix-ui/themes';
import { AlertTriangle } from 'lucide-react';
import * as styles from './index.css';
import { fieldLabel } from '@/styles/shared.css';

interface ImportVaultModalProps {
  filePath: string;
  isReplacing: boolean;
  onConfirm: (passphrase: string) => Promise<void>;
  onCancel: () => void;
}

export default function ImportVaultModal({ filePath, isReplacing, onConfirm, onCancel }: ImportVaultModalProps) {
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const fileName = filePath.split('/').pop() ?? filePath;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase) {
      setError('Passphrase is required');
      return;
    }
    setIsImporting(true);
    try {
      await onConfirm(passphrase);
    } catch (err) {
      setError(typeof err === 'string' ? err : err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Content className={styles.dialogContent}>
        <Dialog.Title size="4">Import Vault</Dialog.Title>
        <Dialog.Description size="2" mb="3" color="gray">
          {fileName}
        </Dialog.Description>

        {isReplacing && (
          <Callout.Root color="orange" size="1" mb="3">
            <Callout.Icon><AlertTriangle size={14} /></Callout.Icon>
            <Callout.Text>This will replace your current vault. Make sure you have a backup.</Callout.Text>
          </Callout.Root>
        )}

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="2">
            <label>
              <Flex direction="column" gap="1">
                <span className={fieldLabel}>Vault Passphrase *</span>
                <TextField.Root
                  size="1"
                  type="password"
                  value={passphrase}
                  onChange={(e) => { setPassphrase(e.target.value); setError(''); }}
                  autoFocus
                  required
                />
              </Flex>
            </label>

            {error && <Text size="1" color="red">{error}</Text>}

            <Flex gap="2" mt="3" justify="end">
              <Dialog.Close>
                <Button size="1" variant="soft" color="gray" type="button" disabled={isImporting}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button size="1" type="submit" loading={isImporting}>
                Import
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
