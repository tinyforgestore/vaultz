import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { EVENTS } from '@/constants/events';
import { useTauriEvent } from './useTauriEvent';
import { useClipboard } from './useClipboard';
import { useGeneratedPasswordsPageKeys } from './useGeneratedPasswordsPageKeys';

export interface GeneratedPasswordItem {
  id: number;
  password: string;
  createdAt: string;
}

interface RawGeneratedPassword {
  id: number;
  password: string;
  // Rust serde serializes `created_at` snake_case
  created_at: string;
}

function mapItem(raw: RawGeneratedPassword): GeneratedPasswordItem {
  return { id: raw.id, password: raw.password, createdAt: raw.created_at };
}

export function useGeneratedPasswordsPage() {
  const [history, setHistory] = useState<GeneratedPasswordItem[]>([]);
  // Hidden by id (default: empty — passwords shown plaintext so users can
  // distinguish entries; clicking the eye toggles per-row).
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());
  const [confirmClear, setConfirmClear] = useState(false);
  // Default-select the first row so keyboard shortcuts are usable on entry.
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { copiedId, clipboardToast, handleCopyPassword } = useClipboard();

  const refresh = useCallback(() => {
    invoke<RawGeneratedPassword[]>('list_generated_passwords')
      .then((rows) => setHistory(rows.map(mapItem)))
      .catch(() => setHistory([]));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Clamp selection to valid range when history changes.
  useEffect(() => {
    if (history.length === 0) {
      setSelectedIndex(-1);
    } else {
      setSelectedIndex((i) => {
        if (i < 0) return 0;
        if (i >= history.length) return history.length - 1;
        return i;
      });
    }
  }, [history]);

  // Refresh whenever the backend signals the history changed.
  useTauriEvent(EVENTS.GENERATED_PASSWORDS_CHANGED, () => {
    refresh();
  });

  const handleCopy = useCallback(
    (item: GeneratedPasswordItem) => {
      handleCopyPassword(String(item.id), item.password);
    },
    [handleCopyPassword],
  );

  const handleDelete = useCallback((id: number) => {
    invoke('delete_generated_password', { id }).catch(() => {});
  }, []);

  const handleRequestClearAll = useCallback(() => {
    setConfirmClear(true);
  }, []);

  const handleCancelClearAll = useCallback(() => {
    setConfirmClear(false);
  }, []);

  const handleConfirmClearAll = useCallback(() => {
    setConfirmClear(false);
    invoke('clear_generated_passwords').catch(() => {});
  }, []);

  const handleCreateEntry = useCallback(
    (password: string) => {
      navigate('/dashboard', { state: { prefilledPassword: password } });
    },
    [navigate],
  );

  const handleBack = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  const handleHide = useCallback((id: number) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const handleReveal = useCallback((id: number) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleToggleVisibility = useCallback(
    (id: number) => {
      if (hiddenIds.has(id)) handleReveal(id);
      else handleHide(id);
    },
    [hiddenIds, handleHide, handleReveal],
  );

  // Keyboard navigation — mirrors dashboard list page (PM-021).
  // Owned by its own module (kurippa pattern).
  const hasSelection = selectedIndex >= 0 && selectedIndex < history.length;
  const selected = hasSelection ? history[selectedIndex] : null;

  useGeneratedPasswordsPageKeys({
    enabled: !confirmClear,
    hasSelection,
    onBack: handleBack,
    onSelectNext: () => setSelectedIndex((i) => Math.min(i + 1, history.length - 1)),
    onSelectPrev: () => setSelectedIndex((i) => Math.max(i - 1, 0)),
    onDeselect: () => setSelectedIndex(-1),
    onConfirm: () => {
      if (selected) handleCreateEntry(selected.password);
    },
    onCopy: () => {
      if (selected) handleCopy(selected);
    },
    onDelete: () => {
      if (selected) handleDelete(selected.id);
    },
    onToggleVisibility: () => {
      if (selected) handleToggleVisibility(selected.id);
    },
  });

  return {
    history,
    hiddenIds,
    confirmClear,
    selectedIndex,
    setSelectedIndex,
    copiedId,
    clipboardToast,
    handleCopy,
    handleDelete,
    handleRequestClearAll,
    handleCancelClearAll,
    handleConfirmClearAll,
    handleCreateEntry,
    handleBack,
    handleReveal,
    handleHide,
  };
}
