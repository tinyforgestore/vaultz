import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/plugin-clipboard-manager');

import { invoke } from '@tauri-apps/api/core';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { useClipboard } from './useClipboard';
import { CLIPBOARD_CLEAR_DELAY_MS, CLIPBOARD_FEEDBACK_MS, CLIPBOARD_TOAST_MS } from '@/constants/clipboard';

const mockInvoke = vi.mocked(invoke);
const mockWriteText = vi.mocked(writeText);

describe('useClipboard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockInvoke.mockResolvedValue(undefined);
    mockWriteText.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initial state is empty', () => {
    const { result } = renderHook(() => useClipboard());
    expect(result.current.copiedId).toBeNull();
    expect(result.current.clipboardToast).toBeNull();
  });

  it('sets copiedId and clipboardToast on copy', () => {
    const { result } = renderHook(() => useClipboard());
    act(() => result.current.handleCopyPassword('pw1', 'secret'));
    expect(result.current.copiedId).toBe('pw1');
    expect(result.current.clipboardToast).toContain('Copied');
    expect(mockInvoke).toHaveBeenCalledWith('write_secret_to_clipboard', { text: 'secret' });
  });

  it('clears copiedId after CLIPBOARD_FEEDBACK_MS', () => {
    const { result } = renderHook(() => useClipboard());
    act(() => result.current.handleCopyPassword('pw1', 'secret'));
    expect(result.current.copiedId).toBe('pw1');
    act(() => vi.advanceTimersByTime(CLIPBOARD_FEEDBACK_MS));
    expect(result.current.copiedId).toBeNull();
  });

  it('clears toast after CLIPBOARD_TOAST_MS', () => {
    const { result } = renderHook(() => useClipboard());
    act(() => result.current.handleCopyPassword('pw1', 'secret'));
    act(() => vi.advanceTimersByTime(CLIPBOARD_TOAST_MS));
    expect(result.current.clipboardToast).toBeNull();
  });

  it('calls writeText and shows cleared toast after CLIPBOARD_CLEAR_DELAY_MS', () => {
    const { result } = renderHook(() => useClipboard());
    act(() => result.current.handleCopyPassword('pw1', 'secret'));
    act(() => vi.advanceTimersByTime(CLIPBOARD_CLEAR_DELAY_MS));
    expect(mockWriteText).toHaveBeenCalledWith('');
    expect(result.current.clipboardToast).toBe('Clipboard cleared');
  });

  it('cleared toast disappears after CLIPBOARD_FEEDBACK_MS', () => {
    const { result } = renderHook(() => useClipboard());
    act(() => result.current.handleCopyPassword('pw1', 'secret'));
    act(() => vi.advanceTimersByTime(CLIPBOARD_CLEAR_DELAY_MS + CLIPBOARD_FEEDBACK_MS));
    expect(result.current.clipboardToast).toBeNull();
  });

  it('resets all timers when copying again before expiry', () => {
    const { result } = renderHook(() => useClipboard());
    act(() => result.current.handleCopyPassword('pw1', 'secret1'));
    act(() => vi.advanceTimersByTime(CLIPBOARD_FEEDBACK_MS / 2));
    act(() => result.current.handleCopyPassword('pw2', 'secret2'));
    // copiedId should now be pw2
    expect(result.current.copiedId).toBe('pw2');
    // Advancing by original feedback interval should not clear (timer was reset)
    act(() => vi.advanceTimersByTime(CLIPBOARD_FEEDBACK_MS / 2));
    expect(result.current.copiedId).toBe('pw2');
    // Full interval from second copy clears it
    act(() => vi.advanceTimersByTime(CLIPBOARD_FEEDBACK_MS / 2));
    expect(result.current.copiedId).toBeNull();
  });

  it('cleans up timers on unmount', () => {
    const { result, unmount } = renderHook(() => useClipboard());
    act(() => result.current.handleCopyPassword('pw1', 'secret'));
    unmount();
    // No state-update warnings after unmount
    act(() => vi.runAllTimers());
  });
});
