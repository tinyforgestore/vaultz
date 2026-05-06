import { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { EVENTS } from '@/constants/events';

interface UseVaultLockStateReturn {
  isLocked: boolean;
}

/**
 * Tracks whether the vault is currently locked.
 *
 * - Performs an initial `is_authenticated` check on mount.
 * - Listens for `vault-locked` / `vault-unlocked` events fired from Rust.
 * - On `vault-locked`, also hides the current window (defense-in-depth: when a
 *   logout or auto-lock happens elsewhere, overlays should disappear too).
 *
 * Listeners are registered exactly once on mount and torn down on unmount.
 */
export function useVaultLockState(): UseVaultLockStateReturn {
  const [isLocked, setIsLocked] = useState(false);

  const checkAuth = useCallback(() => {
    invoke<boolean>('is_authenticated')
      .then((authed) => setIsLocked(!authed))
      .catch(() => setIsLocked(true));
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const unlistens: UnlistenFn[] = [];
    listen(EVENTS.VAULT_LOCKED, () => {
      setIsLocked(true);
      // Defense-in-depth: hide our own window when the vault is locked
      // anywhere (logout, auto-lock, tray "Lock", etc.).
      getCurrentWindow().hide().catch(() => {});
    })
      .then((u) => unlistens.push(u))
      .catch(() => {});
    listen(EVENTS.VAULT_UNLOCKED, () => setIsLocked(false))
      .then((u) => unlistens.push(u))
      .catch(() => {});
    return () => {
      unlistens.forEach((u) => u());
    };
    // Register exactly once on mount; no deps.
  }, []);

  return { isLocked };
}
