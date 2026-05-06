// Mirror of `src-tauri/src/constants.rs` — keep these in sync.

export const WINDOW_LABELS = {
  MAIN: 'main',
  OVERLAY_SEARCH: 'overlay-search',
  OVERLAY_GENERATOR: 'overlay-generator',
} as const;

export const EVENTS = {
  VAULT_LOCKED: 'vault-locked',
  VAULT_UNLOCKED: 'vault-unlocked',
  PASSWORDS_CHANGED: 'passwords-changed',
} as const;
