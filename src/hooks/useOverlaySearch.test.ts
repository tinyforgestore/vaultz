import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    listen: vi.fn().mockResolvedValue(() => {}),
    hide: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { invoke } from '@tauri-apps/api/core';
import { useOverlaySearch } from './useOverlaySearch';

const mockInvoke = vi.mocked(invoke);

const sampleEntry = {
  id: '1',
  name: 'GitHub',
  username: 'me@example.com',
  password: 'sekret',
};

describe('useOverlaySearch', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('initial state is empty and unlocked when authenticated', async () => {
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === 'is_authenticated') return Promise.resolve(true);
      if (cmd === 'get_passwords') return Promise.resolve([sampleEntry]);
      return Promise.resolve(undefined);
    });
    const { result } = renderHook(() => useOverlaySearch());
    await waitFor(() => expect(result.current.isLocked).toBe(false));
    expect(result.current.query).toBe('');
  });

  it('marks locked when not authenticated', async () => {
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === 'is_authenticated') return Promise.resolve(false);
      return Promise.resolve(undefined);
    });
    const { result } = renderHook(() => useOverlaySearch());
    await waitFor(() => expect(result.current.isLocked).toBe(true));
  });

  it('setQuery updates state', () => {
    mockInvoke.mockResolvedValue(true);
    const { result } = renderHook(() => useOverlaySearch());
    act(() => result.current.setQuery('git'));
    expect(result.current.query).toBe('git');
  });

  it('copyPassword writes secret then hides overlay', async () => {
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === 'is_authenticated') return Promise.resolve(true);
      return Promise.resolve(undefined);
    });
    const { result } = renderHook(() => useOverlaySearch());
    await act(async () => {
      result.current.copyPassword(sampleEntry);
      await new Promise((r) => setTimeout(r, 250));
    });
    expect(mockInvoke).toHaveBeenCalledWith('write_secret_to_clipboard', { text: 'sekret' });
    expect(mockInvoke).toHaveBeenCalledWith('hide_overlay_search');
  });

  it('copyUsername writes username then hides overlay', async () => {
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === 'is_authenticated') return Promise.resolve(true);
      return Promise.resolve(undefined);
    });
    const { result } = renderHook(() => useOverlaySearch());
    await act(async () => {
      result.current.copyUsername(sampleEntry);
      await new Promise((r) => setTimeout(r, 250));
    });
    expect(mockInvoke).toHaveBeenCalledWith('write_secret_to_clipboard', { text: 'me@example.com' });
    expect(mockInvoke).toHaveBeenCalledWith('hide_overlay_search');
  });

  it('hideOverlay invokes hide command', () => {
    mockInvoke.mockResolvedValue(undefined);
    const { result } = renderHook(() => useOverlaySearch());
    act(() => result.current.hideOverlay());
    expect(mockInvoke).toHaveBeenCalledWith('hide_overlay_search');
  });

  it('setSelectedIndex updates state', () => {
    mockInvoke.mockResolvedValue(undefined);
    const { result } = renderHook(() => useOverlaySearch());
    act(() => result.current.setSelectedIndex(3));
    expect(result.current.selectedIndex).toBe(3);
  });

  it('exposes inputRef and handleKeyDown', () => {
    mockInvoke.mockResolvedValue(undefined);
    const { result } = renderHook(() => useOverlaySearch());
    expect(result.current.inputRef).toBeDefined();
    expect(typeof result.current.handleKeyDown).toBe('function');
  });

  it('Enter key copies password of selected result', async () => {
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === 'is_authenticated') return Promise.resolve(true);
      if (cmd === 'get_passwords') return Promise.resolve([sampleEntry]);
      return Promise.resolve(undefined);
    });
    const { result } = renderHook(() => useOverlaySearch());
    await waitFor(() => expect(result.current.results.length).toBe(1));
    const evt = {
      key: 'Enter',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent<HTMLInputElement>;
    act(() => result.current.handleKeyDown(evt));
    expect(mockInvoke).toHaveBeenCalledWith('write_secret_to_clipboard', { text: 'sekret' });
  });

  it('bare P does NOT copy password (C2 — bare-P removed)', async () => {
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === 'is_authenticated') return Promise.resolve(true);
      if (cmd === 'get_passwords') return Promise.resolve([sampleEntry]);
      return Promise.resolve(undefined);
    });
    const { result } = renderHook(() => useOverlaySearch());
    await waitFor(() => expect(result.current.results.length).toBe(1));
    const evt = {
      key: 'p',
      metaKey: false,
      ctrlKey: false,
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent<HTMLInputElement>;
    act(() => result.current.handleKeyDown(evt));
    expect(mockInvoke).not.toHaveBeenCalledWith('write_secret_to_clipboard', expect.any(Object));
  });

  it('Cmd+P copies password of selected result', async () => {
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === 'is_authenticated') return Promise.resolve(true);
      if (cmd === 'get_passwords') return Promise.resolve([sampleEntry]);
      return Promise.resolve(undefined);
    });
    const { result } = renderHook(() => useOverlaySearch());
    await waitFor(() => expect(result.current.results.length).toBe(1));
    const evt = {
      key: 'p',
      metaKey: true,
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent<HTMLInputElement>;
    act(() => result.current.handleKeyDown(evt));
    expect(mockInvoke).toHaveBeenCalledWith('write_secret_to_clipboard', { text: 'sekret' });
  });

  it('Cmd+E copies username of selected result', async () => {
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === 'is_authenticated') return Promise.resolve(true);
      if (cmd === 'get_passwords') return Promise.resolve([sampleEntry]);
      return Promise.resolve(undefined);
    });
    const { result } = renderHook(() => useOverlaySearch());
    await waitFor(() => expect(result.current.results.length).toBe(1));
    const evt = {
      key: 'e',
      metaKey: true,
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent<HTMLInputElement>;
    act(() => result.current.handleKeyDown(evt));
    expect(mockInvoke).toHaveBeenCalledWith('write_secret_to_clipboard', { text: 'me@example.com' });
  });

  it('Escape calls hide_overlay_search', async () => {
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === 'is_authenticated') return Promise.resolve(true);
      return Promise.resolve(undefined);
    });
    const { result } = renderHook(() => useOverlaySearch());
    await waitFor(() => expect(result.current.isLocked).toBe(false));
    const evt = { key: 'Escape', preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLInputElement>;
    act(() => result.current.handleKeyDown(evt));
    expect(mockInvoke).toHaveBeenCalledWith('hide_overlay_search');
  });

  it('ArrowDown advances selectedIndex', async () => {
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === 'is_authenticated') return Promise.resolve(true);
      if (cmd === 'get_passwords')
        return Promise.resolve([
          sampleEntry,
          { ...sampleEntry, id: '2', name: 'GitLab' },
        ]);
      return Promise.resolve(undefined);
    });
    const { result } = renderHook(() => useOverlaySearch());
    await waitFor(() => expect(result.current.results.length).toBe(2));
    const evt = { key: 'ArrowDown', preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLInputElement>;
    act(() => result.current.handleKeyDown(evt));
    expect(result.current.selectedIndex).toBe(1);
  });

  it('ArrowUp clamps selectedIndex at 0', async () => {
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === 'is_authenticated') return Promise.resolve(true);
      if (cmd === 'get_passwords') return Promise.resolve([sampleEntry]);
      return Promise.resolve(undefined);
    });
    const { result } = renderHook(() => useOverlaySearch());
    await waitFor(() => expect(result.current.results.length).toBe(1));
    const evt = { key: 'ArrowUp', preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLInputElement>;
    act(() => result.current.handleKeyDown(evt));
    expect(result.current.selectedIndex).toBe(0);
  });
});
