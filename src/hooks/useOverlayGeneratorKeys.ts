import { useEffect } from 'react';
import { useLatestArgs } from './useLatestArgs';

interface UseOverlayGeneratorKeysArgs {
  /** Called on Escape — e.g. to dismiss the overlay or the entire app. */
  onDismiss: () => void;
}

/**
 * Window-level keyboard shortcuts for the generator overlay.
 * Currently just Esc → dismiss. Registered once on mount; reads the latest
 * args via a ref so re-renders don't re-attach the listener.
 */
export function useOverlayGeneratorKeys(args: UseOverlayGeneratorKeysArgs) {
  const argsRef = useLatestArgs(args);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') argsRef.current.onDismiss();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [argsRef]);
}
