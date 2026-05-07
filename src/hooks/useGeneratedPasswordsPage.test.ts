import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, waitFor } from '@testing-library/react';

vi.mock('@tauri-apps/api/core');

const listenMock = vi.fn();
vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args: unknown[]) => listenMock(...args),
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

import { invoke } from '@tauri-apps/api/core';
import { renderHookWithProviders } from '@/testUtils';
import { useGeneratedPasswordsPage } from './useGeneratedPasswordsPage';

const mockInvoke = vi.mocked(invoke);

const sampleRows = [
  { id: 1, password: 'abc', created_at: '2026-04-28 11:00:00' },
  { id: 2, password: 'xyz', created_at: '2026-04-28 10:00:00' },
];

describe('useGeneratedPasswordsPage', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    listenMock.mockReset();
    navigateMock.mockReset();
    listenMock.mockResolvedValue(() => {});
  });

  it('fetches list on mount and maps fields to camelCase', async () => {
    mockInvoke.mockResolvedValueOnce(sampleRows);
    const { result } = renderHookWithProviders(() => useGeneratedPasswordsPage());
    await waitFor(() => expect(result.current.history.length).toBe(2));
    expect(result.current.history[0]).toEqual({
      id: 1,
      password: 'abc',
      createdAt: '2026-04-28 11:00:00',
    });
    expect(mockInvoke).toHaveBeenCalledWith('list_generated_passwords');
  });

  it('falls back to empty history if list invoke rejects', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHookWithProviders(() => useGeneratedPasswordsPage());
    await waitFor(() => expect(result.current.history).toEqual([]));
  });

  it('registers a listener for GENERATED_PASSWORDS_CHANGED', async () => {
    mockInvoke.mockResolvedValue([]);
    renderHookWithProviders(() => useGeneratedPasswordsPage());
    await waitFor(() => expect(listenMock).toHaveBeenCalled());
    const [eventName] = listenMock.mock.calls[0];
    expect(eventName).toBe('generated-passwords-changed');
  });

  it('handleCopy invokes write_secret_to_clipboard with the password', async () => {
    mockInvoke.mockResolvedValueOnce([]);
    const { result } = renderHookWithProviders(() => useGeneratedPasswordsPage());
    await waitFor(() => expect(result.current.history).toEqual([]));
    mockInvoke.mockClear();
    mockInvoke.mockResolvedValueOnce(undefined);
    act(() => result.current.handleCopy({ id: 1, password: 'p', createdAt: 't' }));
    expect(mockInvoke).toHaveBeenCalledWith('write_secret_to_clipboard', { text: 'p' });
  });

  it('handleDelete invokes delete_generated_password with id', async () => {
    mockInvoke.mockResolvedValueOnce([]);
    const { result } = renderHookWithProviders(() => useGeneratedPasswordsPage());
    await waitFor(() => expect(result.current.history).toEqual([]));
    mockInvoke.mockClear();
    mockInvoke.mockResolvedValueOnce(undefined);
    act(() => result.current.handleDelete(7));
    expect(mockInvoke).toHaveBeenCalledWith('delete_generated_password', { id: 7 });
  });

  it('clear-all flow: request opens confirm, confirm invokes clear, cancel resets', async () => {
    mockInvoke.mockResolvedValueOnce([]);
    const { result } = renderHookWithProviders(() => useGeneratedPasswordsPage());
    await waitFor(() => expect(result.current.history).toEqual([]));

    act(() => result.current.handleRequestClearAll());
    expect(result.current.confirmClear).toBe(true);

    act(() => result.current.handleCancelClearAll());
    expect(result.current.confirmClear).toBe(false);

    act(() => result.current.handleRequestClearAll());
    mockInvoke.mockClear();
    mockInvoke.mockResolvedValueOnce(undefined);
    act(() => result.current.handleConfirmClearAll());
    expect(result.current.confirmClear).toBe(false);
    expect(mockInvoke).toHaveBeenCalledWith('clear_generated_passwords');
  });

  it('handleCreateEntry navigates to dashboard with prefilled password state', async () => {
    mockInvoke.mockResolvedValueOnce([]);
    const { result } = renderHookWithProviders(() => useGeneratedPasswordsPage());
    await waitFor(() => expect(result.current.history).toEqual([]));
    act(() => result.current.handleCreateEntry('mypass'));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard', {
      state: { prefilledPassword: 'mypass' },
    });
  });

  it('handleBack navigates to /dashboard', async () => {
    mockInvoke.mockResolvedValueOnce([]);
    const { result } = renderHookWithProviders(() => useGeneratedPasswordsPage());
    await waitFor(() => expect(result.current.history).toEqual([]));
    act(() => result.current.handleBack());
    expect(navigateMock).toHaveBeenCalledWith('/dashboard');
  });

  it('hide/reveal toggle membership in hiddenIds set', async () => {
    mockInvoke.mockResolvedValueOnce([]);
    const { result } = renderHookWithProviders(() => useGeneratedPasswordsPage());
    await waitFor(() => expect(result.current.history).toEqual([]));

    act(() => result.current.handleHide(3));
    expect(result.current.hiddenIds.has(3)).toBe(true);

    act(() => result.current.handleReveal(3));
    expect(result.current.hiddenIds.has(3)).toBe(false);
  });
});
