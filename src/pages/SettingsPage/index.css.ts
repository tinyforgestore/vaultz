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
  gap: '8px',
  padding: '36px 12px 10px 12px',
  backgroundColor: themeVars.bg.panel,
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

export const upgradeCard = style({
  border: '1px solid var(--amber-9)',
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

export const kbdKey = style({
  display: 'inline-block',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '11px',
  lineHeight: '1',
  padding: '2px 6px',
  borderRadius: '4px',
  background: 'var(--gray-3)',
  border: '1px solid var(--gray-6)',
  color: 'var(--gray-12)',
  whiteSpace: 'nowrap',
});


