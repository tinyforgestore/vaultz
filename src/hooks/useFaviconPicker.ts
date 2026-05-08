import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  slugFromUrl,
  slugFromText,
  listAvailableSlugs,
  lookupIcon,
  type FaviconIcon,
} from '@/utils/faviconLookup';

export type PickerTab = 'auto' | 'popular' | 'none';

/** Single source of empty-state copy used by both the chip subtext and the picker grid. */
export const AUTO_EMPTY_MESSAGE = 'Add a URL or service name we recognise';
export const NONE_MESSAGE = 'No icon will be displayed';
export const NO_MATCH_MESSAGE = 'No match for URL or name';

/**
 * The auto-detect chain: URL parses first; falls back to a sluggified service
 * name so an entry called "GitHub" with no URL still picks up the brand icon.
 */
function deriveAutoSlug(url: string, serviceName: string): string | null {
  return slugFromUrl(url) ?? slugFromText(serviceName);
}

/**
 * Owns favicon state and the icon-picker UI for the create/edit modal.
 *
 * `favicon` is the slug stored on the entry. `manualOverride` flags that
 * the user has explicitly chosen an icon, so URL changes should NOT
 * overwrite the slug.
 *
 * In edit mode, the previously saved value — slug OR `null` ("None") — is
 * treated as a manual choice. Without this guard the URL→slug effect would
 * clobber an explicit "None" on every modal re-open. In create mode the
 * override starts off, so typing a URL still auto-derives a slug.
 */
export function useFaviconPicker(
  url: string,
  initialFavicon: string | null | undefined,
  isEditMode: boolean,
  serviceName: string = ''
) {
  // ----- state values -----
  const [favicon, setFavicon] = useState<string | null>(initialFavicon ?? null);
  const [manualOverride, setManualOverride] = useState<boolean>(isEditMode);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconFilter, setIconFilter] = useState('');

  // Pending picker state — staged while the popover is open, committed only on
  // Apply. Lets the user preview multiple choices and back out via Cancel.
  const [pendingTab, setPendingTab] = useState<PickerTab>('auto');
  const [pendingFavicon, setPendingFavicon] = useState<string | null>(null);

  // ----- effects -----
  // Auto-detect favicon from URL or service name whenever they change — but
  // only if the user hasn't manually overridden the choice.
  useEffect(() => {
    if (manualOverride) return;
    const derived = deriveAutoSlug(url, serviceName);
    setFavicon((prev) => (prev === derived ? prev : derived));
  }, [url, serviceName, manualOverride]);

  // ----- derived values -----
  const allSlugs = useMemo(() => listAvailableSlugs(), []);
  const filteredSlugs = useMemo(() => {
    const q = iconFilter.trim().toLowerCase();
    if (!q) return allSlugs;
    return allSlugs.filter((s) => s.includes(q));
  }, [allSlugs, iconFilter]);

  /**
   * The icon currently suggested by the Auto tab (URL/serviceName → curated slug).
   * Null when no slug derives, OR the derived slug isn't in the curated icon set
   * (e.g. `mycompany.com` → `mycompany`). In that case the Auto tab shows the
   * empty message and Apply is a no-op (see `applyPicker`).
   */
  const autoSuggestion = useMemo<FaviconIcon | null>(() => {
    const slug = deriveAutoSlug(url, serviceName);
    if (!slug) return null;
    return lookupIcon(slug);
  }, [url, serviceName]);

  const iconChipText = useMemo(() => {
    if (favicon === null) return manualOverride ? 'Custom: none' : 'No icon';
    return manualOverride ? `Custom: ${favicon}` : `Auto: ${favicon}`;
  }, [favicon, manualOverride]);

  const iconChipSubtext = useMemo(() => {
    if (favicon === null) return manualOverride ? NONE_MESSAGE : NO_MATCH_MESSAGE;
    return manualOverride ? 'Manually selected' : 'Auto-detected';
  }, [favicon, manualOverride]);

  // ----- semantic actions -----
  const selectFavicon = useCallback((slug: string | null) => {
    setManualOverride(true);
    setFavicon(slug);
  }, []);

  const resetFaviconToAuto = useCallback(() => {
    setManualOverride(false);
    setFavicon(deriveAutoSlug(url, serviceName));
  }, [url, serviceName]);

  const openPicker = useCallback(() => {
    // Seed pending state from current selection so Cancel is a no-op.
    setPendingFavicon(favicon);
    setPendingTab(!manualOverride ? 'auto' : favicon === null ? 'none' : 'popular');
    setIconFilter('');
    setIconPickerOpen(true);
  }, [favicon, manualOverride]);

  /**
   * Closes the popover only — does NOT revert pending state. Radix's
   * `onOpenChange` fires AFTER our explicit Apply click, so reverting here
   * would clobber a successful apply. The pending state is overwritten on
   * the next `openPicker` anyway, so leaving it stale is harmless.
   */
  const cancelPicker = useCallback(() => {
    setIconPickerOpen(false);
  }, []);

  const applyPicker = useCallback(() => {
    if (pendingTab === 'auto') {
      // No-op when the auto tab has nothing to apply (no URL/serviceName, or
      // the derived slug isn't in the curated set). Falling through to
      // resetFaviconToAuto would commit a non-curated slug that renders as
      // initials — surprising for the user who saw "we don't recognise this".
      if (autoSuggestion != null) {
        resetFaviconToAuto();
      }
    } else if (pendingTab === 'none') {
      selectFavicon(null);
    } else {
      selectFavicon(pendingFavicon);
    }
    setIconPickerOpen(false);
  }, [pendingTab, pendingFavicon, autoSuggestion, resetFaviconToAuto, selectFavicon]);

  /** Preview a slug in the picker grid (does NOT commit until Apply). */
  const previewSlug = useCallback((slug: string) => {
    setPendingFavicon(slug);
  }, []);

  /**
   * Switch the picker tab. Clears the search filter when switching to
   * Auto/None — the filter applies only to the Popular grid.
   */
  const selectTab = useCallback((tab: PickerTab) => {
    setPendingTab(tab);
    if (tab !== 'popular') {
      setIconFilter('');
    }
  }, []);

  /**
   * Combined filter setter: typing into the search box implies the user
   * wants to scan the full curated set, so any non-empty filter snaps the
   * tab to Popular. Empty filter leaves the tab unchanged.
   */
  const setFilterAndAutoSwitch = useCallback((value: string) => {
    setIconFilter(value);
    if (value) {
      setPendingTab((prev) => (prev === 'popular' ? prev : 'popular'));
    }
  }, []);

  return {
    // ----- state values -----
    favicon,
    manualOverride,
    iconPickerOpen,
    iconFilter,
    pendingTab,
    pendingFavicon,
    // ----- setters (raw open/close needed by Popover.Root) -----
    setIconPickerOpen,
    // ----- semantic actions -----
    selectFavicon,
    resetFaviconToAuto,
    openPicker,
    cancelPicker,
    applyPicker,
    previewSlug,
    selectTab,
    setFilterAndAutoSwitch,
    // ----- derived values -----
    filteredSlugs,
    autoSuggestion,
    iconChipText,
    iconChipSubtext,
    // ----- copy / strings -----
    autoEmptyMessage: AUTO_EMPTY_MESSAGE,
    noneMessage: NONE_MESSAGE,
  };
}
