import { globalStyle } from '@vanilla-extract/css';

globalStyle(':root', {
  vars: {
    '--default-font-family': '"Inter Variable", "Inter", sans-serif',
    '--code-font-family': '"JetBrains Mono Variable", "JetBrains Mono", monospace',
  },
});

globalStyle('html, body', {
  margin: 0,
  padding: 0,
  width: '100%',
  height: '100%',
  overflow: 'hidden',
});

globalStyle('#root', {
  width: '100%',
  height: '100%',
});

globalStyle('*', {
  userSelect: 'none',
  WebkitUserSelect: 'none',
});
