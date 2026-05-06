// Delay between writing a secret to the clipboard and hiding the overlay
// window — gives the OS time to register the clipboard write before the
// window-blur teardown.
export const HIDE_AFTER_COPY_MS = 200;
