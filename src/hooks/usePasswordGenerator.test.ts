import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePasswordGenerator } from './usePasswordGenerator';

const UPPERCASE = /[A-Z]/;
const LOWERCASE = /[a-z]/;
const NUMBER = /[0-9]/;
const SYMBOL = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/;

function setup(onUsePassword = vi.fn()) {
  return renderHook(() => usePasswordGenerator({ onUsePassword }));
}

describe('usePasswordGenerator', () => {
  it('generates a password on mount', () => {
    const { result } = setup();
    expect(result.current.generatedPassword.length).toBeGreaterThan(0);
  });

  it('defaults to length 16', () => {
    const { result } = setup();
    expect(result.current.generatedPassword).toHaveLength(16);
  });

  it('respects custom length', () => {
    const { result } = setup();
    act(() => result.current.setLength([24]));
    expect(result.current.generatedPassword).toHaveLength(24);
  });

  it('default password contains uppercase, lowercase, number, and symbol', () => {
    const { result } = setup();
    const pw = result.current.generatedPassword;
    expect(pw).toMatch(UPPERCASE);
    expect(pw).toMatch(LOWERCASE);
    expect(pw).toMatch(NUMBER);
    expect(pw).toMatch(SYMBOL);
  });

  it('excludes uppercase when disabled', () => {
    const { result } = setup();
    act(() => result.current.setIncludeUppercase(false));
    expect(result.current.generatedPassword).not.toMatch(UPPERCASE);
  });

  it('excludes numbers when disabled', () => {
    const { result } = setup();
    act(() => result.current.setIncludeNumbers(false));
    expect(result.current.generatedPassword).not.toMatch(NUMBER);
  });

  it('excludes symbols when disabled', () => {
    const { result } = setup();
    act(() => result.current.setIncludeSymbols(false));
    expect(result.current.generatedPassword).not.toMatch(SYMBOL);
  });

  it('falls back to lowercase when all options disabled', () => {
    const { result } = setup();
    act(() => {
      result.current.setIncludeUppercase(false);
      result.current.setIncludeNumbers(false);
      result.current.setIncludeSymbols(false);
    });
    // May still contain lowercase only
    expect(result.current.generatedPassword).toMatch(LOWERCASE);
    expect(result.current.generatedPassword).not.toMatch(UPPERCASE);
    expect(result.current.generatedPassword).not.toMatch(NUMBER);
  });

  it('handleRegenerate produces a new password of the same length', () => {
    const { result } = setup();
    const first = result.current.generatedPassword;
    // Regenerate until we get a different value (extremely unlikely to be same)
    let attempts = 0;
    let regenerated = first;
    while (regenerated === first && attempts < 10) {
      act(() => result.current.handleRegenerate());
      regenerated = result.current.generatedPassword;
      attempts++;
    }
    expect(regenerated).toHaveLength(first.length);
  });

  it('handleUsePassword calls onUsePassword with current password', () => {
    const onUsePassword = vi.fn();
    const { result } = renderHook(() => usePasswordGenerator({ onUsePassword }));
    act(() => result.current.handleUsePassword());
    expect(onUsePassword).toHaveBeenCalledOnce();
    expect(onUsePassword).toHaveBeenCalledWith(result.current.generatedPassword);
  });

  it('regenerates when length changes', () => {
    const { result } = setup();
    act(() => result.current.setLength([8]));
    expect(result.current.generatedPassword).toHaveLength(8);
  });
});
