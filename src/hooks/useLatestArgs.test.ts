import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLatestArgs } from './useLatestArgs';

describe('useLatestArgs', () => {
  it('returns a ref initialized to the first args value', () => {
    const { result } = renderHook(({ args }: { args: number }) => useLatestArgs(args), {
      initialProps: { args: 1 },
    });
    expect(result.current.current).toBe(1);
  });

  it('updates ref.current to the latest args on re-render', () => {
    const { result, rerender } = renderHook(
      ({ args }: { args: number }) => useLatestArgs(args),
      { initialProps: { args: 1 } },
    );
    rerender({ args: 42 });
    expect(result.current.current).toBe(42);
  });

  it('updates with object identity preserved across renders', () => {
    const a1 = { x: 1 };
    const a2 = { x: 2 };
    const { result, rerender } = renderHook(
      ({ args }: { args: { x: number } }) => useLatestArgs(args),
      { initialProps: { args: a1 } },
    );
    const refBefore = result.current;
    rerender({ args: a2 });
    expect(result.current).toBe(refBefore); // same ref object
    expect(result.current.current).toBe(a2);
  });
});
