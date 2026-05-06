import { describe, it, expect } from 'vitest';
import { HIDE_AFTER_COPY_MS } from './overlay';

describe('overlay constants', () => {
  it('HIDE_AFTER_COPY_MS is a positive small delay', () => {
    expect(HIDE_AFTER_COPY_MS).toBeGreaterThan(0);
    expect(HIDE_AFTER_COPY_MS).toBeLessThan(1000);
  });
});
