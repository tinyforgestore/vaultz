import { describe, it, expect } from 'vitest';
import { WINDOW_LABELS, EVENTS } from './events';

describe('events constants', () => {
  it('window labels match Rust constants', () => {
    expect(WINDOW_LABELS.MAIN).toBe('main');
    expect(WINDOW_LABELS.OVERLAY_SEARCH).toBe('overlay-search');
    expect(WINDOW_LABELS.OVERLAY_GENERATOR).toBe('overlay-generator');
  });

  it('event names match Rust constants', () => {
    expect(EVENTS.VAULT_LOCKED).toBe('vault-locked');
    expect(EVENTS.VAULT_UNLOCKED).toBe('vault-unlocked');
    expect(EVENTS.PASSWORDS_CHANGED).toBe('passwords-changed');
    expect(EVENTS.GENERATED_PASSWORDS_CHANGED).toBe('generated-passwords-changed');
    expect(EVENTS.OPEN_CREATE_ENTRY_PREFILLED).toBe('open-create-entry-prefilled');
  });
});
