import { style } from '@vanilla-extract/css';

export const overlay = style({
  position: 'fixed',
  inset: 0,
  backdropFilter: 'blur(6px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  cursor: 'pointer',
});

export const content = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
  textAlign: 'center',
  padding: '0 40px',
  userSelect: 'none',
  cursor: 'default',
});

export const iconWrap = style({
  width: '110px',
  height: '110px',
  borderRadius: '50%',
  backgroundColor: 'var(--amber-9)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 0 80px rgba(245, 158, 11, 0.55)',
  marginBottom: '8px',
});

export const title = style({
  fontSize: '28px',
  fontWeight: '700',
  // color: 'white',
  margin: 0,
});

export const subtitle = style({
  fontSize: '15px',
  maxWidth: '280px',
  lineHeight: '1.6',
  margin: 0,
});

export const dismiss = style({
  marginTop: '8px',
  padding: '8px 32px',
  borderRadius: '999px',
  border: '1.5px solid',
  backgroundColor: 'transparent',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  ':hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
