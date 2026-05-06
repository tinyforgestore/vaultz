import { useState, useEffect } from 'react';
import { buildPassword } from '@/utils/passwordGenerator';

interface UsePasswordGeneratorProps {
  onUsePassword: (password: string) => void;
  enableShortcuts?: boolean;
}

const MIN_LENGTH = 8;
const MAX_LENGTH = 32;

export function usePasswordGenerator({ onUsePassword, enableShortcuts = false }: UsePasswordGeneratorProps) {
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

  useEffect(() => {
    if (!enableShortcuts) return;
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        onUsePassword(generatedPassword);
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setLength((prev) => [Math.max(MIN_LENGTH, prev[0] - 1)]);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setLength((prev) => [Math.min(MAX_LENGTH, prev[0] + 1)]);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key.toLowerCase()) {
        case 'u':
          e.preventDefault();
          setIncludeUppercase((v) => !v);
          break;
        case 'l':
          e.preventDefault();
          setIncludeLowercase((v) => !v);
          break;
        case 'n':
          e.preventDefault();
          setIncludeNumbers((v) => !v);
          break;
        case 's':
          e.preventDefault();
          setIncludeSymbols((v) => !v);
          break;
        case 'r':
          e.preventDefault();
          generatePassword();
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableShortcuts, generatedPassword, onUsePassword]);

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
