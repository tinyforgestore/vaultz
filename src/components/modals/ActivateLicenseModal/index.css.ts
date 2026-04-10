import { style } from '@vanilla-extract/css';

export const overlay = style({
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.78)',
  backdropFilter: 'blur(6px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  cursor: 'pointer',
});

export const content = style({
  backgroundColor: 'white',
  borderRadius: '16px',
  padding: '32px 28px',
  width: '360px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  cursor: 'default',
});

export const heading = style({
  fontSize: '20px',
  fontWeight: '700',
  margin: 0,
  color: 'var(--gray-12)',
});

export const errorText = style({
  fontSize: '13px',
  color: 'var(--red-10)',
});

export const activateButton = style({
  width: '100%',
});

export const buyLink = style({
  background: 'none',
  border: 'none',
  color: 'var(--accent-11)',
  fontSize: '13px',
  cursor: 'pointer',
  padding: 0,
  textDecoration: 'underline',
  display: 'block',
  textAlign: 'center',
  ':hover': {
    color: 'var(--accent-12)',
  },
});
