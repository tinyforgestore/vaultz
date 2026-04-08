import { style } from '@vanilla-extract/css';

export const container = style({
  width: '490px',
  height: '100vh',
  backgroundColor: 'white',
  padding: '20px',
  display: 'grid',
  gridTemplateRows: 'auto 1fr',
  boxSizing: 'border-box',
  overflow: 'hidden',
});

export const backButton = style({
  width: 'fit-content',
});

export const contentArea = style({
  minHeight: 0,
  overflowY: 'auto',
});

export const folderRow = style({
  fontSize: '14px',
});

export const folderList = style({
  maxHeight: '64px',
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
