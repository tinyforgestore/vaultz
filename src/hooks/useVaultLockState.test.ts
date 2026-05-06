import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('@tauri-apps/api/core');
const listenMock = vi.fn();
vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args: unknown[]) => listenMock(...args),
}));
const hideMock = vi.fn();
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({ hide: hideMock }),
}));

import { invoke } from '@tauri-apps/api/core';
import { useVaultLockState } from './useVaultLockState';

const mockInvoke = vi.mocked(invoke);

type Handler = (event: unknown) => void;

describe('useVaultLockState', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    listenMock.mockReset();
    hideMock.mockReset();
    hideMock.mockResolvedValue(undefined);
  });

  it('initially unlocked when authenticated', async () => {
    mockInvoke.mockResolvedValue(true);
    listenMock.mockResolvedValue(() => {});
    const { result } = renderHook(() => useVaultLockState());
    await waitFor(() => expect(result.current.isLocked).toBe(false));
  });

  it('initially locked when not authenticated', async () => {
    mockInvoke.mockResolvedValue(false);
    listenMock.mockResolvedValue(() => {});
    const { result } = renderHook(() => useVaultLockState());
    await waitFor(() => expect(result.current.isLocked).toBe(true));
  });

  it('initially locked on auth check error', async () => {
    mockInvoke.mockRejectedValue(new Error('boom'));
    listenMock.mockResolvedValue(() => {});
    const { result } = renderHook(() => useVaultLockState());
    await waitFor(() => expect(result.current.isLocked).toBe(true));
  });

  it('vault-locked event sets locked + hides current window', async () => {
    mockInvoke.mockResolvedValue(true);
    const handlers: Record<string, Handler> = {};
    listenMock.mockImplementation((event: string, handler: Handler) => {
      handlers[event] = handler;
      return Promise.resolve(() => {});
    });
    const { result } = renderHook(() => useVaultLockState());
    await waitFor(() => expect(handlers['vault-locked']).toBeDefined());
    await act(async () => {
      handlers['vault-locked']({});
    });
    expect(result.current.isLocked).toBe(true);
    expect(hideMock).toHaveBeenCalled();
  });

  it('vault-unlocked event clears locked', async () => {
    mockInvoke.mockResolvedValue(false);
    const handlers: Record<string, Handler> = {};
    listenMock.mockImplementation((event: string, handler: Handler) => {
      handlers[event] = handler;
      return Promise.resolve(() => {});
    });
    const { result } = renderHook(() => useVaultLockState());
    await waitFor(() => expect(handlers['vault-unlocked']).toBeDefined());
    await act(async () => {
      handlers['vault-unlocked']({});
    });
    await waitFor(() => expect(result.current.isLocked).toBe(false));
  });

  it('registers listeners only once on mount', async () => {
    mockInvoke.mockResolvedValue(true);
    listenMock.mockResolvedValue(() => {});
    const { rerender } = renderHook(() => useVaultLockState());
    await waitFor(() => expect(listenMock).toHaveBeenCalled());
    const callsAfterMount = listenMock.mock.calls.length;
    rerender();
    rerender();
    expect(listenMock.mock.calls.length).toBe(callsAfterMount);
  });
});
