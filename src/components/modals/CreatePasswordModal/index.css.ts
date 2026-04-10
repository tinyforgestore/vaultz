import { style } from '@vanilla-extract/css';

export const fieldLabel = style({
  fontSize: '13px',
});

export const requiredStar = style({
  color: 'var(--red-10)',
});

export const dialogContent = style({
  maxWidth: '380px',
  maxHeight: '85vh',
  overflow: 'auto',
});

export const passwordInput = style({
  flex: 1,
});

export const generatorBox = style({
  border: '1px solid var(--blue-6)',
  borderRadius: '8px',
  padding: '12px',
  backgroundColor: 'var(--blue-2)',
});
