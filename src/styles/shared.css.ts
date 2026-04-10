import { style } from '@vanilla-extract/css';

export const upgradeBanner = style({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  fontSize: '12px',
  backgroundColor: 'var(--accent-3)',
  borderRadius: '8px',
});

export const upgradeBannerText = style({
  flex: 1,
  fontSize: '12px',
  color: 'var(--accent-11)',
});

export const upgradeBannerCta = style({
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--accent-11)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
});
