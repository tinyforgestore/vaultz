import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { themeAtom } from '@/store/atoms';
import { lightTheme, darkTheme } from '@/styles/theme.css';

export type Theme = 'light' | 'dark' | 'system';

function getOsTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getOsTheme() : theme;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.remove(lightTheme);
    root.classList.add(darkTheme);
  } else {
    root.classList.remove(darkTheme);
    root.classList.add(lightTheme);
  }
}

export function useTheme() {
  const [theme, setTheme] = useAtom(themeAtom);

  useEffect(() => {
    applyTheme(theme);

    if (theme !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return { theme, setTheme };
}
