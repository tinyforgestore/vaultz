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

export const dangerHeading = style({
  color: 'var(--red-11)',
});

export const dangerActionButton = style({
  flex: 1,
});

export const securityButton = style({
  justifyContent: 'flex-start',
});

export const toastContainer = style({
  position: 'fixed',
  bottom: 20,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1000,
});

export const licenseCard = style({
  border: '1px solid var(--amber-9)',
});

export const licenseIconWrap = style({
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  border: '1px solid var(--amber-10)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

export const licenseInput = style({
  flex: 1,
});

export const membershipPlanPro = style({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '12px',
  fontWeight: '700',
  color: 'var(--amber-10)',
});

export const membershipPlanFree = style({
  fontSize: '12px',
  color: 'var(--gray-10)',
});

export const aboutFooter = style({
  fontSize: '14px',
  color: 'var(--gray-10)',
  textAlign: 'center',
});

export const proWelcomeOverlay = style({
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

export const proWelcomeContent = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
  textAlign: 'center',
  padding: '0 40px',
  userSelect: 'none',
});

export const proWelcomeIconWrap = style({
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

export const proWelcomeTitle = style({
  fontSize: '28px',
  fontWeight: '700',
  color: 'white',
  margin: 0,
});

export const proWelcomeSubtitle = style({
  fontSize: '15px',
  color: 'rgba(255, 255, 255, 0.75)',
  maxWidth: '280px',
  lineHeight: '1.6',
  margin: 0,
});

export const proWelcomeDismiss = style({
  marginTop: '8px',
  padding: '8px 32px',
  borderRadius: '999px',
  border: '1.5px solid rgba(255, 255, 255, 0.45)',
  backgroundColor: 'transparent',
  color: 'white',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  ':hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});

