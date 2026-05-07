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

  it('copyToClipboard does NOT call record_generated_password (single source is PasswordGenerator.onRecordGenerated)', async () => {
    mockInvoke.mockResolvedValue(undefined);
    const { result } = renderHook(() => useOverlayGenerator());
    await act(async () => {
      result.current.copyToClipboard('mypass');
      await new Promise((r) => setTimeout(r, 250));
    });
    expect(mockInvoke).not.toHaveBeenCalledWith('record_generated_password', expect.anything());
  });

  it('recordGenerated invokes record_generated_password with the password', () => {
    mockInvoke.mockResolvedValue(undefined);
    const { result } = renderHook(() => useOverlayGenerator());
    act(() => result.current.recordGenerated('hunter2'));
    expect(mockInvoke).toHaveBeenCalledWith('record_generated_password', { password: 'hunter2' });
  });

  it('recordGenerated is a no-op for empty input', () => {
    mockInvoke.mockResolvedValue(undefined);
    const { result } = renderHook(() => useOverlayGenerator());
    act(() => result.current.recordGenerated(''));
    expect(mockInvoke).not.toHaveBeenCalledWith('record_generated_password', expect.anything());
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

  it('saveAsEntry is a no-op when no generated password has been seen', () => {
    mockInvoke.mockResolvedValue(undefined);
    const { result } = renderHook(() => useOverlayGenerator());
    act(() => result.current.saveAsEntry());
    expect(mockInvoke).not.toHaveBeenCalledWith(
      'open_create_entry_prefilled',
      expect.anything(),
    );
  });

  it('saveAsEntry forwards the latest generated password to open_create_entry_prefilled', () => {
    mockInvoke.mockResolvedValue(undefined);
    const { result } = renderHook(() => useOverlayGenerator());
    act(() => result.current.handleGeneratedChange('Tr0ub4dor&3'));
    act(() => result.current.saveAsEntry());
    expect(mockInvoke).toHaveBeenCalledWith('open_create_entry_prefilled', {
      password: 'Tr0ub4dor&3',
    });
  });
});
