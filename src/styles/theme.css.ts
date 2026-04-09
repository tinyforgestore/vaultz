import { createThemeContract, createTheme } from '@vanilla-extract/css';

export const themeVars = createThemeContract({
  pageBackground: null,
  pageBgBase: null,
});

export const lightTheme = createTheme(themeVars, {
  pageBackground: 'radial-gradient(ellipse at 50% 25%, rgba(99, 102, 241, 0.14) 0%, #f3f4fd 65%)',
  pageBgBase: '#f3f4fd',
});
