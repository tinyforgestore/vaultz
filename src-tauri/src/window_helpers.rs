//! Shared show/hide helpers for Tauri windows. Used from `lib.rs` setup and
//! from `commands/overlay.rs` so both paths share one canonical implementation.

use tauri::{AppHandle, Manager};

/// Shows the window with the given label (if it exists) and gives it focus.
/// Best-effort: errors from individual Tauri calls are propagated, but a
/// missing window is treated as a no-op.
pub fn show_window(app: &AppHandle, label: &str) -> Result<(), tauri::Error> {
    if let Some(win) = app.get_webview_window(label) {
        win.show()?;
        win.set_focus()?;
    }
    Ok(())
}

/// Hides the window with the given label (if it exists). A missing window is
/// treated as a no-op.
pub fn hide_window(app: &AppHandle, label: &str) -> Result<(), tauri::Error> {
    if let Some(win) = app.get_webview_window(label) {
        win.hide()?;
    }
    Ok(())
}

/// Toggles the visibility of the window with the given label.
pub fn toggle_window(app: &AppHandle, label: &str) -> Result<(), tauri::Error> {
    if let Some(win) = app.get_webview_window(label) {
        let visible = win.is_visible().unwrap_or(false);
        if visible {
            win.hide()?;
        } else {
            win.show()?;
            win.set_focus()?;
        }
    }
    Ok(())
}
