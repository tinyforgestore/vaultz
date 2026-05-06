import { globalStyle } from '@vanilla-extract/css';

// Transparent rounded popup window — must apply to BOTH html/body and #root
// per Tauri guidelines, with !important on body to defeat WebView default.
globalStyle('html, body', {
  background: 'transparent !important',
  borderRadius: '12px',
  overflow: 'hidden',
  margin: 0,
  padding: 0,
  width: '100%',
  height: '100%',
});

globalStyle('#root', {
  background: 'var(--color-panel-solid, #1e1e2e)',
  borderRadius: '12px',
  overflow: 'hidden',
  width: '100%',
  height: '100%',
});

globalStyle(':root', {
  vars: {
    '--default-font-family': '"Inter Variable", "Inter", sans-serif',
    '--code-font-family': '"JetBrains Mono Variable", "JetBrains Mono", monospace',
  },
});

globalStyle('*, *::before, *::after', {
  boxSizing: 'border-box',
  userSelect: 'none',
  WebkitUserSelect: 'none',
});
