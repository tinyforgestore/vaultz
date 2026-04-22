import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardNav } from './useKeyboardNav';

vi.mock('@tauri-apps/api/core');

// Helper to fire a keydown event on document
function fireKey(
  key: string,
  opts: { metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean; shiftKey?: boolean; target?: EventTarget } = {},
) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    metaKey: opts.metaKey ?? false,
    ctrlKey: opts.ctrlKey ?? false,
    altKey: opts.altKey ?? false,
    shiftKey: opts.shiftKey ?? false,
  });

  if (opts.target) {
    // Override non-writable target via defineProperty
    Object.defineProperty(event, 'target', { value: opts.target, writable: false });
  }

  document.dispatchEvent(event);
  return event;
}

// Default options factory — every callback is a vi.fn()
function makeOptions(overrides: Record<string, unknown> = {}) {
  const searchInput = document.createElement('input');
  const searchInputRef = { current: searchInput } as React.RefObject<HTMLInputElement>;

  return {
    itemCount: 3,
    selectedIndex: 1,
    isAnyModalOpen: false,
    isSelectionMode: false,
    onSelectIndex: vi.fn(),
    onFocusSearch: vi.fn(),
    onClearSearch: vi.fn(),
    onNextFolder: vi.fn(),
    onPrevFolder: vi.fn(),
    onToggleSelectionMode: vi.fn(),
    itemActions: {
      onEnter: vi.fn(),
      onCopy: vi.fn(),
      onFavorite: vi.fn(),
      onDelete: vi.fn(),
      onNewPassword: vi.fn(),
      onNewFolder: vi.fn(),
      onToggleItemSelection: vi.fn(),
    },
    searchInputRef,
    searchInput,
    ...overrides,
  };
}

describe('useKeyboardNav', () => {
  let opts: ReturnType<typeof makeOptions>;

  beforeEach(() => {
    opts = makeOptions();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── isAnyModalOpen guard ──────────────────────────────────────────────────────

  describe('isAnyModalOpen guard', () => {
    it('fires no shortcuts when isAnyModalOpen is true', () => {
      const modalOpts = makeOptions({ isAnyModalOpen: true, isSelectionMode: true });
      renderHook(() => useKeyboardNav(modalOpts));
      act(() => {
        fireKey('ArrowDown');
        fireKey('ArrowUp');
        fireKey('ArrowLeft');
        fireKey('ArrowRight');
        fireKey('Enter');
        fireKey('c');
        fireKey('f');
        fireKey('n');
        fireKey('N', { shiftKey: true });
        fireKey('Delete');
        fireKey('/');
        fireKey('Escape');
        fireKey('x');
        fireKey(' ');
      });
      expect(modalOpts.onSelectIndex).not.toHaveBeenCalled();
      expect(modalOpts.onFocusSearch).not.toHaveBeenCalled();
      expect(modalOpts.onClearSearch).not.toHaveBeenCalled();
      expect(modalOpts.onNextFolder).not.toHaveBeenCalled();
      expect(modalOpts.onPrevFolder).not.toHaveBeenCalled();
      expect(modalOpts.itemActions.onEnter).not.toHaveBeenCalled();
      expect(modalOpts.itemActions.onCopy).not.toHaveBeenCalled();
      expect(modalOpts.itemActions.onFavorite).not.toHaveBeenCalled();
      expect(modalOpts.itemActions.onDelete).not.toHaveBeenCalled();
      expect(modalOpts.itemActions.onNewPassword).not.toHaveBeenCalled();
      expect(modalOpts.itemActions.onNewFolder).not.toHaveBeenCalled();
      expect(modalOpts.onToggleSelectionMode).not.toHaveBeenCalled();
      expect(modalOpts.itemActions.onToggleItemSelection).not.toHaveBeenCalled();
    });
  });

  // ── ArrowDown ────────────────────────────────────────────────────────────────

  describe('ArrowDown', () => {
    it('increments selectedIndex when itemCount > 1', () => {
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: 0, itemCount: 3 }));
      act(() => { fireKey('ArrowDown'); });
      expect(opts.onSelectIndex).toHaveBeenCalledWith(1);
    });

    it('clamps at itemCount - 1', () => {
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: 2, itemCount: 3 }));
      act(() => { fireKey('ArrowDown'); });
      expect(opts.onSelectIndex).toHaveBeenCalledWith(2);
    });
  });

  // ── ArrowUp ──────────────────────────────────────────────────────────────────

  describe('ArrowUp', () => {
    it('decrements selectedIndex when index > 0', () => {
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: 2, itemCount: 3 }));
      act(() => { fireKey('ArrowUp'); });
      expect(opts.onSelectIndex).toHaveBeenCalledWith(1);
    });

    it('calls onFocusSearch when selectedIndex is 0', () => {
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: 0, itemCount: 3 }));
      act(() => { fireKey('ArrowUp'); });
      expect(opts.onFocusSearch).toHaveBeenCalledOnce();
      expect(opts.onSelectIndex).not.toHaveBeenCalled();
    });

    it('calls onFocusSearch when selectedIndex is -1', () => {
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: -1, itemCount: 3 }));
      act(() => { fireKey('ArrowUp'); });
      expect(opts.onFocusSearch).toHaveBeenCalledOnce();
    });
  });

  // ── ArrowLeft / ArrowRight ───────────────────────────────────────────────────

  it('ArrowLeft calls onPrevFolder', () => {
    renderHook(() => useKeyboardNav(opts));
    act(() => { fireKey('ArrowLeft'); });
    expect(opts.onPrevFolder).toHaveBeenCalledOnce();
  });

  it('ArrowRight calls onNextFolder', () => {
    renderHook(() => useKeyboardNav(opts));
    act(() => { fireKey('ArrowRight'); });
    expect(opts.onNextFolder).toHaveBeenCalledOnce();
  });

  // ── Enter ────────────────────────────────────────────────────────────────────

  describe('Enter', () => {
    it('calls onEnter with selectedIndex when selectedIndex >= 0', () => {
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: 1 }));
      act(() => { fireKey('Enter'); });
      expect(opts.itemActions.onEnter).toHaveBeenCalledWith(1);
    });

    it('does nothing when selectedIndex is -1', () => {
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: -1 }));
      act(() => { fireKey('Enter'); });
      expect(opts.itemActions.onEnter).not.toHaveBeenCalled();
    });
  });

  // ── c (copy) ─────────────────────────────────────────────────────────────────

  describe('c key', () => {
    it('calls onCopy with selectedIndex when selectedIndex >= 0', () => {
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: 2 }));
      act(() => { fireKey('c'); });
      expect(opts.itemActions.onCopy).toHaveBeenCalledWith(2);
    });

    it('does nothing when selectedIndex is -1', () => {
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: -1 }));
      act(() => { fireKey('c'); });
      expect(opts.itemActions.onCopy).not.toHaveBeenCalled();
    });

    it('does nothing when Ctrl+c is pressed', () => {
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: 1 }));
      act(() => { fireKey('c', { ctrlKey: true }); });
      expect(opts.itemActions.onCopy).not.toHaveBeenCalled();
    });

    it('does nothing when Cmd+c is pressed', () => {
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: 1 }));
      act(() => { fireKey('c', { metaKey: true }); });
      expect(opts.itemActions.onCopy).not.toHaveBeenCalled();
    });
  });

  // ── f (favorite) ─────────────────────────────────────────────────────────────

  describe('f key', () => {
    it('calls onFavorite with selectedIndex when selectedIndex >= 0', () => {
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: 0 }));
      act(() => { fireKey('f'); });
      expect(opts.itemActions.onFavorite).toHaveBeenCalledWith(0);
    });

    it('does nothing when selectedIndex is -1', () => {
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: -1 }));
      act(() => { fireKey('f'); });
      expect(opts.itemActions.onFavorite).not.toHaveBeenCalled();
    });

    it('does nothing when Cmd+f is pressed', () => {
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: 1 }));
      act(() => { fireKey('f', { metaKey: true }); });
      expect(opts.itemActions.onFavorite).not.toHaveBeenCalled();
    });
  });

  // ── n (new password) ─────────────────────────────────────────────────────────

  describe('n key', () => {
    it('calls onNewPassword when n is pressed with no modifiers', () => {
      renderHook(() => useKeyboardNav(opts));
      act(() => { fireKey('n'); });
      expect(opts.itemActions.onNewPassword).toHaveBeenCalledOnce();
    });

    it('does not call onNewPassword when Cmd+n is pressed', () => {
      renderHook(() => useKeyboardNav(opts));
      act(() => { fireKey('n', { metaKey: true }); });
      expect(opts.itemActions.onNewPassword).not.toHaveBeenCalled();
    });

    it('does not call onNewPassword when Ctrl+n is pressed', () => {
      renderHook(() => useKeyboardNav(opts));
      act(() => { fireKey('n', { ctrlKey: true }); });
      expect(opts.itemActions.onNewPassword).not.toHaveBeenCalled();
    });
  });

  // ── N / Shift+N (new folder) ──────────────────────────────────────────────────

  describe('N key (Shift+N)', () => {
    it('calls onNewFolder when Shift+N is pressed', () => {
      renderHook(() => useKeyboardNav(opts));
      act(() => { fireKey('N', { shiftKey: true }); });
      expect(opts.itemActions.onNewFolder).toHaveBeenCalledOnce();
    });

    it('does not call onNewFolder when N is pressed without shift', () => {
      renderHook(() => useKeyboardNav(opts));
      // lowercase 'n' without shift — should trigger onNewPassword, not onNewFolder
      act(() => { fireKey('n'); });
      expect(opts.itemActions.onNewFolder).not.toHaveBeenCalled();
    });

    it('does not call onNewFolder when Cmd+Shift+N is pressed', () => {
      renderHook(() => useKeyboardNav(opts));
      act(() => { fireKey('N', { shiftKey: true, metaKey: true }); });
      expect(opts.itemActions.onNewFolder).not.toHaveBeenCalled();
    });
  });

  // ── Delete ────────────────────────────────────────────────────────────────────

  describe('Delete', () => {
    it('Delete calls onDelete with selectedIndex when selectedIndex >= 0', () => {
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: 1 }));
      act(() => { fireKey('Delete'); });
      expect(opts.itemActions.onDelete).toHaveBeenCalledWith(1);
    });

    it('Delete does nothing when selectedIndex is -1', () => {
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: -1 }));
      act(() => { fireKey('Delete'); });
      expect(opts.itemActions.onDelete).not.toHaveBeenCalled();
    });

    it('Backspace does NOT call onDelete (removed as accidental trigger)', () => {
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: 1 }));
      act(() => { fireKey('Backspace'); });
      expect(opts.itemActions.onDelete).not.toHaveBeenCalled();
    });
  });

  // ── x (toggle selection mode) ────────────────────────────────────────────────

  describe('x key (toggle selection mode)', () => {
    it('calls onToggleSelectionMode when x is pressed with no modifiers', () => {
      renderHook(() => useKeyboardNav(opts));
      act(() => { fireKey('x'); });
      expect(opts.onToggleSelectionMode).toHaveBeenCalledOnce();
    });

    it('does NOT call onToggleSelectionMode when Cmd+x is pressed', () => {
      renderHook(() => useKeyboardNav(opts));
      act(() => { fireKey('x', { metaKey: true }); });
      expect(opts.onToggleSelectionMode).not.toHaveBeenCalled();
    });
  });

  // ── Space (toggle item selection) ────────────────────────────────────────────

  describe('Space key (toggle item selection)', () => {
    it('calls onToggleItemSelection with selectedIndex when isSelectionMode is true and selectedIndex >= 0', () => {
      renderHook(() => useKeyboardNav({ ...opts, isSelectionMode: true, selectedIndex: 2 }));
      act(() => { fireKey(' '); });
      expect(opts.itemActions.onToggleItemSelection).toHaveBeenCalledWith(2);
    });

    it('does NOT call onToggleItemSelection when isSelectionMode is false', () => {
      renderHook(() => useKeyboardNav({ ...opts, isSelectionMode: false, selectedIndex: 1 }));
      act(() => { fireKey(' '); });
      expect(opts.itemActions.onToggleItemSelection).not.toHaveBeenCalled();
    });

    it('does NOT call onToggleItemSelection when selectedIndex is -1', () => {
      renderHook(() => useKeyboardNav({ ...opts, isSelectionMode: true, selectedIndex: -1 }));
      act(() => { fireKey(' '); });
      expect(opts.itemActions.onToggleItemSelection).not.toHaveBeenCalled();
    });
  });

  // ── / and Cmd+K ──────────────────────────────────────────────────────────────

  it('/ calls onFocusSearch', () => {
    renderHook(() => useKeyboardNav(opts));
    act(() => { fireKey('/'); });
    expect(opts.onFocusSearch).toHaveBeenCalledOnce();
  });

  it('Cmd+K calls onFocusSearch', () => {
    renderHook(() => useKeyboardNav(opts));
    act(() => { fireKey('k', { metaKey: true }); });
    expect(opts.onFocusSearch).toHaveBeenCalledOnce();
  });

  // ── Escape ───────────────────────────────────────────────────────────────────

  describe('Escape', () => {
    it('calls onClearSearch when search input has a non-empty value', () => {
      opts.searchInput.value = 'hello';
      renderHook(() => useKeyboardNav(opts));
      act(() => { fireKey('Escape'); });
      expect(opts.onClearSearch).toHaveBeenCalledOnce();
      expect(opts.onFocusSearch).not.toHaveBeenCalled();
    });

    it('calls onSelectIndex(-1) when search is empty and selectedIndex >= 0', () => {
      opts.searchInput.value = '';
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: 1 }));
      act(() => { fireKey('Escape'); });
      expect(opts.onSelectIndex).toHaveBeenCalledWith(-1);
      expect(opts.onClearSearch).not.toHaveBeenCalled();
    });

    it('does not call onFocusSearch when Escape is pressed', () => {
      opts.searchInput.value = '';
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: -1 }));
      act(() => { fireKey('Escape'); });
      expect(opts.onFocusSearch).not.toHaveBeenCalled();
    });

    it('does not call onSelectIndex when both conditions are false', () => {
      opts.searchInput.value = '';
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: -1 }));
      act(() => { fireKey('Escape'); });
      expect(opts.onSelectIndex).not.toHaveBeenCalled();
      expect(opts.onClearSearch).not.toHaveBeenCalled();
    });
  });

  // ── Guard: HTMLButtonElement target ──────────────────────────────────────────

  describe('guard: HTMLButtonElement target', () => {
    it('does not fire ArrowDown when target is a button', () => {
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: 0, itemCount: 3 }));
      const button = document.createElement('button');
      act(() => { fireKey('ArrowDown', { target: button }); });
      expect(opts.onSelectIndex).not.toHaveBeenCalled();
    });

    it('does not fire Enter when target is a button', () => {
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: 1 }));
      const button = document.createElement('button');
      act(() => { fireKey('Enter', { target: button }); });
      expect(opts.itemActions.onEnter).not.toHaveBeenCalled();
    });

    it('does not fire c/copy when target is a button', () => {
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: 1 }));
      const button = document.createElement('button');
      act(() => { fireKey('c', { target: button }); });
      expect(opts.itemActions.onCopy).not.toHaveBeenCalled();
    });
  });

  // ── Guard: non-search HTMLInputElement target ─────────────────────────────────

  describe('guard: non-search HTMLInputElement target', () => {
    it('does not fire ArrowDown when target is a different input', () => {
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: 0, itemCount: 3 }));
      const otherInput = document.createElement('input');
      // Ensure it is a different element from the searchInput
      act(() => { fireKey('ArrowDown', { target: otherInput }); });
      expect(opts.onSelectIndex).not.toHaveBeenCalled();
    });

    it('does not fire Enter when target is a different input', () => {
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: 1 }));
      const otherInput = document.createElement('input');
      act(() => { fireKey('Enter', { target: otherInput }); });
      expect(opts.itemActions.onEnter).not.toHaveBeenCalled();
    });

    it('does not fire / when target is a different input', () => {
      renderHook(() => useKeyboardNav(opts));
      const otherInput = document.createElement('input');
      act(() => { fireKey('/', { target: otherInput }); });
      expect(opts.onFocusSearch).not.toHaveBeenCalled();
    });
  });

  // ── ArrowDown from search input ───────────────────────────────────────────────

  describe('ArrowDown from search input', () => {
    it('calls onSelectIndex(0) when the event target is the search input', () => {
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: -1, itemCount: 3 }));
      act(() => { fireKey('ArrowDown', { target: opts.searchInput }); });
      expect(opts.onSelectIndex).toHaveBeenCalledWith(0);
    });

    it('does not call onSelectIndex when itemCount is 0', () => {
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: -1, itemCount: 0 }));
      act(() => { fireKey('ArrowDown', { target: opts.searchInput }); });
      expect(opts.onSelectIndex).not.toHaveBeenCalled();
    });

    it('does not call other handlers (e.g. onFocusSearch) when ArrowDown from search input', () => {
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: -1, itemCount: 3 }));
      act(() => { fireKey('ArrowDown', { target: opts.searchInput }); });
      expect(opts.onFocusSearch).not.toHaveBeenCalled();
    });

    it('other keys from search input (e.g. Enter) are ignored', () => {
      renderHook(() => useKeyboardNav({ ...opts, selectedIndex: 1, itemCount: 3 }));
      act(() => { fireKey('Enter', { target: opts.searchInput }); });
      // The hook returns early after handling search-input ArrowDown; other keys → early return too
      expect(opts.itemActions.onEnter).not.toHaveBeenCalled();
    });
  });

  // ── Search input inside a container div ───────────────────────────────────────

  describe('searchInputRef pointing to a container div', () => {
    it('resolves inner input via querySelector and still routes ArrowDown correctly', () => {
      const container = document.createElement('div');
      const inner = document.createElement('input');
      container.appendChild(inner);
      const containerRef = { current: container } as React.RefObject<HTMLElement>;

      const containerOpts = {
        ...makeOptions(),
        searchInputRef: containerRef,
        // expose inner so we can target it
      };

      renderHook(() => useKeyboardNav({ ...containerOpts, selectedIndex: -1, itemCount: 3 }));
      act(() => { fireKey('ArrowDown', { target: inner }); });
      expect(containerOpts.onSelectIndex).toHaveBeenCalledWith(0);
    });
  });

  // ── Cleanup ───────────────────────────────────────────────────────────────────

  it('removes the event listener on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => useKeyboardNav(opts));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeSpy.mockRestore();
  });
});
