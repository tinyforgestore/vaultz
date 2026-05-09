import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { useOverlayGeneratorKeys } from './useOverlayGeneratorKeys';

function press(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

describe('useOverlayGeneratorKeys', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Escape calls onDismiss', () => {
    const onDismiss = vi.fn();
    renderHook(() => useOverlayGeneratorKeys({ onDismiss }));
    act(() => press('Escape'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('non-Escape keys do not call onDismiss', () => {
    const onDismiss = vi.fn();
    renderHook(() => useOverlayGeneratorKeys({ onDismiss }));
    act(() => {
      press('Enter');
      press('a');
      press(' ');
    });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('reads latest onDismiss via ref on re-render', () => {
    const onDismiss1 = vi.fn();
    const onDismiss2 = vi.fn();
    const { rerender } = renderHook(
      ({ onDismiss }: { onDismiss: () => void }) => useOverlayGeneratorKeys({ onDismiss }),
      { initialProps: { onDismiss: onDismiss1 } },
    );
    rerender({ onDismiss: onDismiss2 });
    act(() => press('Escape'));
    expect(onDismiss1).not.toHaveBeenCalled();
    expect(onDismiss2).toHaveBeenCalledTimes(1);
  });
});
