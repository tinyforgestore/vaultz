import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFaviconPicker } from './useFaviconPicker';

describe('useFaviconPicker', () => {
  describe('initialization', () => {
    it('starts with no override in create mode (no initial favicon)', () => {
      const { result } = renderHook(() => useFaviconPicker('', null, false));
      expect(result.current.favicon).toBeNull();
      expect(result.current.manualOverride).toBe(false);
    });

    it('treats initial favicon slug as manual override in edit mode', () => {
      const { result } = renderHook(() => useFaviconPicker('https://github.com', 'figma', true));
      expect(result.current.favicon).toBe('figma');
      expect(result.current.manualOverride).toBe(true);
    });

    it('treats null initial favicon ("None") as manual override in edit mode', () => {
      const { result } = renderHook(() => useFaviconPicker('https://github.com', null, true));
      expect(result.current.favicon).toBeNull();
      expect(result.current.manualOverride).toBe(true);
    });

    it('iconPickerOpen and iconFilter start in default state', () => {
      const { result } = renderHook(() => useFaviconPicker('', null, false));
      expect(result.current.iconPickerOpen).toBe(false);
      expect(result.current.iconFilter).toBe('');
    });
  });

  describe('auto-derive on url change', () => {
    it('derives favicon slug when url changes (create mode)', () => {
      const { result, rerender } = renderHook(
        ({ url }) => useFaviconPicker(url, null, false),
        { initialProps: { url: '' } }
      );
      rerender({ url: 'https://github.com' });
      expect(result.current.favicon).toBe('github');
      expect(result.current.manualOverride).toBe(false);
    });

    it('clears favicon when url is cleared', () => {
      const { result, rerender } = renderHook(
        ({ url }) => useFaviconPicker(url, null, false),
        { initialProps: { url: 'https://github.com' } }
      );
      expect(result.current.favicon).toBe('github');
      rerender({ url: '' });
      expect(result.current.favicon).toBeNull();
    });

    it('does NOT auto-derive when manualOverride is set (edit mode "None")', () => {
      const { result, rerender } = renderHook(
        ({ url }) => useFaviconPicker(url, null, true),
        { initialProps: { url: 'https://github.com' } }
      );
      expect(result.current.favicon).toBeNull();
      rerender({ url: 'https://google.com' });
      expect(result.current.favicon).toBeNull();
    });
  });

  describe('selectFavicon', () => {
    it('sets favicon and flips manualOverride to true', () => {
      const { result } = renderHook(() => useFaviconPicker('https://github.com', null, false));
      act(() => result.current.selectFavicon('figma'));
      expect(result.current.favicon).toBe('figma');
      expect(result.current.manualOverride).toBe(true);
    });

    it('selectFavicon(null) sets None and marks override', () => {
      const { result } = renderHook(() => useFaviconPicker('https://github.com', null, false));
      act(() => result.current.selectFavicon(null));
      expect(result.current.favicon).toBeNull();
      expect(result.current.manualOverride).toBe(true);
    });

    it('blocks URL auto-derivation after override', () => {
      const { result, rerender } = renderHook(
        ({ url }) => useFaviconPicker(url, null, false),
        { initialProps: { url: 'https://github.com' } }
      );
      act(() => result.current.selectFavicon('figma'));
      rerender({ url: 'https://google.com' });
      expect(result.current.favicon).toBe('figma');
    });
  });

  describe('resetFaviconToAuto', () => {
    it('clears manualOverride and re-derives from current url', () => {
      const { result } = renderHook(() => useFaviconPicker('https://github.com', 'figma', true));
      expect(result.current.favicon).toBe('figma');
      act(() => result.current.resetFaviconToAuto());
      expect(result.current.manualOverride).toBe(false);
      expect(result.current.favicon).toBe('github');
    });
  });

  describe('iconChipText', () => {
    it('"No icon" when no favicon and no override', () => {
      const { result } = renderHook(() => useFaviconPicker('', null, false));
      expect(result.current.iconChipText).toBe('No icon');
    });

    it('"Custom: none" when null but overridden', () => {
      const { result } = renderHook(() => useFaviconPicker('', null, true));
      expect(result.current.iconChipText).toBe('Custom: none');
    });

    it('"Auto: <slug>" when derived from URL', () => {
      const { result, rerender } = renderHook(
        ({ url }) => useFaviconPicker(url, null, false),
        { initialProps: { url: '' } }
      );
      rerender({ url: 'https://github.com' });
      expect(result.current.iconChipText).toBe('Auto: github');
    });

    it('"Custom: <slug>" when explicitly chosen', () => {
      const { result } = renderHook(() => useFaviconPicker('', null, false));
      act(() => result.current.selectFavicon('figma'));
      expect(result.current.iconChipText).toBe('Custom: figma');
    });
  });

  describe('iconChipSubtext', () => {
    it('"Auto-detected" when derived from URL', () => {
      const { result, rerender } = renderHook(
        ({ url }) => useFaviconPicker(url, null, false),
        { initialProps: { url: '' } }
      );
      rerender({ url: 'https://github.com' });
      expect(result.current.iconChipSubtext).toBe('Auto-detected');
    });

    it('"Auto-detected" when derived from service name fallback', () => {
      const { result } = renderHook(() => useFaviconPicker('', null, false, 'GitHub'));
      expect(result.current.favicon).toBe('github');
      expect(result.current.iconChipSubtext).toBe('Auto-detected');
    });

    it('"Manually selected" when explicitly chosen', () => {
      const { result } = renderHook(() => useFaviconPicker('', null, false));
      act(() => result.current.selectFavicon('figma'));
      expect(result.current.iconChipSubtext).toBe('Manually selected');
    });

    it('"No icon will be displayed" when null + override', () => {
      const { result } = renderHook(() => useFaviconPicker('', null, true));
      expect(result.current.iconChipSubtext).toBe('No icon will be displayed');
    });

    it('"No match for URL or name" when null + no override', () => {
      const { result } = renderHook(() => useFaviconPicker('', null, false));
      expect(result.current.iconChipSubtext).toBe('No match for URL or name');
    });
  });

  describe('picker pending state', () => {
    it('openPicker seeds pending from current selection', () => {
      const { result } = renderHook(() => useFaviconPicker('', 'github', true));
      act(() => result.current.openPicker());
      expect(result.current.iconPickerOpen).toBe(true);
      expect(result.current.pendingFavicon).toBe('github');
      expect(result.current.pendingTab).toBe('popular');
    });

    it('openPicker uses "auto" tab when not overridden', () => {
      const { result } = renderHook(() => useFaviconPicker('', null, false));
      act(() => result.current.openPicker());
      expect(result.current.pendingTab).toBe('auto');
    });

    it('openPicker uses "none" tab when null + overridden', () => {
      const { result } = renderHook(() => useFaviconPicker('', null, true));
      act(() => result.current.openPicker());
      expect(result.current.pendingTab).toBe('none');
    });

    it('cancelPicker closes without committing pending changes', () => {
      const { result } = renderHook(() => useFaviconPicker('', 'github', true));
      act(() => result.current.openPicker());
      act(() => result.current.previewSlug('figma'));
      act(() => result.current.cancelPicker());
      expect(result.current.iconPickerOpen).toBe(false);
      expect(result.current.favicon).toBe('github');
    });

    it('applyPicker commits pendingFavicon when on popular tab', () => {
      const { result } = renderHook(() => useFaviconPicker('', 'github', true));
      act(() => result.current.openPicker());
      act(() => result.current.previewSlug('figma'));
      act(() => result.current.applyPicker());
      expect(result.current.favicon).toBe('figma');
      expect(result.current.iconPickerOpen).toBe(false);
    });

    it('applyPicker on "none" tab clears favicon', () => {
      const { result } = renderHook(() => useFaviconPicker('', 'github', true));
      act(() => result.current.openPicker());
      act(() => result.current.selectTab('none'));
      act(() => result.current.applyPicker());
      expect(result.current.favicon).toBe(null);
      expect(result.current.manualOverride).toBe(true);
    });

    it('applyPicker on "auto" tab resets to auto', () => {
      const { result, rerender } = renderHook(
        ({ url }) => useFaviconPicker(url, 'figma', true),
        { initialProps: { url: 'https://github.com' } }
      );
      rerender({ url: 'https://github.com' });
      act(() => result.current.openPicker());
      act(() => result.current.selectTab('auto'));
      act(() => result.current.applyPicker());
      expect(result.current.favicon).toBe('github');
      expect(result.current.manualOverride).toBe(false);
    });

    it('applyPicker on "auto" tab with no curated suggestion is a no-op (C1)', () => {
      // URL with a non-curated slug: derives "mycompany" but ICON_MAP has no entry.
      const { result } = renderHook(() =>
        useFaviconPicker('https://mycompany.example.test', 'figma', true)
      );
      // Initial state: edit-mode override keeps favicon='figma'.
      expect(result.current.favicon).toBe('figma');
      act(() => result.current.openPicker());
      act(() => result.current.selectTab('auto'));
      // autoSuggestion is null because the derived slug is not curated.
      expect(result.current.autoSuggestion).toBeNull();
      act(() => result.current.applyPicker());
      // Apply did NOT commit a non-curated slug — favicon stays 'figma'.
      expect(result.current.favicon).toBe('figma');
      expect(result.current.iconPickerOpen).toBe(false);
    });
  });

  describe('autoSuggestion', () => {
    it('null when no URL or service name', () => {
      const { result } = renderHook(() => useFaviconPicker('', null, false));
      expect(result.current.autoSuggestion).toBeNull();
    });

    it('null when slug derives but is not in curated set', () => {
      const { result } = renderHook(() =>
        useFaviconPicker('https://mycompany.example.test', null, false)
      );
      expect(result.current.autoSuggestion).toBeNull();
    });

    it('returns curated icon when URL maps to a known slug', () => {
      const { result } = renderHook(() =>
        useFaviconPicker('https://github.com', null, false)
      );
      expect(result.current.autoSuggestion?.slug).toBe('github');
    });
  });

  describe('selectTab', () => {
    it('clears iconFilter when switching to none/auto', () => {
      const { result } = renderHook(() => useFaviconPicker('', null, false));
      act(() => result.current.setFilterAndAutoSwitch('git'));
      expect(result.current.iconFilter).toBe('git');
      expect(result.current.pendingTab).toBe('popular');
      act(() => result.current.selectTab('auto'));
      expect(result.current.pendingTab).toBe('auto');
      expect(result.current.iconFilter).toBe('');
    });

    it('preserves filter when switching to popular', () => {
      const { result } = renderHook(() => useFaviconPicker('', null, false));
      act(() => result.current.setFilterAndAutoSwitch('git'));
      act(() => result.current.selectTab('popular'));
      expect(result.current.iconFilter).toBe('git');
    });
  });

  describe('setFilterAndAutoSwitch', () => {
    it('switches tab to popular when typing a non-empty filter', () => {
      const { result } = renderHook(() => useFaviconPicker('', null, false));
      // tab starts as 'auto' here
      act(() => result.current.openPicker());
      act(() => result.current.setFilterAndAutoSwitch('git'));
      expect(result.current.pendingTab).toBe('popular');
      expect(result.current.iconFilter).toBe('git');
    });

    it('does not switch tab when clearing the filter', () => {
      const { result } = renderHook(() => useFaviconPicker('', 'github', true));
      act(() => result.current.openPicker());
      // pendingTab is 'popular' here.
      act(() => result.current.selectTab('auto'));
      act(() => result.current.setFilterAndAutoSwitch(''));
      expect(result.current.pendingTab).toBe('auto');
    });
  });

  describe('filteredSlugs', () => {
    it('returns all slugs when filter is empty', () => {
      const { result } = renderHook(() => useFaviconPicker('', null, false));
      expect(result.current.filteredSlugs.length).toBeGreaterThan(0);
    });

    it('filters slugs by case-insensitive substring', () => {
      const { result } = renderHook(() => useFaviconPicker('', null, false));
      act(() => result.current.setFilterAndAutoSwitch('GITHUB'));
      expect(result.current.filteredSlugs.every((s) => s.includes('github'))).toBe(true);
      expect(result.current.filteredSlugs).toContain('github');
    });
  });

  describe('iconPickerOpen setter', () => {
    it('toggles iconPickerOpen', () => {
      const { result } = renderHook(() => useFaviconPicker('', null, false));
      act(() => result.current.setIconPickerOpen(true));
      expect(result.current.iconPickerOpen).toBe(true);
    });
  });
});
