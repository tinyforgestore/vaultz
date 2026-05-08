// Layout constants for the icon picker. Shared between the JSX file and the
// vanilla-extract stylesheet so the popover, grid cells, and avatars stay in
// sync if any one value changes.

export const PICKER_WIDTH = 320;
export const PICKER_HEIGHT = 280;
export const CELL_SIZE = 52;
// Avatar sizes must be in FaviconAvatar's discrete size set: 36 | 44 | 52.
export const CELL_INNER_AVATAR = 36 as const;
export const ROW_AVATAR_SIZE = 44 as const;
