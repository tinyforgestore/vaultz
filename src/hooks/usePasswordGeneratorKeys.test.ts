import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { usePasswordGeneratorKeys } from './usePasswordGeneratorKeys';

function press(key: string, init: Partial<KeyboardEventInit> = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, ...init }));
}

function makeArgs(overrides: Partial<Parameters<typeof usePasswordGeneratorKeys>[0]> = {}) {
  return {
    enabled: true,
    onUsePassword: vi.fn(),
    onDecrementLength: vi.fn(),
    onIncrementLength: vi.fn(),
    onToggleUppercase: vi.fn(),
    onToggleLowercase: vi.fn(),
    onToggleNumbers: vi.fn(),
    onToggleSymbols: vi.fn(),
    onRegenerate: vi.fn(),
    ...overrides,
  };
}

describe('usePasswordGeneratorKeys', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Enter calls onUsePassword', () => {
    const a = makeArgs();
    renderHook(() => usePasswordGeneratorKeys(a));
    act(() => press('Enter'));
    expect(a.onUsePassword).toHaveBeenCalledTimes(1);
  });

  it('ArrowLeft decrements length', () => {
    const a = makeArgs();
    renderHook(() => usePasswordGeneratorKeys(a));
    act(() => press('ArrowLeft'));
    expect(a.onDecrementLength).toHaveBeenCalledTimes(1);
  });

  it('ArrowRight increments length', () => {
    const a = makeArgs();
    renderHook(() => usePasswordGeneratorKeys(a));
    act(() => press('ArrowRight'));
    expect(a.onIncrementLength).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['u', 'onToggleUppercase'],
    ['l', 'onToggleLowercase'],
    ['n', 'onToggleNumbers'],
    ['s', 'onToggleSymbols'],
    ['r', 'onRegenerate'],
  ] as const)('%s calls %s', (key, handler) => {
    const a = makeArgs();
    renderHook(() => usePasswordGeneratorKeys(a));
    act(() => press(key));
    expect(a[handler]).toHaveBeenCalledTimes(1);
  });

  it('uppercase letters work too (case-insensitive)', () => {
    const a = makeArgs();
    renderHook(() => usePasswordGeneratorKeys(a));
    act(() => press('R'));
    expect(a.onRegenerate).toHaveBeenCalledTimes(1);
  });

  it('Cmd+R does NOT trigger regenerate (modifier suppresses bare letters)', () => {
    const a = makeArgs();
    renderHook(() => usePasswordGeneratorKeys(a));
    act(() => press('r', { metaKey: true }));
    expect(a.onRegenerate).not.toHaveBeenCalled();
  });

  it('does not fire when target is an input', () => {
    const a = makeArgs();
    renderHook(() => usePasswordGeneratorKeys(a));
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true })));
    expect(a.onRegenerate).not.toHaveBeenCalled();
    input.remove();
  });

  it('does not fire when enabled is false', () => {
    const a = makeArgs({ enabled: false });
    renderHook(() => usePasswordGeneratorKeys(a));
    act(() => press('Enter'));
    act(() => press('r'));
    act(() => press('ArrowLeft'));
    expect(a.onUsePassword).not.toHaveBeenCalled();
    expect(a.onRegenerate).not.toHaveBeenCalled();
    expect(a.onDecrementLength).not.toHaveBeenCalled();
  });

  it('reads latest args via ref on re-render', () => {
    const a1 = makeArgs();
    const a2 = makeArgs();
    const { rerender } = renderHook(
      (args: Parameters<typeof usePasswordGeneratorKeys>[0]) => usePasswordGeneratorKeys(args),
      { initialProps: a1 },
    );
    rerender(a2);
    act(() => press('Enter'));
    expect(a1.onUsePassword).not.toHaveBeenCalled();
    expect(a2.onUsePassword).toHaveBeenCalledTimes(1);
  });
});
