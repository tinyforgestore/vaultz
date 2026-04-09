import { globalStyle } from '@vanilla-extract/css';

globalStyle('html, body', {
  overflow: 'hidden',
});

globalStyle('*', {
  userSelect: 'none',
  WebkitUserSelect: 'none',
});
