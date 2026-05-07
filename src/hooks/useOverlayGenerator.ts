import { useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { HIDE_AFTER_COPY_MS } from '@/constants/overlay';
import { recordGeneratedPassword } from '@/utils/recordGeneratedPassword';
import { useVaultLockState } from './useVaultLockState';

interface UseOverlayGeneratorReturn {
  isLocked: boolean;
  hideOverlay: () => void;
  copyToClipboard: (text: string) => void;
  /** Records a generated password into history (no UI side-effects). */
  recordGenerated: (password: string) => void;
  /** Tracks the latest generated value emitted by the embedded generator. */
  handleGeneratedChange: (password: string) => void;
  /** Sends the latest generated password to the main window's create-entry flow. */
  saveAsEntry: () => void;
}

export function useOverlayGenerator(): UseOverlayGeneratorReturn {
  const { isLocked } = useVaultLockState();
  // latestPasswordRef holds the most recent generated value so saveAsEntry
  // (a stable callback) can read it without re-creating on every regeneration.
  // The ref is updated via the onGeneratedChange callback fired by the embedded
  // PasswordGenerator on every regeneration — so this depends on the generator
  // wiring `handleGeneratedChange` to its onGeneratedChange prop.
  const latestPasswordRef = useRef<string>('');

  const hideOverlay = useCallback(() => {
    invoke('hide_overlay_generator').catch(() => {});
  }, []);

  // Dismiss the entire app on Escape (or after copy) so focus returns to the
  // previously-active app rather than to Vaultz's main window.
  const dismissApp = useCallback(() => {
    invoke('hide_app_after_copy').catch(() => {});
  }, []);

  // Escape to close — handler owned by the hook (M2).
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissApp();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dismissApp]);

  const recordGenerated = useCallback((password: string) => {
    recordGeneratedPassword(password);
  }, []);

  const copyToClipboard = useCallback((text: string) => {
    // Note: history recording is the responsibility of PasswordGenerator's
    // onRecordGenerated wiring (single source). Do NOT call recordGenerated
    // here — that would insert a duplicate row per Use/Enter action.
    //
    // After copy, hide the entire app (not just the overlay) so focus returns
    // to whichever app the user came from — Cmd+V lands there, not in
    // Vaultz's main window.
    invoke('write_secret_to_clipboard', { text })
      .catch(() => {})
      .finally(() => {
        setTimeout(() => {
          invoke('hide_app_after_copy').catch(() => {});
        }, HIDE_AFTER_COPY_MS);
      });
  }, []);

  const handleGeneratedChange = useCallback((password: string) => {
    latestPasswordRef.current = password;
  }, []);

  const saveAsEntry = useCallback(() => {
    const password = latestPasswordRef.current;
    if (!password) return;
    invoke('open_create_entry_prefilled', { password }).catch(() => {});
  }, []);

  return { isLocked, hideOverlay, copyToClipboard, recordGenerated, handleGeneratedChange, saveAsEntry };
}
