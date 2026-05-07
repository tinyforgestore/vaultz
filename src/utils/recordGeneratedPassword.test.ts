import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core');

import { invoke } from '@tauri-apps/api/core';
import { recordGeneratedPassword } from './recordGeneratedPassword';

const mockInvoke = vi.mocked(invoke);

describe('recordGeneratedPassword', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('invokes record_generated_password with the password argument', () => {
    mockInvoke.mockResolvedValue(undefined);
    return recordGeneratedPassword('hunter2').then(() => {
      expect(mockInvoke).toHaveBeenCalledWith('record_generated_password', {
        password: 'hunter2',
      });
    });
  });

  it('is a no-op for empty input — does not call invoke', () => {
    mockInvoke.mockResolvedValue(undefined);
    return recordGeneratedPassword('').then(() => {
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  it('resolves to undefined when invoke succeeds', () => {
    mockInvoke.mockResolvedValue('something');
    return recordGeneratedPassword('p').then((value) => {
      expect(value).toBeUndefined();
    });
  });

  it('swallows errors from invoke and resolves to undefined', () => {
    mockInvoke.mockRejectedValue(new Error('boom'));
    return recordGeneratedPassword('p').then((value) => {
      expect(value).toBeUndefined();
    });
  });
});
