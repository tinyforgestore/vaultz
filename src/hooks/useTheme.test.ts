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

let osDark = false;
let changeHandler: ((e: { matches: boolean }) => void) | null = null;

beforeEach(() => {
  osDark = false;
  changeHandler = null;
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? osDark : false,
      addEventListener: vi.fn((_: string, handler: (e: { matches: boolean }) => void) => { changeHandler = handler; }),
      removeEventListener: vi.fn(),
    })),
  });
  document.documentElement.className = '';
  localStorage.clear();
});

describe('useTheme', () => {
  it('defaults to system theme — applies light class when OS is light', () => {
    osDark = false;
    renderHookWithProviders(() => useTheme());
    expect(document.documentElement.classList.contains(lightTheme)).toBe(true);
    expect(document.documentElement.classList.contains(darkTheme)).toBe(false);
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
    expect(result.current.theme).toBe('system');
    act(() => { result.current.setTheme('dark'); });
    expect(result.current.theme).toBe('dark');
  });

  it('removes lightTheme class when switching to dark', () => {
    const { result } = renderHookWithProviders(() => useTheme());
    act(() => { result.current.setTheme('light'); });
    expect(document.documentElement.classList.contains(lightTheme)).toBe(true);
    act(() => { result.current.setTheme('dark'); });
    expect(document.documentElement.classList.contains(lightTheme)).toBe(false);
    expect(document.documentElement.classList.contains(darkTheme)).toBe(true);
  });

  it('persists theme to localStorage and reads it back in a new store', () => {
    const { result, unmount } = renderHookWithProviders(() => useTheme());
    act(() => { result.current.setTheme('dark'); });
    expect(result.current.theme).toBe('dark');
    unmount();

    const { result: result2 } = renderHookWithProviders(() => useTheme());
    expect(result2.current.theme).toBe('dark');
  });

  it('applies dark class when theme is system and OS is dark', () => {
    osDark = true;
    renderHookWithProviders(() => useTheme());
    expect(document.documentElement.classList.contains(darkTheme)).toBe(true);
    expect(document.documentElement.classList.contains(lightTheme)).toBe(false);
  });

  it('applies light class when theme is system and OS is light', () => {
    osDark = false;
    renderHookWithProviders(() => useTheme());
    expect(document.documentElement.classList.contains(lightTheme)).toBe(true);
    expect(document.documentElement.classList.contains(darkTheme)).toBe(false);
  });

  it('re-applies theme when OS preference changes while theme is system', () => {
    osDark = false;
    renderHookWithProviders(() => useTheme());
    expect(document.documentElement.classList.contains(lightTheme)).toBe(true);

    osDark = true;
    act(() => {
      if (changeHandler) changeHandler({ matches: true });
    });
    expect(document.documentElement.classList.contains(darkTheme)).toBe(true);
    expect(document.documentElement.classList.contains(lightTheme)).toBe(false);
  });
});
