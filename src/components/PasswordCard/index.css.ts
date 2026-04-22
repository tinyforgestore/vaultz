import { style } from '@vanilla-extract/css';

export const passwordCard = style({
  cursor: 'pointer',
  padding: '10px',
  flexShrink: 0,
});

export const selectedCard = style({
  outline: '2px solid var(--accent-9)',
  backgroundColor: 'var(--accent-2)',
});

export const cardFocused = style({
  outline: '2px solid var(--accent-9)',
  outlineOffset: '-1px',
  backgroundColor: 'var(--accent-4)',
});

export const checkbox = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '20px',
  height: '20px',
  borderRadius: '4px',
  border: '2px solid var(--gray-8)',
  flexShrink: 0,
  cursor: 'pointer',
  selectors: {
    '&[data-checked="true"]': {
      backgroundColor: 'var(--accent-9)',
      borderColor: 'var(--accent-9)',
    },
  },
});

export const avatar = style({
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '13px',
  fontWeight: '700',
  color: 'white',
  flexShrink: 0,
  userSelect: 'none',
});

export const passwordTitle = style({
  fontSize: '14px',
});

export const passwordSubtitle = style({
  color: 'var(--gray-11)',
  fontSize: '12px',
});

export const passwordFolderTag = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '2px 8px',
  borderRadius: '999px',
  fontSize: '11px',
  backgroundColor: 'var(--gray-3)',
  color: 'var(--gray-10)',
});

const starAmber = 'var(--amber-9)';

export const starBadge = style({
  color: starAmber,
  flexShrink: 0,
});

export const copyButton = style({
  color: 'var(--gray-9)',
});

export const copyButtonCopied = style({
  color: 'var(--green-9)',
});

export const starButton = style({
  color: starAmber,
});

export const cardBody = style({
  flex: 1,
  minWidth: 0,
});
