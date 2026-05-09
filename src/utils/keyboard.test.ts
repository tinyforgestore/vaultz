import { describe, it, expect } from 'vitest';
import { isFromInput } from './keyboard';

function evWithTarget(target: HTMLElement | null): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key: 'a' });
  Object.defineProperty(e, 'target', { value: target });
  return e;
}

describe('isFromInput', () => {
  it('returns true for INPUT', () => {
    const el = document.createElement('input');
    expect(isFromInput(evWithTarget(el))).toBe(true);
  });

  it('returns true for TEXTAREA', () => {
    const el = document.createElement('textarea');
    expect(isFromInput(evWithTarget(el))).toBe(true);
  });

  it('returns true for SELECT', () => {
    const el = document.createElement('select');
    expect(isFromInput(evWithTarget(el))).toBe(true);
  });

  it('returns false for BUTTON by default', () => {
    const el = document.createElement('button');
    expect(isFromInput(evWithTarget(el))).toBe(false);
  });

  it('returns true for BUTTON when includeButton is set', () => {
    const el = document.createElement('button');
    expect(isFromInput(evWithTarget(el), { includeButton: true })).toBe(true);
  });

  it('returns true for contentEditable element', () => {
    const el = document.createElement('div');
    Object.defineProperty(el, 'isContentEditable', { value: true });
    expect(isFromInput(evWithTarget(el))).toBe(true);
  });

  it('returns false for plain DIV', () => {
    const el = document.createElement('div');
    expect(isFromInput(evWithTarget(el))).toBe(false);
  });

  it('returns false when target is null', () => {
    expect(isFromInput(evWithTarget(null))).toBe(false);
  });
});
