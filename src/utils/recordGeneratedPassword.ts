import { invoke } from '@tauri-apps/api/core';

/**
 * Records a generated password into the session-scoped history table.
 *
 * - No-op for empty input.
 * - Errors are swallowed: history recording must never break the surrounding
 *   flow (copy / create-entry / save-as).
 * - Returns a Promise<void> so callers can await it in tests if they wish.
 */
export const recordGeneratedPassword = (password: string): Promise<void> => {
  if (!password) return Promise.resolve();
  return invoke('record_generated_password', { password })
    .then(() => undefined)
    .catch(() => undefined);
};
