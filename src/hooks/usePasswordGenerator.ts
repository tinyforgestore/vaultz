import { useState, useEffect } from 'react';
import { buildPassword } from '@/utils/passwordGenerator';

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
    setGeneratedPassword(buildPassword(length[0], includeUppercase, includeLowercase, includeNumbers, includeSymbols));
  };

  const handleRegenerate = generatePassword;

  const handleUsePassword = () => {
    onUsePassword(generatedPassword);
  };

  useEffect(() => {
    setGeneratedPassword(buildPassword(length[0], includeUppercase, includeLowercase, includeNumbers, includeSymbols));
  }, [length, includeUppercase, includeLowercase, includeNumbers, includeSymbols]);

  return {
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
  };
}
