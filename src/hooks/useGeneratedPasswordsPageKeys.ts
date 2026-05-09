import { useEffect } from 'react';
import { isFromInput } from '@/utils/keyboard';
import { useLatestArgs } from './useLatestArgs';

interface UseGeneratedPasswordsPageKeysArgs {
  /** Skip handler when a confirm dialog is open. */
  enabled: boolean;
  /** Whether a row is currently selected (drives Esc / action gating). */
  hasSelection: boolean;
  onBack: () => void;
  onSelectNext: () => void;
  onSelectPrev: () => void;
  onDeselect: () => void;
  /**
   * Pre-bound to the currently-selected item by the parent. The parent must
   * guard internally on whether a selection exists — this hook fires
   * unconditionally when the keyboard event matches.
   */
  onConfirm: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
}

/**
 * Document-level keyboard shortcuts for the Generated Passwords page.
 * Listener registered once on mount; latest args read via ref so
 * re-renders don't re-attach (kurippa pattern).
 *
 * Shortcuts (no modifier, suppressed inside inputs / buttons):
 * - ArrowLeft → onBack
 * - ArrowUp / ArrowDown → onSelectPrev / onSelectNext
 * - Enter → onConfirm
 * - C → onCopy
 * - R → onToggleVisibility
 * - Delete / Backspace → onDelete
 * - Escape → onDeselect (when something selected) else onBack
 */
export function useGeneratedPasswordsPageKeys(args: UseGeneratedPasswordsPageKeysArgs) {
  const argsRef = useLatestArgs(args);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const a = argsRef.current;
      if (!a.enabled) return;
      if (isFromInput(e, { includeButton: true })) return;

      // ArrowLeft → back to dashboard (parallels Settings page behavior).
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        a.onBack();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        a.onSelectNext();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        a.onSelectPrev();
        return;
      }
      // When nothing is selected, Esc leaves the page entirely; otherwise it
      // deselects (handled below).
      if (!a.hasSelection) {
        if (e.key === 'Escape') {
          e.preventDefault();
          a.onBack();
        }
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        a.onConfirm();
        return;
      }
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        a.onCopy();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        a.onDelete();
        return;
      }
      if (e.key === 'r' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        a.onToggleVisibility();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        a.onDeselect();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [argsRef]);
}
