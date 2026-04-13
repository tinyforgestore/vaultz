import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';

vi.mock('@tauri-apps/plugin-deep-link', () => ({
  getCurrent: vi.fn(),
  onOpenUrl: vi.fn(),
}));

import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { renderHookWithProviders } from '@/testUtils';
import { useDeepLink } from './useDeepLink';
import { activeModalAtom, pendingLicenseKeyAtom } from '@/store/atoms';

const mockGetCurrent = vi.mocked(getCurrent);
const mockOnOpenUrl = vi.mocked(onOpenUrl);

function setup() {
  mockGetCurrent.mockResolvedValue(null);
  mockOnOpenUrl.mockResolvedValue(vi.fn());
  return renderHookWithProviders(() => useDeepLink());
}

describe('useDeepLink', () => {
  beforeEach(() => {
    mockGetCurrent.mockReset();
    mockOnOpenUrl.mockReset();
  });

  it('does nothing when getCurrent returns null', async () => {
    const { store } = setup();
    await act(async () => {});
    expect(store.get(activeModalAtom)).toBeNull();
    expect(store.get(pendingLicenseKeyAtom)).toBeNull();
  });

  it('activates license modal on valid cold-launch deep link', async () => {
    mockGetCurrent.mockResolvedValue(['vaultz://activate?license_key=ABCD-1234'] as any);
    mockOnOpenUrl.mockResolvedValue(vi.fn());
    const { store } = renderHookWithProviders(() => useDeepLink());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(store.get(pendingLicenseKeyAtom)).toBe('ABCD-1234');
    expect(store.get(activeModalAtom)).toBe('activate');
  });

  it('ignores deep links with an incorrect path', async () => {
    mockGetCurrent.mockResolvedValue(['vaultz://unknown?license_key=ABCD-1234'] as any);
    mockOnOpenUrl.mockResolvedValue(vi.fn());
    const { store } = renderHookWithProviders(() => useDeepLink());
    await act(async () => {});
    expect(store.get(activeModalAtom)).toBeNull();
  });

  it('ignores malformed URLs without throwing', async () => {
    mockGetCurrent.mockResolvedValue(['not-a-url'] as any);
    mockOnOpenUrl.mockResolvedValue(vi.fn());
    const { store } = renderHookWithProviders(() => useDeepLink());
    await act(async () => {});
    expect(store.get(activeModalAtom)).toBeNull();
  });

  it('calls the unlisten fn on unmount', async () => {
    const unlisten = vi.fn();
    mockGetCurrent.mockResolvedValue(null);
    mockOnOpenUrl.mockResolvedValue(unlisten);
    const { unmount } = renderHookWithProviders(() => useDeepLink());
    await act(async () => {});
    unmount();
    expect(unlisten).toHaveBeenCalled();
  });

  it('fires modal on warm-launch deep link via onOpenUrl callback', async () => {
    let warmCallback: ((urls: string[]) => void) | null = null;
    mockGetCurrent.mockResolvedValue(null);
    mockOnOpenUrl.mockImplementation((cb) => {
      warmCallback = cb;
      return Promise.resolve(vi.fn());
    });
    const { store } = renderHookWithProviders(() => useDeepLink());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    await act(async () => {
      warmCallback!(['vaultz://activate?license_key=WARM-5678']);
    });
    expect(store.get(pendingLicenseKeyAtom)).toBe('WARM-5678');
    expect(store.get(activeModalAtom)).toBe('activate');
  });
});
