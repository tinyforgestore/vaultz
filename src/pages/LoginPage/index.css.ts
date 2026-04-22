import { style, keyframes } from '@vanilla-extract/css';
import { themeVars } from '@/styles/theme.css';

const shake = keyframes({
  '0%, 100%': { transform: 'translateX(0)' },
  '20%': { transform: 'translateX(-8px)' },
  '40%': { transform: 'translateX(8px)' },
  '60%': { transform: 'translateX(-5px)' },
  '80%': { transform: 'translateX(5px)' },
});

export const container = style({
  width: '490px',
  height: '100vh',
  background: themeVars.bg.page,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  boxSizing: 'border-box',
  position: 'relative',
  overflow: 'hidden',
});

export const dragRegion = style({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: '28px',
});

export const card = style({
  backgroundColor: themeVars.bg.card,
  border: '1px solid var(--gray-4)',
  borderRadius: '20px',
  padding: '30px 25px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '100%',
  boxSizing: 'border-box',
  boxShadow: themeVars.shadow.card,
  position: 'relative',
  zIndex: 1,
});

export const cardShaking = style({
  animation: `${shake} 0.4s ease`,
});

export const lockIconBox = style({
  width: '120px',
  height: '120px',
  borderRadius: '28px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'var(--accent-3)',
});

export const lockIcon = style({
  width: '100%',
  height: '100%',
  objectFit: 'contain',
});

export const cardTitle = style({
  fontSize: '26px',
  fontWeight: '800',
  color: 'var(--gray-12)',
  letterSpacing: '-0.02em',
  marginBottom: '-10px',
  textAlign: 'center',
});

export const cardSubtitle = style({
  fontSize: '14px',
  color: 'var(--gray-10)',
  marginBottom: '24px',
  textAlign: 'center',
});

export const form = style({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  boxSizing: 'border-box',
});

export const inputWrapper = style({
  position: 'relative',
  width: '100%',
});

export const passwordInput = style({
  width: '100%',
  height: '48px',
  backgroundColor: 'var(--gray-1)',
  border: '1px solid var(--accent-7)',
  borderRadius: '999px',
  padding: '0 48px 0 18px',
  fontSize: '14px',
  color: 'var(--gray-12)',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  selectors: {
    '&::placeholder': {
      color: 'var(--gray-9)',
    },
    '&:focus': {
      borderColor: 'var(--accent-9)',
      boxShadow: '0 0 0 3px var(--accent-4)',
    },
    '&:disabled': {
      opacity: 0.6,
    },
  },
});

export const eyeToggle = style({
  position: 'absolute',
  right: '14px',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--gray-9)',
  display: 'flex',
  alignItems: 'center',
  padding: '4px',
  transition: 'color 0.15s',
  ':hover': {
    color: 'var(--gray-12)',
  },
});

export const errorText = style({
  fontSize: '12px',
  color: 'var(--red-10)',
  textAlign: 'center',
  marginTop: '-4px',
});

export const unlockButton = style({
  width: '100%',
  height: '48px',
  backgroundColor: 'var(--accent-9)',
  border: 'none',
  borderRadius: '999px',
  color: 'white',
  fontSize: '15px',
  fontWeight: '700',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  marginTop: '4px',
  boxSizing: 'border-box',
  transition: 'background-color 0.15s, transform 0.1s',
  ':hover': {
    backgroundColor: 'var(--accent-10)',
  },
  ':active': {
    transform: 'scale(0.98)',
  },
  selectors: {
    '&:disabled': {
      opacity: 0.4,
      cursor: 'not-allowed',
      transform: 'none',
    },
  },
});

export const restoreLink = style({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '13px',
  color: 'var(--gray-10)',
  textDecoration: 'underline',
  textUnderlineOffset: '3px',
  alignSelf: 'center',
  marginTop: '4px',
  transition: 'color 0.15s',
  ':hover': {
    color: 'var(--gray-12)',
  },
});

export const welcomeActions = style({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  boxSizing: 'border-box',
});

export const createButton = style({
  width: '100%',
  height: '48px',
  backgroundColor: 'var(--accent-9)',
  border: 'none',
  borderRadius: '999px',
  color: 'white',
  fontSize: '15px',
  fontWeight: '600',
  cursor: 'pointer',
  boxSizing: 'border-box',
  transition: 'background-color 0.15s',
  ':hover': {
    backgroundColor: 'var(--accent-10)',
  },
});

export const importButton = style({
  width: '100%',
  height: '48px',
  backgroundColor: 'transparent',
  border: '1px solid var(--gray-6)',
  borderRadius: '999px',
  color: 'var(--gray-11)',
  fontSize: '15px',
  fontWeight: '500',
  cursor: 'pointer',
  boxSizing: 'border-box',
  transition: 'background-color 0.15s',
  ':hover': {
    backgroundColor: 'var(--gray-3)',
  },
});

export const toastContainer = style({
  position: 'absolute',
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1000,
  whiteSpace: 'nowrap',
});

export const dialogContent = style({
  maxWidth: '380px',
});
