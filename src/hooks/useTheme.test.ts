import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { renderHookWithProviders } from '@/testUtils';
import { useTheme } from './useTheme';

vi.mock('@/styles/theme.css', () => ({
  lightTheme: 'light-theme',
  darkTheme: 'dark-theme',
  themeVars: {},
}));

const lightTheme = 'light-theme';
const darkTheme = 'dark-theme';

describe('useTheme', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    localStorage.clear();
  });

  it('defaults to light theme', () => {
    renderHookWithProviders(() => useTheme());
    expect(document.documentElement.classList.contains(lightTheme)).toBe(true);
  });

  it('applies dark theme class when set to dark', () => {
    const { result } = renderHookWithProviders(() => useTheme());
    act(() => { result.current.setTheme('dark'); });
    expect(document.documentElement.classList.contains(darkTheme)).toBe(true);
    expect(document.documentElement.classList.contains(lightTheme)).toBe(false);
  });

  it('applies light theme class when set to light', () => {
    const { result } = renderHookWithProviders(() => useTheme());
    act(() => { result.current.setTheme('dark'); });
    act(() => { result.current.setTheme('light'); });
    expect(document.documentElement.classList.contains(lightTheme)).toBe(true);
    expect(document.documentElement.classList.contains(darkTheme)).toBe(false);
  });

  it('returns the current theme value', () => {
    const { result } = renderHookWithProviders(() => useTheme());
    expect(result.current.theme).toBe('light');
    act(() => { result.current.setTheme('dark'); });
    expect(result.current.theme).toBe('dark');
  });

  it('removes lightTheme class when switching to dark', () => {
    const { result } = renderHookWithProviders(() => useTheme());
    // Start in light — lightTheme class should be present
    expect(document.documentElement.classList.contains(lightTheme)).toBe(true);
    // Switch to dark — lightTheme must be removed (not just darkTheme added)
    act(() => { result.current.setTheme('dark'); });
    expect(document.documentElement.classList.contains(lightTheme)).toBe(false);
    expect(document.documentElement.classList.contains(darkTheme)).toBe(true);
  });

  it('persists theme to localStorage and reads it back in a new store', async () => {
    // Render hook, switch to dark — atomWithStorage should persist '"dark"' to localStorage
    const { result, unmount } = renderHookWithProviders(() => useTheme());
    act(() => { result.current.setTheme('dark'); });
    expect(result.current.theme).toBe('dark');
    unmount();

    // Re-render in a fresh store — the hook should initialise from localStorage
    const { result: result2 } = renderHookWithProviders(() => useTheme());
    // atomWithStorage reads the persisted value on first render
    expect(result2.current.theme).toBe('dark');
  });
});
