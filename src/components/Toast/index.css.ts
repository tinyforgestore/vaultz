import { style } from '@vanilla-extract/css';
import { themeVars } from '@/styles/theme.css';

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
  boxShadow: themeVars.shadow.toast,
  whiteSpace: 'nowrap',
  userSelect: 'none',
});

export const iconSlot = style({
  display: 'flex',
  alignItems: 'center',
});
