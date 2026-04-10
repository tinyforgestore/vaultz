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
  backgroundColor: 'white',
  borderRadius: '16px',
  padding: '32px 28px',
  width: '340px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
  textAlign: 'center',
  cursor: 'default',
});

export const iconWrap = style({
  width: '80px',
  height: '80px',
  borderRadius: '50%',
  backgroundColor: 'var(--amber-3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '4px',
});

export const heading = style({
  fontSize: '22px',
  fontWeight: '700',
  margin: 0,
  color: 'var(--gray-12)',
});

export const benefitsList = style({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  width: '100%',
  textAlign: 'left',
});

export const benefitItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '14px',
  color: 'var(--gray-11)',
  ':before': {
    content: '✓',
    color: 'var(--green-9)',
    fontWeight: '700',
    flexShrink: 0,
  },
});

export const activateLink = style({
  background: 'none',
  border: 'none',
  color: 'var(--accent-11)',
  fontSize: '13px',
  cursor: 'pointer',
  padding: 0,
  textDecoration: 'underline',
  ':hover': {
    color: 'var(--accent-12)',
  },
});
