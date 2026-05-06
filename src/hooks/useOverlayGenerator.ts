import { useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { HIDE_AFTER_COPY_MS } from '@/constants/overlay';
import { useVaultLockState } from './useVaultLockState';

interface UseOverlayGeneratorReturn {
  isLocked: boolean;
  hideOverlay: () => void;
  copyToClipboard: (text: string) => void;
  // PM-024: stub for "create entry from generated password" flow
  saveAsEntry: () => void;
}

export function useOverlayGenerator(): UseOverlayGeneratorReturn {
  const { isLocked } = useVaultLockState();

  const hideOverlay = useCallback(() => {
    invoke('hide_overlay_generator').catch(() => {});
  }, []);

  // Escape to close — handler owned by the hook (M2).
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideOverlay();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [hideOverlay]);

  const copyToClipboard = useCallback(
    (text: string) => {
      invoke('write_secret_to_clipboard', { text })
        .catch(() => {})
        .finally(() => {
          setTimeout(() => hideOverlay(), HIDE_AFTER_COPY_MS);
        });
    },
    [hideOverlay],
  );

  // TODO(PM-024): wire up generation-first entry creation flow.
  // For now this is a stub — intentional no-op.
  const saveAsEntry = useCallback(() => {
    // Intentional no-op until PM-024.
  }, []);

  return { isLocked, hideOverlay, copyToClipboard, saveAsEntry };
}
