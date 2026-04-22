import { globalStyle } from '@vanilla-extract/css';

globalStyle(':root', {
  vars: {
    '--default-font-family': '"Inter Variable", "Inter", sans-serif',
    '--code-font-family': '"JetBrains Mono Variable", "JetBrains Mono", monospace',
  },
});

globalStyle('html, body', {
  overflow: 'hidden',
});

globalStyle('*', {
  userSelect: 'none',
  WebkitUserSelect: 'none',
});
