import { useEffect, useRef } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

/**
 * Subscribes to a Tauri event for the lifetime of the calling component.
 *
 * - Registers the listener exactly once on mount and cleans up on unmount.
 * - The latest `handler` closure is always invoked even though we register
 *   only once: a `handlerRef` is updated on each render, and the registered
 *   listener reads through it. This means consumers can pass inline closures
 *   without triggering re-registration on every render.
 * - Errors thrown while registering the listener are swallowed; this is
 *   consistent with how the rest of the codebase handles Tauri listen
 *   failures (best-effort).
 */
export function useTauriEvent<T = unknown>(
  eventName: string,
  handler: (payload: T) => void,
): void {
  const handlerRef = useRef(handler);
  // Keep the ref pointed at the latest handler on every render so the
  // mount-only listener always invokes the freshest closure.
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    let mounted = true;

    listen<T>(eventName, (event) => {
      handlerRef.current(event.payload);
    })
      .then((fn) => {
        if (mounted) unlisten = fn;
        else fn();
      })
      .catch(() => {});

    return () => {
      mounted = false;
      unlisten?.();
    };
    // eventName changes are uncommon; if it does change we re-register.
  }, [eventName]);
}
