import { useEffect } from 'react';

export function resolveSearchInput(
  ref: React.RefObject<HTMLInputElement | HTMLElement | null>,
): HTMLInputElement | null {
  const el = ref.current;
  if (!el) return null;
  return el instanceof HTMLInputElement
    ? el
    : (el.querySelector('input') as HTMLInputElement | null);
}

interface UseKeyboardNavOptions {
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
  };
}

export function useKeyboardNav(options: UseKeyboardNavOptions) {
  const {
    itemCount,
    selectedIndex,
    isAnyModalOpen,
    isSelectionMode,
    searchInputRef,
    onSelectIndex,
    onFocusSearch,
    onClearSearch,
    onNextFolder,
    onPrevFolder,
    onToggleSelectionMode,
    itemActions,
  } = options;

  const { onEnter, onCopy, onFavorite, onDelete, onNewPassword, onNewFolder, onToggleItemSelection } = itemActions;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnyModalOpen) return;

      const target = e.target as HTMLElement;
      const tag = target.tagName;
      const isInInput =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        tag === 'BUTTON' ||
        target.isContentEditable;

      // Resolve the actual search input element (ref may point to a container div)
      const searchEl = resolveSearchInput(searchInputRef);

      // From search input only: ArrowDown exits search and selects first item
      if (searchEl && target === searchEl) {
        if (e.key === 'ArrowDown') {
          if (itemCount > 0) {
            e.preventDefault();
            onSelectIndex(0);
            searchEl.blur();
          }
        }
        return;
      }

      // Skip all other shortcuts when focus is inside a form element or button
      if (isInInput) return;

      if (e.key === '/' || (e.metaKey && e.key === 'k')) {
        e.preventDefault();
        onFocusSearch();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        onSelectIndex(Math.min(selectedIndex + 1, itemCount - 1));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (selectedIndex <= 0) {
          onFocusSearch();
        } else {
          onSelectIndex(selectedIndex - 1);
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrevFolder();
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNextFolder();
        return;
      }

      if (e.key === 'Enter') {
        if (selectedIndex >= 0) {
          e.preventDefault();
          onEnter(selectedIndex);
        }
        return;
      }

      if (e.key === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (selectedIndex >= 0) {
          e.preventDefault();
          onCopy(selectedIndex);
        }
        return;
      }

      if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (selectedIndex >= 0) {
          e.preventDefault();
          onFavorite(selectedIndex);
        }
        return;
      }

      if (e.key === 'n' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        onNewPassword();
        return;
      }

      if (e.key === 'N' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        onNewFolder();
        return;
      }

      if (e.key === 'Delete') {
        if (selectedIndex >= 0) {
          e.preventDefault();
          onDelete(selectedIndex);
        }
        return;
      }

      // X — toggle selection mode
      if (e.key === 'x' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        onToggleSelectionMode();
        return;
      }

      // Space — toggle item selection (only when in selection mode and item is highlighted)
      if (e.key === ' ') {
        if (isSelectionMode && selectedIndex >= 0) {
          e.preventDefault();
          onToggleItemSelection(selectedIndex);
        }
        return; // always return to prevent page scroll, even when not in selection mode
      }

      if (e.key === 'Escape') {
        if (searchEl && searchEl.value !== '') {
          e.preventDefault();
          onClearSearch();
        } else if (selectedIndex >= 0) {
          e.preventDefault();
          onSelectIndex(-1);
        }
        // If neither condition is true, let native Escape propagate (e.g. Radix dialog dismiss)
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    itemCount,
    selectedIndex,
    isAnyModalOpen,
    isSelectionMode,
    onSelectIndex,
    onEnter,
    onCopy,
    onFavorite,
    onDelete,
    onNewPassword,
    onNewFolder,
    onToggleItemSelection,
    onNextFolder,
    onPrevFolder,
    onFocusSearch,
    onClearSearch,
    onToggleSelectionMode,
    searchInputRef,
  ]);
}
