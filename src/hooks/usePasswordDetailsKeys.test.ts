import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { usePasswordDetailsKeys } from './usePasswordDetailsKeys';

const samplePassword = { username: 'alice', password: 'secret-pw', website: 'https://example.com' };

function press(key: string, init: Partial<KeyboardEventInit> = {}) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, ...init }));
}

function makeHandlers() {
  return {
    onBack: vi.fn(),
    onEdit: vi.fn(),
    onToggleFavorite: vi.fn(),
    onCopyField: vi.fn(),
  };
}

describe('usePasswordDetailsKeys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Escape calls onBack', () => {
    const h = makeHandlers();
    renderHook(() => usePasswordDetailsKeys({ enabled: true, password: samplePassword, ...h }));
    act(() => press('Escape'));
    expect(h.onBack).toHaveBeenCalledTimes(1);
  });

  it('Backspace calls onBack', () => {
    const h = makeHandlers();
    renderHook(() => usePasswordDetailsKeys({ enabled: true, password: samplePassword, ...h }));
    act(() => press('Backspace'));
    expect(h.onBack).toHaveBeenCalledTimes(1);
  });

  it('1 copies username', () => {
    const h = makeHandlers();
    renderHook(() => usePasswordDetailsKeys({ enabled: true, password: samplePassword, ...h }));
    act(() => press('1'));
    expect(h.onCopyField).toHaveBeenCalledWith('username', 'alice');
  });

  it('2 copies password', () => {
    const h = makeHandlers();
    renderHook(() => usePasswordDetailsKeys({ enabled: true, password: samplePassword, ...h }));
    act(() => press('2'));
    expect(h.onCopyField).toHaveBeenCalledWith('password', 'secret-pw');
  });

  it('3 copies website (field name matches page copiedField check)', () => {
    const h = makeHandlers();
    renderHook(() => usePasswordDetailsKeys({ enabled: true, password: samplePassword, ...h }));
    act(() => press('3'));
    expect(h.onCopyField).toHaveBeenCalledWith('website', 'https://example.com');
  });

  it('3 with no website passes empty string', () => {
    const h = makeHandlers();
    renderHook(() =>
      usePasswordDetailsKeys({
        enabled: true,
        password: { ...samplePassword, website: null },
        ...h,
      }),
    );
    act(() => press('3'));
    expect(h.onCopyField).toHaveBeenCalledWith('website', '');
  });

  it('E calls onEdit', () => {
    const h = makeHandlers();
    renderHook(() => usePasswordDetailsKeys({ enabled: true, password: samplePassword, ...h }));
    act(() => press('e'));
    expect(h.onEdit).toHaveBeenCalledTimes(1);
  });

  it('F calls onToggleFavorite', () => {
    const h = makeHandlers();
    renderHook(() => usePasswordDetailsKeys({ enabled: true, password: samplePassword, ...h }));
    act(() => press('f'));
    expect(h.onToggleFavorite).toHaveBeenCalledTimes(1);
  });

  it('does not fire when enabled is false', () => {
    const h = makeHandlers();
    renderHook(() => usePasswordDetailsKeys({ enabled: false, password: samplePassword, ...h }));
    act(() => press('Escape'));
    act(() => press('1'));
    act(() => press('e'));
    expect(h.onBack).not.toHaveBeenCalled();
    expect(h.onCopyField).not.toHaveBeenCalled();
    expect(h.onEdit).not.toHaveBeenCalled();
  });

  it('does not fire when target is an input', () => {
    const h = makeHandlers();
    renderHook(() => usePasswordDetailsKeys({ enabled: true, password: samplePassword, ...h }));
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true })));
    expect(h.onCopyField).not.toHaveBeenCalled();
    input.remove();
  });

  it('does not fire field-copy when password is null', () => {
    const h = makeHandlers();
    renderHook(() => usePasswordDetailsKeys({ enabled: true, password: null, ...h }));
    act(() => press('1'));
    act(() => press('e'));
    act(() => press('f'));
    expect(h.onCopyField).not.toHaveBeenCalled();
    expect(h.onEdit).not.toHaveBeenCalled();
    expect(h.onToggleFavorite).not.toHaveBeenCalled();
  });

  it('Escape still fires when password is null', () => {
    const h = makeHandlers();
    renderHook(() => usePasswordDetailsKeys({ enabled: true, password: null, ...h }));
    act(() => press('Escape'));
    expect(h.onBack).toHaveBeenCalledTimes(1);
  });

  it('Cmd+1 does not copy (only bare 1)', () => {
    const h = makeHandlers();
    renderHook(() => usePasswordDetailsKeys({ enabled: true, password: samplePassword, ...h }));
    act(() => press('1', { metaKey: true }));
    expect(h.onCopyField).not.toHaveBeenCalled();
  });

  it('reads latest args via ref on subsequent render', () => {
    const h1 = makeHandlers();
    const h2 = makeHandlers();
    const { rerender } = renderHook(
      (props: { onCopyField: (f: string, v: string) => void }) =>
        usePasswordDetailsKeys({
          enabled: true,
          password: samplePassword,
          onBack: h1.onBack,
          onEdit: h1.onEdit,
          onToggleFavorite: h1.onToggleFavorite,
          onCopyField: props.onCopyField,
        }),
      { initialProps: { onCopyField: h1.onCopyField } },
    );
    rerender({ onCopyField: h2.onCopyField });
    act(() => press('2'));
    expect(h1.onCopyField).not.toHaveBeenCalled();
    expect(h2.onCopyField).toHaveBeenCalledWith('password', 'secret-pw');
  });
});
