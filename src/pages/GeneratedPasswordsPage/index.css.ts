import { style } from '@vanilla-extract/css';
import { themeVars } from '@/styles/theme.css';

export const container = style({
  width: '100%',
  height: '100vh',
  background: themeVars.bg.page,
  display: 'grid',
  gridTemplateRows: 'auto 1fr',
  overflow: 'hidden',
});

export const header = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  padding: '36px 12px 10px 12px',
  backgroundColor: themeVars.bg.panel,
  borderBottom: '1px solid var(--gray-4)',
  flexShrink: 0,
});

export const headerLeft = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
});

export const headerTitle = style({
  fontWeight: '700',
  fontSize: '15px',
});

export const contentArea = style({
  minHeight: 0,
  overflowY: 'auto',
  padding: '8px 12px 12px 12px',
});

export const list = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  margin: 0,
  paddingLeft: 0,
  listStyle: 'none',
});

export const empty = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 20px',
  textAlign: 'center',
  color: 'var(--gray-10)',
  fontSize: '13px',
  gap: '8px',
});

export const toastContainer = style({
  position: 'fixed',
  bottom: '16px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 100,
});
