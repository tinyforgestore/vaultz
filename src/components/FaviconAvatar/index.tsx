import clsx from 'clsx';
import { lookupIcon } from '@/utils/faviconLookup';
import { AVATAR_COLORS, getInitials } from '@/utils/avatar';
import * as styles from './index.css';

interface FaviconAvatarProps {
  slug?: string | null;
  name: string;
  /** Numeric size (px). Discrete sizes 36/44/52 get a matching CSS variant
   *  class; other values fall back to the 36 variant. The SVG dimension is
   *  computed from `size` and applied as an SVG attribute (not inline style). */
  size?: number;
}

function pickSizeKey(size: number | undefined): '36' | '44' | '52' {
  if (size === 44) return '44';
  if (size === 52) return '52';
  return '36';
}

function fallbackColorIndex(name: string): number {
  const h = (name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0) + (name.charCodeAt(2) || 0);
  return h % AVATAR_COLORS.length;
}

export function FaviconAvatar({ slug, name, size = 36 }: FaviconAvatarProps) {
  const icon = lookupIcon(slug);
  const sizeKey = pickSizeKey(size);
  // styleVariants objects may be `undefined` under vitest's `.css.ts` mock;
  // optional chaining keeps the component renderable in tests where styles
  // are stripped to `{}`.
  const sizeClass = styles.sizeVariant?.[sizeKey];

  if (icon && slug) {
    const svgSize = Math.round(size * 0.6);
    return (
      <div
        className={clsx(styles.avatar, sizeClass, styles.brandBg?.[slug])}
        data-testid="favicon-avatar-icon"
      >
        <svg
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          width={svgSize}
          height={svgSize}
          aria-label={icon.title}
          role="img"
        >
          <path d={icon.path} fill="white" />
        </svg>
      </div>
    );
  }

  const fallbackIdx = String(fallbackColorIndex(name));
  return (
    <div
      className={clsx(styles.avatar, sizeClass, styles.fallbackBg?.[fallbackIdx])}
      data-testid="favicon-avatar-fallback"
    >
      {getInitials(name)}
    </div>
  );
}
