import { RefreshCw } from 'lucide-react';
import { Dialog, Flex, TextField, Button, Checkbox, Slider, Box } from '@radix-ui/themes';
import { usePasswordGenerator } from '@/hooks/usePasswordGenerator';

interface PasswordGeneratorProps {
  onUsePassword: (password: string) => void;
  onCancel: () => void;
  isEmbedded?: boolean;
}

export default function PasswordGenerator({ onUsePassword, onCancel, isEmbedded = false }: PasswordGeneratorProps) {
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
    <Flex direction="column" gap="3">
          <TextField.Root
            value={generatedPassword}
            readOnly
            size="2"
          />

          <Box>
            <Flex direction="column" gap="1">
              <span style={{ fontSize: '13px' }}>Length: {length[0]}</span>
              <Slider
                min={8}
                max={32}
                value={length}
                onValueChange={setLength}
              />
            </Flex>
          </Box>

          <Flex direction="column" gap="2">
            <label>
              <Flex gap="2" align="center">
                <Checkbox
                  size="1"
                  checked={includeUppercase}
                  onCheckedChange={(checked) => setIncludeUppercase(checked === true)}
                />
                <span style={{ fontSize: '14px' }}>Uppercase (A-Z)</span>
              </Flex>
            </label>

            <label>
              <Flex gap="2" align="center">
                <Checkbox
                  size="1"
                  checked={includeLowercase}
                  onCheckedChange={(checked) => setIncludeLowercase(checked === true)}
                />
                <span style={{ fontSize: '14px' }}>Lowercase (a-z)</span>
              </Flex>
            </label>

            <label>
              <Flex gap="2" align="center">
                <Checkbox
                  size="1"
                  checked={includeNumbers}
                  onCheckedChange={(checked) => setIncludeNumbers(checked === true)}
                />
                <span style={{ fontSize: '14px' }}>Numbers (0-9)</span>
              </Flex>
            </label>

            <label>
              <Flex gap="2" align="center">
                <Checkbox
                  size="1"
                  checked={includeSymbols}
                  onCheckedChange={(checked) => setIncludeSymbols(checked === true)}
                />
                <span style={{ fontSize: '14px' }}>Symbols (!@#$%^&*)</span>
              </Flex>
            </label>
          </Flex>

          <Flex gap="2" mt="2" justify="end">
            <Button size="1" variant="soft" onClick={handleRegenerate}>
              <RefreshCw size={14} /> Regenerate
            </Button>
            <Button size="1" onClick={handleUsePassword}>
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
      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>Generate Password</Dialog.Title>
        {generatorContent}
      </Dialog.Content>
    </Dialog.Root>
  );
}
