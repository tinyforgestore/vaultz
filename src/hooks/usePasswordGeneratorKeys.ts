import { useEffect } from 'react';
import { isFromInput } from '@/utils/keyboard';
import { useLatestArgs } from './useLatestArgs';

interface UsePasswordGeneratorKeysArgs {
  /** Skip handler entirely when not embedded (e.g. dashboard modal). */
  enabled: boolean;
  /** Called on Enter — commits the current generated password. */
  onUsePassword: () => void;
  /** ←: -1 length (clamped server-side). */
  onDecrementLength: () => void;
  /** →: +1 length (clamped server-side). */
  onIncrementLength: () => void;
  /** U/L/N/S: toggle a charset; key passed as the second arg below. */
  onToggleUppercase: () => void;
  onToggleLowercase: () => void;
  onToggleNumbers: () => void;
  onToggleSymbols: () => void;
  /** R: regenerate. */
  onRegenerate: () => void;
}

/**
 * Window-level keyboard shortcuts for the embedded PasswordGenerator.
 * Listener registered once on mount; latest args read via ref so re-renders
 * don't re-attach (kurippa pattern).
 *
 * Shortcuts (suppressed inside inputs/textareas):
 * - Enter → onUsePassword
 * - ArrowLeft / ArrowRight → onDecrementLength / onIncrementLength
 * - U/L/N/S → toggle uppercase / lowercase / numbers / symbols
 * - R → onRegenerate
 *
 * Modifier keys (cmd/ctrl/alt) suppress the bare-letter cases so the user's
 * native shortcuts (Cmd+R reload, etc.) are preserved.
 */
export function usePasswordGeneratorKeys(args: UsePasswordGeneratorKeysArgs) {
  const argsRef = useLatestArgs(args);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const a = argsRef.current;
      if (!a.enabled) return;
      if (isFromInput(e)) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        a.onUsePassword();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        a.onDecrementLength();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        a.onIncrementLength();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key.toLowerCase()) {
        case 'u':
          e.preventDefault();
          a.onToggleUppercase();
          break;
        case 'l':
          e.preventDefault();
          a.onToggleLowercase();
          break;
        case 'n':
          e.preventDefault();
          a.onToggleNumbers();
          break;
        case 's':
          e.preventDefault();
          a.onToggleSymbols();
          break;
        case 'r':
          e.preventDefault();
          a.onRegenerate();
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [argsRef]);
}
