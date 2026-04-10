import { style } from '@vanilla-extract/css';

export const toastWrapper = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  background: 'var(--gray-12)',
  color: 'var(--gray-1)',
  padding: '8px 14px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: '500',
  boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
  whiteSpace: 'nowrap',
  userSelect: 'none',
});

export const iconSlot = style({
  display: 'flex',
  alignItems: 'center',
});
