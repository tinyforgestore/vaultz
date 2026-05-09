//! Global hotkey definitions. Constants only — registration lives in
//! `lib.rs::register_global_shortcuts`. Platform-specific via `cfg` so the
//! same logical shortcut maps to Cmd on macOS / Ctrl+Super-equivalent on
//! Windows/Linux.
//!
//! Mirrors the kurippa pattern (`src-tauri/src/shortcuts.rs`): one place to
//! pin every key/modifier combination so changes don't drift across platform
//! branches in the registration code.
//!
//! Tracking:
//! - `SEARCH_*` — toggles the Quick Search overlay
//! - `GEN_*`    — toggles the Password Generator overlay
//! - `MAIN_*`   — shows + focuses the main window (no toggle, never gated)

use tauri_plugin_global_shortcut::{Code, Modifiers};

// --- Quick Search overlay ---

#[cfg(target_os = "macos")]
pub const SEARCH_MODS: Modifiers = Modifiers::META.union(Modifiers::SHIFT);
#[cfg(not(target_os = "macos"))]
pub const SEARCH_MODS: Modifiers = Modifiers::SUPER.union(Modifiers::SHIFT);
pub const SEARCH_KEY: Code = Code::KeyL;

// --- Password Generator overlay ---

#[cfg(target_os = "macos")]
pub const GEN_MODS: Modifiers = Modifiers::META.union(Modifiers::SHIFT);
#[cfg(not(target_os = "macos"))]
pub const GEN_MODS: Modifiers = Modifiers::SUPER.union(Modifiers::SHIFT);
pub const GEN_KEY: Code = Code::KeyG;

// --- Main window (Vaultz) ---

#[cfg(target_os = "macos")]
pub const MAIN_MODS: Modifiers = Modifiers::META.union(Modifiers::ALT);
#[cfg(not(target_os = "macos"))]
pub const MAIN_MODS: Modifiers = Modifiers::SUPER.union(Modifiers::ALT);
pub const MAIN_KEY: Code = Code::KeyV;
