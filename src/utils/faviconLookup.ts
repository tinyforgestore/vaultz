// Curated brand icons sourced from `simple-icons` (tree-shaken).
//
// Naming note: `favicon` throughout this codebase is the *Simple Icons slug*
// (e.g. `"github"`, `"figma"`) — NOT a URL or image. The same slug column
// also lives at `src-tauri/src/database/passwords.rs::PASSWORD_COLUMNS`.
//
// `MULTI_PART_TLDS` mirrors the Rust list at
// `src-tauri/src/database/favicon.rs::MULTI_PART_TLDS`. Keep these in sync
// manually — the lists are tiny and rarely change.
import {
  siGoogle,
  siGithub,
  siGitlab,
  siBitbucket,
  siApple,
  siDiscord,
  siZoom,
  siFigma,
  siNotion,
  siDropbox,
  siTrello,
  siAsana,
  siLinear,
  siJira,
  siConfluence,
  siAtlassian,
  siX,
  siFacebook,
  siInstagram,
  siReddit,
  siYoutube,
  siTwitch,
  siSpotify,
  siNetflix,
  siHbo,
  siPaypal,
  siStripe,
  siShopify,
  siEbay,
  siEtsy,
  siAirbnb,
  siUber,
  siLyft,
  siDoordash,
  siVenmo,
  siCashapp,
  siRobinhood,
  siCoinbase,
  siBinance,
  siTarget,
  siIkea,
  siFedex,
  siUps,
  siUsps,
  siDhl,
  siVercel,
  siNetlify,
  siCloudflare,
  siDigitalocean,
  siMongodb,
  siPostgresql,
  siRedis,
  siElastic,
  siDatadog,
  siSentry,
  siNpm,
  siDocker,
  siKubernetes,
  siJenkins,
  siCircleci,
  siCodecov,
  siSnyk,
  siBitwarden,
  siDashlane,
  siProtonmail,
  si1password,
} from 'simple-icons';

export interface FaviconIcon {
  slug: string;
  path: string;
  hex: string;
  title: string;
}

/**
 * Build a curated map of slug → icon. The slug we use is the simple-icons
 * `slug` (kebab-free, lowercase) so it matches what `slugFromUrl` derives.
 *
 * Module-private — consumers must go through `lookupIcon` /
 * `listAvailableSlugs`. This keeps the curated set behind a small,
 * stable surface so we can swap implementations later.
 */
const ICON_MAP: Record<string, FaviconIcon> = Object.fromEntries(
  [
    siGoogle,
    siGithub,
    siGitlab,
    siBitbucket,
    siApple,
    siDiscord,
    siZoom,
    siFigma,
    siNotion,
    siDropbox,
    siTrello,
    siAsana,
    siLinear,
    siJira,
    siConfluence,
    siAtlassian,
    siX,
    siFacebook,
    siInstagram,
    siReddit,
    siYoutube,
    siTwitch,
    siSpotify,
    siNetflix,
    siHbo,
    siPaypal,
    siStripe,
    siShopify,
    siEbay,
    siEtsy,
    siAirbnb,
    siUber,
    siLyft,
    siDoordash,
    siVenmo,
    siCashapp,
    siRobinhood,
    siCoinbase,
    siBinance,
    siTarget,
    siIkea,
    siFedex,
    siUps,
    siUsps,
    siDhl,
    siVercel,
    siNetlify,
    siCloudflare,
    siDigitalocean,
    siMongodb,
    siPostgresql,
    siRedis,
    siElastic,
    siDatadog,
    siSentry,
    siNpm,
    siDocker,
    siKubernetes,
    siJenkins,
    siCircleci,
    siCodecov,
    siSnyk,
    siBitwarden,
    siDashlane,
    siProtonmail,
    si1password,
  ].map((icon) => [icon.slug, { slug: icon.slug, path: icon.path, hex: icon.hex, title: icon.title }]),
);

const MULTI_PART_TLDS = new Set([
  'co.uk', 'co.jp', 'co.kr', 'co.nz', 'com.au', 'com.br',
  'co.in', 'co.za', 'com.mx', 'com.tr', 'ne.jp', 'or.jp',
]);

/**
 * Derive a candidate slug from a URL. Returns `null` for empty input,
 * IPv4/IPv6, single-label hosts, or anything that sanitizes to empty.
 */
export function slugFromUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  let host: string;
  try {
    const withScheme = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    host = new URL(withScheme).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (!host) return null;
  if (/^[\d.]+$/.test(host)) return null; // IPv4
  if (host.startsWith('[') || host.includes(':')) return null; // IPv6
  const labels = host.split('.').filter(Boolean);
  if (labels.length < 2) return null;
  const lastTwo = labels.slice(-2).join('.');
  const sld = MULTI_PART_TLDS.has(lastTwo) && labels.length >= 3
    ? labels[labels.length - 3]
    : labels[labels.length - 2];
  const slug = sld.replace(/[^a-z0-9]/g, '');
  return slug || null;
}

/** Returns the curated icon if a slug matches the map, else null. */
export function lookupIcon(slug: string | null | undefined): FaviconIcon | null {
  if (!slug) return null;
  return ICON_MAP[slug] ?? null;
}

/**
 * Sluggify a free-text label (e.g. service name) by lowercasing and stripping
 * everything outside `[a-z0-9]`. Used as a fallback when the URL field is
 * empty so the auto-detect chain can still match the service name itself.
 */
export function slugFromText(input: string | null | undefined): string | null {
  if (!input) return null;
  const slug = input.toLowerCase().replace(/[^a-z0-9]/g, '');
  return slug || null;
}

/** Sorted list of all available slugs for picker UIs. */
export function listAvailableSlugs(): string[] {
  return Object.keys(ICON_MAP).sort();
}

/**
 * Build-time list of `[slug, hex]` pairs — used by `FaviconAvatar/index.css.ts`
 * to generate one CSS class per brand color (avoids inline `style`). Plain
 * data, no FaviconIcon path content.
 */
export const BRAND_HEXES: Array<[string, string]> = Object.entries(ICON_MAP).map(
  ([slug, icon]) => [slug, icon.hex],
);
