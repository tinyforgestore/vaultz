import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Dialog, Flex, TextField, Button, Checkbox, Slider, Box } from '@radix-ui/themes';

interface GeneratePasswordModalProps {
  onUsePassword: (password: string) => void;
  onCancel: () => void;
  isEmbedded?: boolean;
}

const UPPERCASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE_CHARS = 'abcdefghijklmnopqrstuvwxyz';
const NUMBER_CHARS = '0123456789';
const SYMBOL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

export default function GeneratePasswordModal({ onUsePassword, onCancel, isEmbedded = false }: GeneratePasswordModalProps) {
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [length, setLength] = useState([16]);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);

  const generatePassword = () => {
    let charset = '';
    let password = '';
    
    // Build charset based on selected options
    if (includeUppercase) charset += UPPERCASE_CHARS;
    if (includeLowercase) charset += LOWERCASE_CHARS;
    if (includeNumbers) charset += NUMBER_CHARS;
    if (includeSymbols) charset += SYMBOL_CHARS;
    
    // Ensure at least one character type is selected
    if (charset.length === 0) {
      charset = LOWERCASE_CHARS; // Default to lowercase if nothing selected
    }
    
    // Generate password ensuring at least one character from each selected type
    const passwordLength = length[0];
    const requiredChars: string[] = [];
    
    if (includeUppercase) {
      requiredChars.push(UPPERCASE_CHARS[Math.floor(Math.random() * UPPERCASE_CHARS.length)]);
    }
    if (includeLowercase) {
      requiredChars.push(LOWERCASE_CHARS[Math.floor(Math.random() * LOWERCASE_CHARS.length)]);
    }
    if (includeNumbers) {
      requiredChars.push(NUMBER_CHARS[Math.floor(Math.random() * NUMBER_CHARS.length)]);
    }
    if (includeSymbols) {
      requiredChars.push(SYMBOL_CHARS[Math.floor(Math.random() * SYMBOL_CHARS.length)]);
    }
    
    // Fill the rest with random characters from the full charset
    for (let i = requiredChars.length; i < passwordLength; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle required characters into the password
    const passwordArray = password.split('');
    requiredChars.forEach((char, index) => {
      const randomIndex = Math.floor(Math.random() * (passwordLength - index));
      passwordArray.splice(randomIndex, 0, char);
    });
    
    // Take only the required length (in case we added too many)
    password = passwordArray.slice(0, passwordLength).join('');
    
    setGeneratedPassword(password);
  };

  const handleRegenerate = () => {
    generatePassword();
  };

  // Generate password on mount and when options change
  useEffect(() => {
    generatePassword();
  }, [length, includeUppercase, includeLowercase, includeNumbers, includeSymbols]);

  const handleUsePassword = () => {
    onUsePassword(generatedPassword);
  };

  const generatorContent = (
    <Flex direction="column" gap="4">
          <TextField.Root
            value={generatedPassword}
            readOnly
            size="3"
          />

          <Box>
            <Flex direction="column" gap="2">
              <span>Length: {length[0]}</span>
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
      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>Generate Password</Dialog.Title>
        {generatorContent}
      </Dialog.Content>
    </Dialog.Root>
  );
}
