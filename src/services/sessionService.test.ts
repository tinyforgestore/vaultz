import { describe, it, expect, vi } from 'vitest';

vi.mock('@tauri-apps/api/core');

import { invoke } from '@tauri-apps/api/core';
import { sessionService } from './sessionService';

const mockInvoke = vi.mocked(invoke);

describe('sessionService', () => {
  describe('login', () => {
    it('returns true on successful login', async () => {
      mockInvoke.mockResolvedValueOnce(true);
      expect(await sessionService.login('correct')).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('login', { password: 'correct' });
    });

    it('returns false on failed login', async () => {
      mockInvoke.mockResolvedValueOnce(false);
      expect(await sessionService.login('wrong')).toBe(false);
    });

    it('returns false and does not throw when invoke rejects', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('auth error'));
      expect(await sessionService.login('pass')).toBe(false);
    });
  });

  describe('logout', () => {
    it('calls logout command', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await sessionService.logout();
      expect(mockInvoke).toHaveBeenCalledWith('logout');
    });

    it('does not throw when invoke rejects', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('network'));
      await expect(sessionService.logout()).resolves.toBeUndefined();
    });
  });

  describe('isAuthenticated', () => {
    it('returns true when session is active', async () => {
      mockInvoke.mockResolvedValueOnce(true);
      expect(await sessionService.isAuthenticated()).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('is_authenticated');
    });

    it('returns false when invoke rejects', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('err'));
      expect(await sessionService.isAuthenticated()).toBe(false);
    });
  });

  describe('updateActivity', () => {
    it('calls update_activity', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await sessionService.updateActivity();
      expect(mockInvoke).toHaveBeenCalledWith('update_activity');
    });

    it('does not throw when invoke rejects', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('err'));
      await expect(sessionService.updateActivity()).resolves.toBeUndefined();
    });
  });

  describe('checkTimeout', () => {
    it('returns true when session has timed out', async () => {
      mockInvoke.mockResolvedValueOnce(true);
      expect(await sessionService.checkTimeout()).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('check_session_timeout');
    });

    it('returns false when invoke rejects', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('err'));
      expect(await sessionService.checkTimeout()).toBe(false);
    });
  });
});
