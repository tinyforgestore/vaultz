import { style } from '@vanilla-extract/css';
import {
  PICKER_WIDTH,
  PICKER_HEIGHT,
  CELL_SIZE,
} from './pickerConstants';

/* --- form fields --- */
export const fieldLabel = style({
  fontSize: '13px',
});

export const requiredStar = style({
  color: 'var(--red-10)',
});

export const dialogContent = style({
  maxWidth: '380px',
  maxHeight: '85vh',
  overflow: 'auto',
});

export const passwordInput = style({
  flex: 1,
});

export const generatorBox = style({
  border: '1px solid var(--blue-6)',
  borderRadius: '8px',
  padding: '12px',
  backgroundColor: 'var(--blue-2)',
});

/* --- icon row --- */
export const iconRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '4px 0',
});

export const iconLabelStack = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  flex: 1,
  minWidth: 0,
});

export const iconLabelPrimary = style({
  fontSize: '13px',
  color: 'var(--gray-12)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const iconLabelSecondary = style({
  fontSize: '11px',
  color: 'var(--gray-10)',
});

/* --- picker popover --- */

// Strips Radix Themes' Popover.Content default padding/max-width so the
// inner `iconPickerPopup` div can own its own size. `!important` is required
// because Radix emits its own classes with the same specificity; without it
// the inner div ends up wrapped in a 16px-padded, capped-width frame.
export const popoverContentReset = style({
  padding: '0 !important',
  maxWidth: 'none !important',
  width: 'auto !important',
});

export const iconPickerPopup = style({
  // Plain div inside Popover.Content — Popover only positions, this owns size.
  width: `${PICKER_WIDTH}px`,
  height: `${PICKER_HEIGHT}px`,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

export const pickerHeader = style({
  padding: '12px 12px 0',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
});

export const searchWrap = style({
  position: 'relative',
});

export const searchIcon = style({
  position: 'absolute',
  left: '10px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'var(--gray-10)',
  pointerEvents: 'none',
});

export const searchInput = style({
  boxSizing: 'border-box',
  width: '100%',
  padding: '7px 10px 7px 30px',
  fontSize: '13px',
  border: '1px solid var(--gray-6)',
  borderRadius: '6px',
  background: 'var(--gray-2)',
  color: 'var(--gray-12)',
  outline: 'none',
  selectors: {
    '&:focus': {
      borderColor: 'var(--accent-9)',
      boxShadow: '0 0 0 2px var(--accent-a4)',
    },
  },
});

export const tabStrip = style({
  display: 'flex',
  gap: '6px',
});

export const tab = style({
  fontSize: '12px',
  padding: '4px 12px',
  borderRadius: '999px',
  border: '1px solid var(--gray-6)',
  background: 'transparent',
  cursor: 'pointer',
  color: 'var(--gray-11)',
  fontWeight: 500,
  selectors: {
    '&:hover': { background: 'var(--gray-3)' },
    '&[data-active="true"]': {
      background: 'var(--accent-9)',
      color: 'white',
      borderColor: 'var(--accent-9)',
    },
  },
});

export const sectionLabel = style({
  fontSize: '10px',
  color: 'var(--gray-10)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  padding: '10px 12px 4px',
  fontWeight: 500,
});

/* --- picker grid --- */
export const iconList = style({
  overflowY: 'auto',
  overflowX: 'hidden',
  display: 'grid',
  // Fixed 5×CELL_SIZE px cells so a single item never inflates to fill the row.
  gridTemplateColumns: `repeat(5, ${CELL_SIZE}px)`,
  gridAutoRows: `${CELL_SIZE}px`,
  justifyContent: 'space-between',
  gap: '4px',
  padding: '4px 12px 12px',
  flex: 1,
  minHeight: 0,
});

export const iconItem = style({
  width: `${CELL_SIZE}px`,
  height: `${CELL_SIZE}px`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: '1px solid transparent',
  borderRadius: '8px',
  padding: '4px',
  cursor: 'pointer',
  position: 'relative',
  transition: 'background 120ms, border-color 120ms',
  selectors: {
    '&:hover': {
      background: 'var(--gray-3)',
      borderColor: 'var(--gray-6)',
    },
    '&[data-active="true"]': {
      borderColor: 'var(--accent-9)',
      background: 'var(--accent-a3)',
    },
  },
});

export const iconCheckBadge = style({
  position: 'absolute',
  top: '3px',
  right: '3px',
  width: '14px',
  height: '14px',
  background: 'var(--accent-9)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'white',
});

export const emptyMessage = style({
  gridColumn: '1 / -1',
  textAlign: 'center',
  padding: '24px 0',
  fontSize: '13px',
  color: 'var(--gray-10)',
});

/* --- picker footer --- */
export const pickerFooter = style({
  borderTop: '1px solid var(--gray-5)',
  padding: '10px 12px',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
});
