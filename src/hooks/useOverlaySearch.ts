import { useEffect, useState, useRef, useCallback, type RefObject } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { type UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { EVENTS } from '@/constants/events';
import { HIDE_AFTER_COPY_MS } from '@/constants/overlay';
import { useTauriEvent } from './useTauriEvent';
import { useVaultLockState } from './useVaultLockState';

export interface OverlayPasswordEntry {
  id: string;
  name: string;
  username: string;
  password: string;
  url?: string | null;
  notes?: string | null;
  folder?: string | null;
}

interface UseOverlaySearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: OverlayPasswordEntry[];
  selectedIndex: number;
  setSelectedIndex: (i: number) => void;
  isLocked: boolean;
  copyPassword: (entry: OverlayPasswordEntry) => void;
  copyUsername: (entry: OverlayPasswordEntry) => void;
  hideOverlay: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function useOverlaySearch(): UseOverlaySearchReturn {
  const { isLocked } = useVaultLockState();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OverlayPasswordEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  // Refs that always reflect the latest values, so the once-on-mount Tauri
  // listener can reach the current state without re-registering on every
  // keystroke (which would drop events firing during the gap).
  const queryRef = useRef(query);
  const isLockedRef = useRef(isLocked);
  useEffect(() => {
    queryRef.current = query;
  }, [query]);
  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  const fetchResults = useCallback((q: string) => {
    if (isLockedRef.current) {
      setResults([]);
      return;
    }
    const command = q.trim() === '' ? 'get_passwords' : 'search_passwords';
    const args: Record<string, unknown> = q.trim() === '' ? {} : { query: q };
    invoke<OverlayPasswordEntry[]>(command, args)
      .then((entries) => {
        const next = Array.isArray(entries) ? entries : [];
        setResults(next);
        // C5: don't reset to 0 — clamp to the new bounds so the user's
        // selection doesn't jump after a refetch (e.g. on passwords-changed).
        setSelectedIndex((prev) => {
          if (next.length === 0) return 0;
          if (prev >= next.length) return next.length - 1;
          return prev;
        });
      })
      .catch(() => {
        setResults([]);
      });
  }, []);

  // Clear results immediately when locked.
  useEffect(() => {
    if (isLocked) {
      setResults([]);
      setQuery('');
    }
  }, [isLocked]);

  // Debounced search on query change. Runs on mount with empty query, so we
  // don't need a separate "initial fetch" effect (M11).
  useEffect(() => {
    if (isLocked) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(query);
    }, 100);
    return () => clearTimeout(debounceRef.current);
  }, [query, isLocked, fetchResults]);

  // Refetch whenever the backend signals passwords changed. The shared
  // useTauriEvent hook registers once and reads the latest handler via ref,
  // so changes to fetchResults don't re-register.
  useTauriEvent(EVENTS.PASSWORDS_CHANGED, () => {
    fetchResults(queryRef.current);
  });

  // C6: refocus input + clear query each time the overlay window is shown.
  // Pre-warmed windows reuse the same React tree, so the mount-only focus
  // effect doesn't fire on subsequent shows.
  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    getCurrentWindow()
      .listen('tauri://focus', () => {
        setQuery('');
        setSelectedIndex(0);
        // Defer one tick so the input is in the DOM after re-render.
        setTimeout(() => inputRef.current?.focus(), 0);
      })
      .then((u) => {
        unlisten = u;
      })
      .catch(() => {});
    // Initial focus on mount (first time the overlay is created).
    inputRef.current?.focus();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const hideOverlay = useCallback(() => {
    invoke('hide_overlay_search').catch(() => {});
  }, []);

  const copyPassword = useCallback(
    (entry: OverlayPasswordEntry) => {
      invoke('write_secret_to_clipboard', { text: entry.password })
        .catch(() => {})
        .finally(() => {
          setTimeout(() => hideOverlay(), HIDE_AFTER_COPY_MS);
        });
    },
    [hideOverlay],
  );

  const copyUsername = useCallback(
    (entry: OverlayPasswordEntry) => {
      invoke('write_secret_to_clipboard', { text: entry.username })
        .catch(() => {})
        .finally(() => {
          setTimeout(() => hideOverlay(), HIDE_AFTER_COPY_MS);
        });
    },
    [hideOverlay],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        hideOverlay();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(Math.min(selectedIndex + 1, results.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(Math.max(selectedIndex - 1, 0));
        return;
      }
      const selected = results[selectedIndex];
      if (!selected) return;
      // C2: bare-P is removed. Only Cmd/Ctrl+P copies password (Enter also
      // does, since the input is the only focusable element).
      if (e.key === 'Enter') {
        e.preventDefault();
        copyPassword(selected);
        return;
      }
      if (e.key.toLowerCase() === 'p' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        copyPassword(selected);
        return;
      }
      if (e.key.toLowerCase() === 'e' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        copyUsername(selected);
      }
    },
    [results, selectedIndex, hideOverlay, copyPassword, copyUsername],
  );

  return {
    query,
    setQuery,
    results,
    selectedIndex,
    setSelectedIndex,
    isLocked,
    copyPassword,
    copyUsername,
    hideOverlay,
    inputRef,
    handleKeyDown,
  };
}
