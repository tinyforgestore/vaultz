import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({ hide: vi.fn().mockResolvedValue(undefined) }),
}));

import { invoke } from '@tauri-apps/api/core';
import { useOverlayGenerator } from './useOverlayGenerator';

const mockInvoke = vi.mocked(invoke);

describe('useOverlayGenerator', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('starts unlocked when authenticated', async () => {
    mockInvoke.mockResolvedValue(true);
    const { result } = renderHook(() => useOverlayGenerator());
    await waitFor(() => expect(result.current.isLocked).toBe(false));
  });

  it('marks locked when not authenticated', async () => {
    mockInvoke.mockResolvedValue(false);
    const { result } = renderHook(() => useOverlayGenerator());
    await waitFor(() => expect(result.current.isLocked).toBe(true));
  });

  it('copyToClipboard invokes write_secret_to_clipboard then hides', async () => {
    mockInvoke.mockResolvedValue(undefined);
    const { result } = renderHook(() => useOverlayGenerator());
    await act(async () => {
      result.current.copyToClipboard('mypass');
      await new Promise((r) => setTimeout(r, 250));
    });
    expect(mockInvoke).toHaveBeenCalledWith('write_secret_to_clipboard', { text: 'mypass' });
    expect(mockInvoke).toHaveBeenCalledWith('hide_overlay_generator');
  });

  it('hideOverlay invokes hide command', () => {
    mockInvoke.mockResolvedValue(undefined);
    const { result } = renderHook(() => useOverlayGenerator());
    act(() => result.current.hideOverlay());
    expect(mockInvoke).toHaveBeenCalledWith('hide_overlay_generator');
  });

  it('window keydown Escape calls hide_overlay_generator', () => {
    mockInvoke.mockResolvedValue(undefined);
    renderHook(() => useOverlayGenerator());
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(mockInvoke).toHaveBeenCalledWith('hide_overlay_generator');
  });

  it('saveAsEntry is a no-op stub for PM-024', () => {
    mockInvoke.mockResolvedValue(undefined);
    const { result } = renderHook(() => useOverlayGenerator());
    expect(() => act(() => result.current.saveAsEntry())).not.toThrow();
  });
});
