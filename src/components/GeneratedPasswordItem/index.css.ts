import { style } from '@vanilla-extract/css';
import { themeVars } from '@/styles/theme.css';

export const row = style({
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 10px',
  border: '1px solid var(--gray-4)',
  borderRadius: '6px',
  background: themeVars.bg.panel,
  cursor: 'pointer',
});

export const rowSelected = style({
  outline: '2px solid var(--accent-9)',
  outlineOffset: '-2px',
});

export const rowMain = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  minWidth: 0,
});

export const passwordText = style({
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '12px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const timestamp = style({
  fontSize: '11px',
  color: 'var(--gray-10)',
});

export const actions = style({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
});
