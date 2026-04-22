import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { themeAtom } from '@/store/atoms';
import { lightTheme, darkTheme } from '@/styles/theme.css';

export function useTheme() {
  const [theme, setTheme] = useAtom(themeAtom);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.remove(lightTheme);
      root.classList.add(darkTheme);
    } else {
      root.classList.remove(darkTheme);
      root.classList.add(lightTheme);
    }
  }, [theme]);

  return { theme, setTheme };
}
