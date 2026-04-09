import { style } from '@vanilla-extract/css';
import { themeVars } from '@/styles/theme.css';

export const container = style({
  width: '490px',
  height: '100vh',
  background: themeVars.pageBackground,
  display: 'grid',
  gridTemplateRows: 'auto 1fr',
  overflow: 'hidden',
});

export const header = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '20px 12px 10px 12px',
  backgroundColor: 'white',
  borderBottom: '1px solid var(--gray-4)',
  flexShrink: 0,
});

export const headerTitle = style({
  fontWeight: '700',
  fontSize: '15px',
});

export const contentArea = style({
  minHeight: 0,
  overflowY: 'auto',
  padding: '12px 20px 20px 20px',
});

export const folderRow = style({
  fontSize: '14px',
});

export const folderList = style({
  maxHeight: '156px',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  scrollbarWidth: 'none',
  selectors: {
    '&::-webkit-scrollbar': {
      display: 'none',
    },
  },
});

export const dangerCard = style({
  border: '1px solid var(--red-7)',
});

export const securityButton = style({
  justifyContent: 'flex-start',
});

export const aboutText = style({
  fontSize: '13px',
});

export const toastContainer = style({
  position: 'fixed',
  bottom: 20,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1000,
});
