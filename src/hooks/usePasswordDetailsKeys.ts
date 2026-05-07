import { useEffect, useRef } from 'react';

interface PasswordSnapshot {
  username?: string;
  password: string;
  website?: string | null;
}

interface UsePasswordDetailsKeysArgs {
  /** Skip handler when a modal is open (Edit / Delete). */
  enabled: boolean;
  password: PasswordSnapshot | null;
  onBack: () => void;
  onEdit: () => void;
  onToggleFavorite: () => void;
  onCopyField: (field: string, value: string) => void;
}

/**
 * Document-level keyboard shortcuts for the password detail page.
 * Listener is registered once on mount and reads the latest args via ref so
 * re-renders don't re-attach (kurippa pattern, mirrors useTauriEvent).
 *
 * Shortcuts (no modifier):
 * - Escape / Backspace → onBack
 * - 1 → copy username
 * - 2 → copy password
 * - 3 → copy URL
 * - E → onEdit
 * - F → onToggleFavorite
 *
 * Suppressed when focus is inside an input/textarea/select/contenteditable
 * or when `enabled` is false (e.g. a modal is open).
 */
export function usePasswordDetailsKeys(args: UsePasswordDetailsKeysArgs) {
  const argsRef = useRef(args);
  useEffect(() => {
    argsRef.current = args;
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const { enabled, password, onBack, onEdit, onToggleFavorite, onCopyField } = argsRef.current;
      if (!enabled) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const inInput =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!target?.isContentEditable;
      if (inInput) return;

      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        onBack();
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!password) return;

      switch (e.key) {
        case '1':
          e.preventDefault();
          onCopyField('username', password.username ?? '');
          return;
        case '2':
          e.preventDefault();
          onCopyField('password', password.password);
          return;
        case '3':
          // Field name must match the page's `copiedField` checks (see
          // PasswordDetailsPage: copiedField === 'website') for the check
          // icon to flash on the URL row.
          e.preventDefault();
          onCopyField('website', password.website ?? '');
          return;
      }

      const k = e.key.toLowerCase();
      if (k === 'e') {
        e.preventDefault();
        onEdit();
      } else if (k === 'f') {
        e.preventDefault();
        onToggleFavorite();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);
}
