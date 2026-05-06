import { style } from '@vanilla-extract/css';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  padding: '12px',
});

export const panel = style({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '14px',
  opacity: 0.7,
  textAlign: 'center',
  padding: '20px',
});
