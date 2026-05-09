import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { useGeneratedPasswordsPageKeys } from './useGeneratedPasswordsPageKeys';

function press(key: string) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

function makeArgs(overrides: Partial<Parameters<typeof useGeneratedPasswordsPageKeys>[0]> = {}) {
  return {
    enabled: true,
    hasSelection: true,
    onBack: vi.fn(),
    onSelectNext: vi.fn(),
    onSelectPrev: vi.fn(),
    onDeselect: vi.fn(),
    onConfirm: vi.fn(),
    onCopy: vi.fn(),
    onDelete: vi.fn(),
    onToggleVisibility: vi.fn(),
    ...overrides,
  };
}

describe('useGeneratedPasswordsPageKeys', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ArrowLeft calls onBack', () => {
    const a = makeArgs();
    renderHook(() => useGeneratedPasswordsPageKeys(a));
    act(() => press('ArrowLeft'));
    expect(a.onBack).toHaveBeenCalledTimes(1);
  });

  it('ArrowDown calls onSelectNext', () => {
    const a = makeArgs();
    renderHook(() => useGeneratedPasswordsPageKeys(a));
    act(() => press('ArrowDown'));
    expect(a.onSelectNext).toHaveBeenCalledTimes(1);
  });

  it('ArrowUp calls onSelectPrev', () => {
    const a = makeArgs();
    renderHook(() => useGeneratedPasswordsPageKeys(a));
    act(() => press('ArrowUp'));
    expect(a.onSelectPrev).toHaveBeenCalledTimes(1);
  });

  it('Enter calls onConfirm', () => {
    const a = makeArgs();
    renderHook(() => useGeneratedPasswordsPageKeys(a));
    act(() => press('Enter'));
    expect(a.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('c calls onCopy', () => {
    const a = makeArgs();
    renderHook(() => useGeneratedPasswordsPageKeys(a));
    act(() => press('c'));
    expect(a.onCopy).toHaveBeenCalledTimes(1);
  });

  it('Delete calls onDelete', () => {
    const a = makeArgs();
    renderHook(() => useGeneratedPasswordsPageKeys(a));
    act(() => press('Delete'));
    expect(a.onDelete).toHaveBeenCalledTimes(1);
  });

  it('Backspace calls onDelete', () => {
    const a = makeArgs();
    renderHook(() => useGeneratedPasswordsPageKeys(a));
    act(() => press('Backspace'));
    expect(a.onDelete).toHaveBeenCalledTimes(1);
  });

  it('r calls onToggleVisibility', () => {
    const a = makeArgs();
    renderHook(() => useGeneratedPasswordsPageKeys(a));
    act(() => press('r'));
    expect(a.onToggleVisibility).toHaveBeenCalledTimes(1);
  });

  it('Escape with selection calls onDeselect', () => {
    const a = makeArgs();
    renderHook(() => useGeneratedPasswordsPageKeys(a));
    act(() => press('Escape'));
    expect(a.onDeselect).toHaveBeenCalledTimes(1);
    expect(a.onBack).not.toHaveBeenCalled();
  });

  it('Escape with no selection calls onBack', () => {
    const a = makeArgs({ hasSelection: false });
    renderHook(() => useGeneratedPasswordsPageKeys(a));
    act(() => press('Escape'));
    expect(a.onBack).toHaveBeenCalledTimes(1);
    expect(a.onDeselect).not.toHaveBeenCalled();
  });

  it('Enter with no selection does not call onConfirm', () => {
    const a = makeArgs({ hasSelection: false });
    renderHook(() => useGeneratedPasswordsPageKeys(a));
    act(() => press('Enter'));
    expect(a.onConfirm).not.toHaveBeenCalled();
  });

  it('c with no selection does not call onCopy', () => {
    const a = makeArgs({ hasSelection: false });
    renderHook(() => useGeneratedPasswordsPageKeys(a));
    act(() => press('c'));
    expect(a.onCopy).not.toHaveBeenCalled();
  });

  it('does not fire when enabled is false', () => {
    const a = makeArgs({ enabled: false });
    renderHook(() => useGeneratedPasswordsPageKeys(a));
    act(() => press('Enter'));
    act(() => press('c'));
    act(() => press('Escape'));
    expect(a.onConfirm).not.toHaveBeenCalled();
    expect(a.onCopy).not.toHaveBeenCalled();
    expect(a.onDeselect).not.toHaveBeenCalled();
  });

  it('does not fire when target is an input', () => {
    const a = makeArgs();
    renderHook(() => useGeneratedPasswordsPageKeys(a));
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true })));
    expect(a.onCopy).not.toHaveBeenCalled();
    input.remove();
  });

  it('does not fire when target is a button (includeButton: true)', () => {
    const a = makeArgs();
    renderHook(() => useGeneratedPasswordsPageKeys(a));
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();
    act(() => button.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true })));
    expect(a.onCopy).not.toHaveBeenCalled();
    button.remove();
  });

  it('reads latest args via ref on re-render', () => {
    const a1 = makeArgs();
    const a2 = makeArgs();
    const { rerender } = renderHook(
      (args: Parameters<typeof useGeneratedPasswordsPageKeys>[0]) =>
        useGeneratedPasswordsPageKeys(args),
      { initialProps: a1 },
    );
    rerender(a2);
    act(() => press('Enter'));
    expect(a1.onConfirm).not.toHaveBeenCalled();
    expect(a2.onConfirm).toHaveBeenCalledTimes(1);
  });
});
