import { useEffect } from 'react';
import { isFromInput } from '@/utils/keyboard';
import { useLatestArgs } from './useLatestArgs';

export function resolveSearchInput(
  ref: React.RefObject<HTMLInputElement | HTMLElement | null>,
): HTMLInputElement | null {
  const el = ref.current;
  if (!el) return null;
  return el.tagName === 'INPUT'
    ? (el as HTMLInputElement)
    : (el.querySelector('input') as HTMLInputElement | null);
}

interface UseDashboardKeysOptions {
  itemCount: number;
  selectedIndex: number;
  isAnyModalOpen: boolean;
  isSelectionMode: boolean;
  searchInputRef: React.RefObject<HTMLInputElement | HTMLElement | null>;
  onSelectIndex: (index: number) => void;
  onFocusSearch: () => void;
  onClearSearch: () => void;
  onNextFolder: () => void;
  onPrevFolder: () => void;
  onToggleSelectionMode: () => void;
  itemActions: {
    onEnter: (index: number) => void;
    onCopy: (index: number) => void;
    onFavorite: (index: number) => void;
    onDelete: (index: number) => void;
    onNewPassword: () => void;
    onNewFolder: () => void;
    onToggleItemSelection: (index: number) => void;
    onOpenHistory: () => void;
  };
}

export function useDashboardKeys(options: UseDashboardKeysOptions) {
  const argsRef = useLatestArgs(options);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const a = argsRef.current;
      if (a.isAnyModalOpen) return;

      // Resolve the actual search input element (ref may point to a container div).
      // Special-case ArrowDown from the search input FIRST, before the generic
      // isFromInput guard — pressing ArrowDown while focused inside the search
      // input must still move focus into the list.
      const searchEl = resolveSearchInput(a.searchInputRef);
      if (searchEl && e.target === searchEl) {
        if (e.key === 'ArrowDown') {
          if (a.itemCount > 0) {
            e.preventDefault();
            a.onSelectIndex(0);
            searchEl.blur();
          }
        }
        return;
      }

      // Skip all other shortcuts when focus is inside a form element or button.
      if (isFromInput(e, { includeButton: true })) return;

      if (e.key === '/' || (e.metaKey && e.key === 'k')) {
        e.preventDefault();
        a.onFocusSearch();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        a.onSelectIndex(Math.min(a.selectedIndex + 1, a.itemCount - 1));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (a.selectedIndex <= 0) {
          a.onFocusSearch();
        } else {
          a.onSelectIndex(a.selectedIndex - 1);
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        a.onPrevFolder();
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        a.onNextFolder();
        return;
      }

      if (e.key === 'Enter') {
        if (a.selectedIndex >= 0) {
          e.preventDefault();
          a.itemActions.onEnter(a.selectedIndex);
        }
        return;
      }

      if (e.key === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (a.selectedIndex >= 0) {
          e.preventDefault();
          a.itemActions.onCopy(a.selectedIndex);
        }
        return;
      }

      if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (a.selectedIndex >= 0) {
          e.preventDefault();
          a.itemActions.onFavorite(a.selectedIndex);
        }
        return;
      }

      if (e.key === 'n' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        a.itemActions.onNewPassword();
        return;
      }

      if (e.key === 'N' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        a.itemActions.onNewFolder();
        return;
      }

      if (e.key === 'Delete') {
        if (a.selectedIndex >= 0) {
          e.preventDefault();
          a.itemActions.onDelete(a.selectedIndex);
        }
        return;
      }

      // X — toggle selection mode
      if (e.key === 'x' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        a.onToggleSelectionMode();
        return;
      }

      // H — open generated passwords history
      if (e.key === 'h' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        a.itemActions.onOpenHistory();
        return;
      }

      // Space — toggle item selection (only when in selection mode and item is highlighted)
      if (e.key === ' ') {
        if (a.isSelectionMode && a.selectedIndex >= 0) {
          e.preventDefault();
          a.itemActions.onToggleItemSelection(a.selectedIndex);
        }
        return; // always return to prevent page scroll, even when not in selection mode
      }

      if (e.key === 'Escape') {
        if (searchEl && searchEl.value !== '') {
          e.preventDefault();
          a.onClearSearch();
        } else if (a.selectedIndex >= 0) {
          e.preventDefault();
          a.onSelectIndex(-1);
        }
        // If neither condition is true, let native Escape propagate (e.g. Radix dialog dismiss)
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [argsRef]);
}
