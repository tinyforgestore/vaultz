import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';

let listenerHandler: ((event: { payload: string }) => void) | null = null;
const listenMock = vi.fn().mockImplementation(
  (_event: string, handler: (e: { payload: string }) => void) => {
    listenerHandler = handler;
    return Promise.resolve(() => {
      listenerHandler = null;
    });
  },
);

vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args: unknown[]) =>
    listenMock(...(args as [string, (e: { payload: string }) => void])),
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

import { renderHookWithProviders } from '@/testUtils';
import { useOpenCreateEntryPrefilled } from './useOpenCreateEntryPrefilled';

describe('useOpenCreateEntryPrefilled', () => {
  beforeEach(() => {
    listenerHandler = null;
    listenMock.mockClear();
    navigateMock.mockClear();
  });

  it('subscribes to OPEN_CREATE_ENTRY_PREFILLED on mount', async () => {
    renderHookWithProviders(() => useOpenCreateEntryPrefilled());
    await waitFor(() => expect(listenMock).toHaveBeenCalled());
    expect(listenMock.mock.calls[0][0]).toBe('open-create-entry-prefilled');
  });

  it('navigates to /dashboard with prefilledPassword state on event', async () => {
    renderHookWithProviders(() => useOpenCreateEntryPrefilled());
    await waitFor(() => expect(listenerHandler).not.toBeNull());
    listenerHandler!({ payload: 'mySecret123' });
    expect(navigateMock).toHaveBeenCalledWith('/dashboard', {
      state: { prefilledPassword: 'mySecret123' },
    });
  });
});
