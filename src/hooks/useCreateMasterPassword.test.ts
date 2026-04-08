import { describe, it, expect, vi } from 'vitest';
import { act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';

vi.mock('@tauri-apps/api/core');

import { invoke } from '@tauri-apps/api/core';
import { useCreateMasterPassword } from './useCreateMasterPassword';

const mockInvoke = vi.mocked(invoke);

function setup() {
  return renderHook(() => useCreateMasterPassword());
}

describe('useCreateMasterPassword', () => {
  describe('validation', () => {
    it('errors when fields are empty', async () => {
      const { result } = setup();
      const success = await act(async () => result.current.createMasterPassword());
      expect(success).toBe(false);
      expect(result.current.error).toBe('Please fill in all fields');
    });

    it('errors when password is under 8 characters', async () => {
      const { result } = setup();
      act(() => { result.current.setPassword('short'); result.current.setConfirmPassword('short'); });
      const success = await act(async () => result.current.createMasterPassword());
      expect(success).toBe(false);
      expect(result.current.error).toContain('8 characters');
    });

    it('errors when passwords do not match', async () => {
      const { result } = setup();
      act(() => { result.current.setPassword('password123'); result.current.setConfirmPassword('different1'); });
      const success = await act(async () => result.current.createMasterPassword());
      expect(success).toBe(false);
      expect(result.current.error).toBe('Passwords do not match');
    });
  });

  describe('success', () => {
    it('calls initialize_database and returns true', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      const { result } = setup();
      act(() => { result.current.setPassword('strongpass1'); result.current.setConfirmPassword('strongpass1'); });
      const success = await act(async () => result.current.createMasterPassword());
      expect(success).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('initialize_database', { masterPassword: 'strongpass1' });
    });

    it('clears password fields after success', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      const { result } = setup();
      act(() => { result.current.setPassword('strongpass1'); result.current.setConfirmPassword('strongpass1'); });
      await act(async () => result.current.createMasterPassword());
      expect(result.current.password).toBe('');
      expect(result.current.confirmPassword).toBe('');
    });

    it('clears loading after success', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      const { result } = setup();
      act(() => { result.current.setPassword('strongpass1'); result.current.setConfirmPassword('strongpass1'); });
      await act(async () => result.current.createMasterPassword());
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('failure', () => {
    it('sets error and returns false when invoke throws', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('DB error'));
      const { result } = setup();
      act(() => { result.current.setPassword('strongpass1'); result.current.setConfirmPassword('strongpass1'); });
      const success = await act(async () => result.current.createMasterPassword());
      expect(success).toBe(false);
      expect(result.current.error).toBe('DB error');
    });

    it('clears loading after failure', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('err'));
      const { result } = setup();
      act(() => { result.current.setPassword('strongpass1'); result.current.setConfirmPassword('strongpass1'); });
      await act(async () => result.current.createMasterPassword());
      expect(result.current.isLoading).toBe(false);
    });
  });
});
