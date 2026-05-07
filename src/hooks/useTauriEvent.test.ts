import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

interface Subscription<T> {
  eventName: string;
  handler: (event: { payload: T }) => void;
}

let subscriptions: Subscription<unknown>[] = [];
const unlistenMock = vi.fn();
const listenMock = vi.fn().mockImplementation(
  (eventName: string, handler: (e: { payload: unknown }) => void) => {
    subscriptions.push({ eventName, handler });
    return Promise.resolve(unlistenMock);
  },
);

vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args: unknown[]) =>
    listenMock(...(args as [string, (e: { payload: unknown }) => void])),
}));

import { useTauriEvent } from './useTauriEvent';

describe('useTauriEvent', () => {
  beforeEach(() => {
    subscriptions = [];
    listenMock.mockClear();
    unlistenMock.mockClear();
  });

  it('registers a listener for the given event name on mount', async () => {
    renderHook(() => useTauriEvent('my-event', () => {}));
    await waitFor(() => expect(listenMock).toHaveBeenCalledTimes(1));
    expect(listenMock.mock.calls[0][0]).toBe('my-event');
  });

  it('invokes the handler with the event payload when the event fires', async () => {
    const handler = vi.fn();
    renderHook(() => useTauriEvent<string>('payload-event', handler));
    await waitFor(() => expect(subscriptions.length).toBe(1));
    subscriptions[0].handler({ payload: 'hello' });
    expect(handler).toHaveBeenCalledWith('hello');
  });

  it('always calls the latest handler even after re-renders', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ h }: { h: (p: string) => void }) => useTauriEvent<string>('e', h),
      { initialProps: { h: first } },
    );
    await waitFor(() => expect(subscriptions.length).toBe(1));
    rerender({ h: second });
    subscriptions[0].handler({ payload: 'x' });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('x');
    // Still only one registration after re-render.
    expect(listenMock).toHaveBeenCalledTimes(1);
  });

  it('calls the unlisten function on unmount', async () => {
    const { unmount } = renderHook(() => useTauriEvent('e', () => {}));
    await waitFor(() => expect(listenMock).toHaveBeenCalled());
    unmount();
    await waitFor(() => expect(unlistenMock).toHaveBeenCalled());
  });
});
