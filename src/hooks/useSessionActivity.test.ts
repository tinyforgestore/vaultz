import { describe, it, expect, vi } from 'vitest';
import { act } from '@testing-library/react';

vi.mock('@tauri-apps/api/core');
vi.mock('@/services/sessionService', () => ({
  sessionService: {
    updateActivity: vi.fn().mockResolvedValue(undefined),
    checkTimeout: vi.fn().mockResolvedValue(false),
  },
}));

import { sessionService } from '@/services/sessionService';
import { renderHookWithProviders } from '@/testUtils';
import { useSessionActivity } from './useSessionActivity';
import { isAuthenticatedAtom } from '@/store/atoms';

const mockUpdateActivity = vi.mocked(sessionService.updateActivity);
const mockCheckTimeout = vi.mocked(sessionService.checkTimeout);

function setup() {
  return renderHookWithProviders(() => useSessionActivity());
}

describe('useSessionActivity', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('activity tracking', () => {
    it('calls updateActivity on mousedown', () => {
      setup();
      act(() => window.dispatchEvent(new Event('mousedown')));
      expect(mockUpdateActivity).toHaveBeenCalledOnce();
    });

    it('calls updateActivity on keydown', () => {
      setup();
      act(() => window.dispatchEvent(new Event('keydown')));
      expect(mockUpdateActivity).toHaveBeenCalledOnce();
    });

    it('calls updateActivity on scroll', () => {
      setup();
      act(() => window.dispatchEvent(new Event('scroll')));
      expect(mockUpdateActivity).toHaveBeenCalledOnce();
    });

    it('calls updateActivity on touchstart', () => {
      setup();
      act(() => window.dispatchEvent(new Event('touchstart')));
      expect(mockUpdateActivity).toHaveBeenCalledOnce();
    });
  });

  describe('timeout polling', () => {
    it('checks timeout every 30 seconds', async () => {
      setup();
      await act(async () => vi.advanceTimersByTime(30000));
      expect(mockCheckTimeout).toHaveBeenCalledOnce();
      await act(async () => vi.advanceTimersByTime(30000));
      expect(mockCheckTimeout).toHaveBeenCalledTimes(2);
    });

    it('logs out and navigates when session times out', async () => {
      mockCheckTimeout.mockResolvedValueOnce(true);
      const { store } = setup();
      store.set(isAuthenticatedAtom, true);
      await act(async () => vi.advanceTimersByTime(30000));
      expect(store.get(isAuthenticatedAtom)).toBe(false);
    });

    it('does not logout when session is still valid', async () => {
      mockCheckTimeout.mockResolvedValue(false);
      const { store } = setup();
      store.set(isAuthenticatedAtom, true);
      await act(async () => vi.advanceTimersByTime(30000));
      expect(store.get(isAuthenticatedAtom)).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('removes event listeners on unmount', () => {
      const removeEventSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = setup();
      unmount();
      expect(removeEventSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(removeEventSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(removeEventSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
      expect(removeEventSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
    });

    it('stops polling on unmount', async () => {
      const { unmount } = setup();
      unmount();
      await act(async () => vi.advanceTimersByTime(60000));
      expect(mockCheckTimeout).not.toHaveBeenCalled();
    });
  });
});
