import { style } from '@vanilla-extract/css';
import { themeVars } from '@/styles/theme.css';
import {
  upgradeBanner as sharedUpgradeBanner,
  upgradeBannerText,
  upgradeBannerCta,
} from '@/styles/shared.css';

export { upgradeBannerText, upgradeBannerCta };

export const container = style({
  width: '100%',
  height: '100vh',
  overflow: 'hidden',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
});

export const topPanel = style({
  flexShrink: 0,
  padding: '36px 12px 10px 12px',
  backgroundColor: themeVars.bg.panel,
  borderBottom: '1px solid var(--gray-4)',
  boxShadow: themeVars.shadow.topPanel,
  marginBottom: '4px',
});

export const brandRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '10px',
});

export const brandLogo = style({
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'var(--accent-3)',
  border: '1px solid var(--accent-6)',
  flexShrink: 0,
});

export const brandName = style({
  fontWeight: '700',
  fontSize: '15px',
  letterSpacing: '-0.01em',
});

export const tabStrip = style({
  display: 'flex',
  flexDirection: 'row',
  overflowX: 'auto',
  minWidth: 0,
  flexShrink: 0,
  marginTop: '10px',
  gap: '4px',
  scrollbarWidth: 'none',
  selectors: {
    '&::-webkit-scrollbar': {
      display: 'none',
    },
  },
});

export const tab = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  padding: '5px 11px',
  fontSize: '12px',
  fontWeight: '500',
  borderRadius: '999px',
  border: 'none',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  backgroundColor: 'var(--gray-4)',
  color: 'var(--gray-11)',
  ':hover': {
    backgroundColor: 'var(--gray-5)',
  },
});

export const tabActive = style({
  backgroundColor: 'var(--accent-9)',
  color: 'white',
  ':hover': {
    backgroundColor: 'var(--accent-10)',
  },
});

export const emptyState = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  minHeight: '200px',
  textAlign: 'center',
  color: 'var(--gray-10)',
});

export const emptyIcon = style({
  width: '48px',
  height: '48px',
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'var(--gray-4)',
});

export const folderCount = style({
  fontSize: '11px',
  opacity: 0.7,
});

export const mainContent = style({
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  background: themeVars.bg.page,
  position: 'relative',
});

export const searchContainer = style({
  width: '100%',
});

export const passwordList = style({
  flex: 1,
  overflowY: 'auto',
  padding: '8px 12px 60px 12px',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
  WebkitOverflowScrolling: 'touch',
  selectors: {
    '&::-webkit-scrollbar': {
      display: 'none',
    },
  },
});

export const floatingButtonContainer = style({
  position: 'absolute',
  bottom: '20px',
  right: '20px',
});

export const floatingButton = style({
  width: '44px',
  height: '44px',
  cursor: 'pointer',
});

export const toastContainer = style({
  position: 'fixed',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1000,
});

export const newFolderButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  padding: '5px 11px',
  fontSize: '12px',
  fontWeight: '500',
  borderRadius: '999px',
  border: 'none',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  backgroundColor: 'var(--gray-4)',
  color: 'var(--gray-11)',
  ':hover': {
    backgroundColor: 'var(--gray-5)',
  },
});

export const upgradeBanner = style([sharedUpgradeBanner, { marginTop: '6px' }]);

export const logoutDialogContent = style({
  maxWidth: '380px',
});

export const toastDefault = style({
  bottom: '20px',
});

export const toastElevated = style({
  bottom: '60px',
});

export const bulkToolbar = style({
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: 'var(--gray-3)',
  borderTop: '1px solid var(--gray-6)',
  padding: '8px 12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  zIndex: 10,
});
