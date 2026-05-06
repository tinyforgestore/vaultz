import { style } from '@vanilla-extract/css';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  padding: '16px',
  gap: '12px',
});

export const headerRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const hintRow = style({
  fontSize: '11px',
  opacity: 0.55,
  display: 'flex',
  gap: '12px',
  paddingTop: '4px',
});
