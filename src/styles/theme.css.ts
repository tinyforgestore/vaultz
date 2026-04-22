import { createThemeContract, createTheme } from '@vanilla-extract/css';

export const themeVars = createThemeContract({
  bg: {
    page: null,
    // pageSolid: non-gradient fallback for contexts where radial-gradient is
    // not suitable (e.g. solid colour backgrounds, screenshots, print).
    pageSolid: null,
    // card: elevated surface (white card on a paged background — adds depth).
    card: null,
    // panel: flush toolbar/header surface (same visual layer as the window chrome,
    //         not raised above the page — use for top bars and side panels).
    panel: null,
  },
  shadow: {
    card: null,
    topPanel: null,
    toast: null,
    // proIconGlow: amber glow applied specifically to the Pro icon in ProWelcomeModal.
    proIconGlow: null,
  },
});

export const lightTheme = createTheme(themeVars, {
  bg: {
    page: 'radial-gradient(ellipse at 50% 25%, rgba(99, 102, 241, 0.14) 0%, #f3f4fd 65%)',
    pageSolid: '#f3f4fd',
    card: 'white',
    panel: 'white',
  },
  shadow: {
    card: '0 4px 24px rgba(0,0,0,0.06)',
    topPanel: '0 2px 8px rgba(0,0,0,0.04)',
    toast: '0 4px 20px rgba(0,0,0,0.35)',
    proIconGlow: '0 0 80px rgba(245,158,11,0.55)',
  },
});

export const darkTheme = createTheme(themeVars, {
  bg: {
    page: 'radial-gradient(ellipse at 50% 25%, rgba(99, 102, 241, 0.10) 0%, #1a1a2e 65%)',
    pageSolid: '#1a1a2e',
    card: 'var(--color-panel-solid)',
    panel: 'var(--color-panel-solid)',
  },
  shadow: {
    card: '0 4px 24px rgba(0,0,0,0.3)',
    topPanel: '0 2px 8px rgba(0,0,0,0.2)',
    toast: '0 4px 20px rgba(0,0,0,0.6)',
    proIconGlow: '0 0 80px rgba(245,158,11,0.35)',
  },
});
