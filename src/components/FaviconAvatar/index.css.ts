import { style, styleVariants } from '@vanilla-extract/css';
import { AVATAR_COLORS } from '@/utils/avatar';
import { BRAND_HEXES } from '@/utils/faviconLookup';

// Static base — every avatar shares these.
export const avatar = style({
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: '700',
  color: 'white',
  flexShrink: 0,
  userSelect: 'none',
  overflow: 'hidden',
});

// Discrete sizes used across the app: cell-inner avatar (36), icon-row preview
// (44), detail-page avatar (52). Anything else falls back to the 36 variant.
export const sizeVariant = styleVariants({
  '36': { width: '36px', height: '36px', fontSize: '13px' },
  '44': { width: '44px', height: '44px', fontSize: '16px' },
  '52': { width: '52px', height: '52px', fontSize: '18px' },
});

// One class per curated brand — emitted at build time from `BRAND_HEXES`.
// Lookup is `brandBg[slug]`; missing slugs fall through to fallback colors.
export const brandBg = styleVariants(
  Object.fromEntries(BRAND_HEXES.map(([slug, hex]) => [slug, { background: `#${hex}` }])),
);

// One class per fallback palette index — used when no brand icon is available
// (i.e. lookupIcon returns null). Index is derived deterministically from the
// entry name hash to keep colors stable.
export const fallbackBg = styleVariants(
  Object.fromEntries(AVATAR_COLORS.map((c, i) => [String(i), { background: c }])),
);
