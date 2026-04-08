import { useState, useEffect } from 'react';

const UPPERCASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE_CHARS = 'abcdefghijklmnopqrstuvwxyz';
const NUMBER_CHARS = '0123456789';
const SYMBOL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

interface UsePasswordGeneratorProps {
  onUsePassword: (password: string) => void;
}

export function usePasswordGenerator({ onUsePassword }: UsePasswordGeneratorProps) {
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

  const handleUsePassword = () => {
    onUsePassword(generatedPassword);
  };

  // Generate password on mount and when options change
  useEffect(() => {
    generatePassword();
  }, [length, includeUppercase, includeLowercase, includeNumbers, includeSymbols]);

  return {
    // State
    generatedPassword,
    length,
    includeUppercase,
    includeLowercase,
    includeNumbers,
    includeSymbols,

    // Setters
    setLength,
    setIncludeUppercase,
    setIncludeLowercase,
    setIncludeNumbers,
    setIncludeSymbols,

    // Handlers
    handleRegenerate,
    handleUsePassword,
  };
}
