import { useState, useEffect } from 'react';
import { buildPassword } from '@/utils/passwordGenerator';
import { usePasswordGeneratorKeys } from './usePasswordGeneratorKeys';

interface UsePasswordGeneratorProps {
  onUsePassword: (password: string) => void;
  enableShortcuts?: boolean;
  /**
   * Called whenever the user *commits* to a generated password (via
   * "Use This Password" or the Enter shortcut). NOT called on slider tick,
   * checkbox toggle, or regenerate — only when the user explicitly elects
   * to use the value. Implementations should record the password to history.
   */
  onRecordGenerated?: (password: string) => void;
  /** Called whenever a new password is generated (initial mount + regenerate + option toggles). */
  onGeneratedChange?: (password: string) => void;
}

const MIN_LENGTH = 8;
const MAX_LENGTH = 32;

export function usePasswordGenerator({ onUsePassword, enableShortcuts = false, onRecordGenerated, onGeneratedChange }: UsePasswordGeneratorProps) {
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
    onRecordGenerated?.(generatedPassword);
    onUsePassword(generatedPassword);
  };

  useEffect(() => {
    setGeneratedPassword(buildPassword(length[0], includeUppercase, includeLowercase, includeNumbers, includeSymbols));
  }, [length, includeUppercase, includeLowercase, includeNumbers, includeSymbols]);

  useEffect(() => {
    if (generatedPassword) onGeneratedChange?.(generatedPassword);
  }, [generatedPassword, onGeneratedChange]);

  // Keyboard shortcuts owned by their own module (kurippa pattern).
  usePasswordGeneratorKeys({
    enabled: enableShortcuts,
    onUsePassword: handleUsePassword,
    onDecrementLength: () => setLength((prev) => [Math.max(MIN_LENGTH, prev[0] - 1)]),
    onIncrementLength: () => setLength((prev) => [Math.min(MAX_LENGTH, prev[0] + 1)]),
    onToggleUppercase: () => setIncludeUppercase((v) => !v),
    onToggleLowercase: () => setIncludeLowercase((v) => !v),
    onToggleNumbers: () => setIncludeNumbers((v) => !v),
    onToggleSymbols: () => setIncludeSymbols((v) => !v),
    onRegenerate: generatePassword,
  });

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
