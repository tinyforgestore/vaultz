/**
 * Returns true when the keyboard event originates from a form element or
 * contenteditable surface where typing should not trigger global shortcuts.
 *
 * Pass `{ includeButton: true }` to also treat focused `<button>` elements as
 * "input" — used by the generated-passwords page so e.g. pressing `c` while a
 * row's button is focused doesn't fire the copy shortcut.
 */
export function isFromInput(
  e: KeyboardEvent,
  opts?: { includeButton?: boolean },
): boolean {
  const target = e.target as HTMLElement | null;
  if (!target) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (opts?.includeButton && tag === 'BUTTON') return true;
  return !!target.isContentEditable;
}
