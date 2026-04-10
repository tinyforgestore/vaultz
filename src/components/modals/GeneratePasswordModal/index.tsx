import { RefreshCw } from 'lucide-react';
import { Dialog, Flex, TextField, Button, Checkbox, Slider } from '@radix-ui/themes';
import { usePasswordGenerator } from '@/hooks/usePasswordGenerator';
import * as styles from './index.css';

interface GeneratePasswordModalProps {
  onUsePassword: (password: string) => void;
  onCancel: () => void;
  isEmbedded?: boolean;
}

export default function GeneratePasswordModal({ onUsePassword, onCancel, isEmbedded = false }: GeneratePasswordModalProps) {
  const {
    generatedPassword,
    length,
    includeUppercase,
    includeLowercase,
    includeNumbers,
    includeSymbols,
    setLength,
    setIncludeUppercase,
    setIncludeLowercase,
    setIncludeNumbers,
    setIncludeSymbols,
    handleRegenerate,
    handleUsePassword,
  } = usePasswordGenerator({ onUsePassword });

  const generatorContent = (
    <Flex direction="column" gap="4">
          <TextField.Root
            value={generatedPassword}
            readOnly
            size="3"
          />

          <Flex direction="column" gap="2">
            <span>Length: {length[0]}</span>
            <Slider
              min={8}
              max={32}
              value={length}
              onValueChange={setLength}
            />
          </Flex>

          <Flex direction="column" gap="2">
            <label>
              <Flex gap="2" align="center">
                <Checkbox
                  checked={includeUppercase}
                  onCheckedChange={(checked) => setIncludeUppercase(checked === true)}
                />
                <span>Uppercase (A-Z)</span>
              </Flex>
            </label>

            <label>
              <Flex gap="2" align="center">
                <Checkbox
                  checked={includeLowercase}
                  onCheckedChange={(checked) => setIncludeLowercase(checked === true)}
                />
                <span>Lowercase (a-z)</span>
              </Flex>
            </label>

            <label>
              <Flex gap="2" align="center">
                <Checkbox
                  checked={includeNumbers}
                  onCheckedChange={(checked) => setIncludeNumbers(checked === true)}
                />
                <span>Numbers (0-9)</span>
              </Flex>
            </label>

            <label>
              <Flex gap="2" align="center">
                <Checkbox
                  checked={includeSymbols}
                  onCheckedChange={(checked) => setIncludeSymbols(checked === true)}
                />
                <span>Symbols (!@#$%^&*)</span>
              </Flex>
            </label>
          </Flex>

          <Flex gap="3" mt="4" justify="end">
            <Button variant="soft" onClick={handleRegenerate}>
              <RefreshCw size={16} /> Regenerate
            </Button>
            <Button onClick={handleUsePassword}>
              Use This Password
            </Button>
          </Flex>
        </Flex>
  );

  if (isEmbedded) {
    return generatorContent;
  }

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Content className={styles.dialogContent}>
        <Dialog.Title>Generate Password</Dialog.Title>
        {generatorContent}
      </Dialog.Content>
    </Dialog.Root>
  );
}
