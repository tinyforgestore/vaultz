import { style } from '@vanilla-extract/css';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  padding: '12px',
  gap: '8px',
});

export const searchInput = style({
  width: '100%',
  fontSize: '16px',
  padding: '10px 12px',
  border: '1px solid rgba(127, 127, 127, 0.3)',
  borderRadius: '8px',
  background: 'transparent',
  color: 'inherit',
  outline: 'none',
  selectors: {
    '&:focus': {
      borderColor: '#6366f1',
    },
  },
});

export const resultList = style({
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
});

export const resultRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 10px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
});

export const resultRowSelected = style({
  background: 'rgba(99, 102, 241, 0.2)',
});

export const resultMeta = style({
  fontSize: '12px',
  opacity: 0.6,
});

export const emptyPanel = style({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '14px',
  opacity: 0.5,
});

export const hintRow = style({
  fontSize: '11px',
  opacity: 0.55,
  display: 'flex',
  gap: '12px',
  paddingTop: '4px',
});
