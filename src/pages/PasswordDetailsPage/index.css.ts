import { style } from '@vanilla-extract/css';

export const container = style({
  width: '490px',
  height: '100vh',
  backgroundColor: 'var(--gray-2)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  position: 'relative',
});

export const notFoundContainer = style({
  width: '490px',
  height: '100vh',
  backgroundColor: 'var(--gray-2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const header = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 12px',
  backgroundColor: 'var(--gray-2)',
  borderBottom: '1px solid var(--gray-4)',
  flexShrink: 0,
});

export const headerTitle = style({
  flex: 1,
  minWidth: 0,
  fontWeight: '700',
  fontSize: '15px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const contentArea = style({
  flex: 1,
  overflowY: 'auto',
  minHeight: 0,
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
});

export const avatarStrip = style({
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  padding: '14px',
  borderRadius: '12px',
  backgroundColor: 'white',
  border: '1px solid var(--gray-4)',
  marginBottom: '8px',
});

export const avatarLarge = style({
  width: '52px',
  height: '52px',
  borderRadius: '14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '18px',
  fontWeight: '800',
  color: 'white',
  flexShrink: 0,
  userSelect: 'none',
});

export const entryName = style({
  fontWeight: '700',
  fontSize: '16px',
});

export const folderBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '2px 8px',
  borderRadius: '999px',
  fontSize: '11px',
  backgroundColor: 'var(--gray-3)',
  color: 'var(--gray-10)',
  marginTop: '3px',
});

export const fieldCard = style({
  backgroundColor: 'white',
  border: '1px solid var(--gray-4)',
  borderRadius: '12px',
  padding: '12px 14px',
  marginBottom: '8px',
});

export const fieldLabelRow = style({
  color: 'var(--gray-10)',
  fontSize: '12px',
  fontWeight: '500',
  marginBottom: '6px',
});

export const fieldValue = style({
  fontSize: '13px',
  color: 'var(--gray-12)',
  wordBreak: 'break-all',
  minHeight: '18px',
});

export const fieldValueMono = style({
  fontSize: '13px',
  color: 'var(--gray-12)',
  fontFamily: 'monospace',
  letterSpacing: '0.05em',
  minHeight: '18px',
});

export const fieldEmpty = style({
  fontSize: '13px',
  color: 'var(--gray-9)',
  fontStyle: 'italic',
});

export const deleteOverlay = style({
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.4)',
  backdropFilter: 'blur(2px)',
  zIndex: 50,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  padding: '16px',
});

export const deleteSheet = style({
  width: '100%',
  maxWidth: '420px',
  backgroundColor: 'white',
  borderRadius: '16px',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
});

export const toastContainer = style({
  position: 'absolute',
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1000,
  whiteSpace: 'nowrap',
});
