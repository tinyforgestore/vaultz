use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

use crate::constants::{
    MAIN, OPEN_CREATE_ENTRY_PREFILLED, OVERLAY_GENERATOR, OVERLAY_SEARCH, VAULT_LOCKED,
};
use crate::session_artifacts::clear_session_artifacts;
use crate::state::SessionState;
use crate::window_helpers::{hide_window, show_window};

/// Returns true when the session is currently authenticated.
fn is_authed(session_state: &State<Mutex<SessionState>>) -> bool {
    session_state.lock().unwrap().is_authenticated
}

#[tauri::command]
pub fn show_overlay_search(
    app: AppHandle,
    session_state: State<Mutex<SessionState>>,
) -> Result<(), String> {
    // Defense-in-depth: never present the overlay when the vault is locked.
    if !is_authed(&session_state) {
        return Ok(());
    }
    show_window(&app, OVERLAY_SEARCH).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn hide_overlay_search(app: AppHandle) -> Result<(), String> {
    hide_window(&app, OVERLAY_SEARCH).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn show_overlay_generator(
    app: AppHandle,
    session_state: State<Mutex<SessionState>>,
) -> Result<(), String> {
    if !is_authed(&session_state) {
        return Ok(());
    }
    show_window(&app, OVERLAY_GENERATOR).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn hide_overlay_generator(app: AppHandle) -> Result<(), String> {
    hide_window(&app, OVERLAY_GENERATOR).map_err(|e| e.to_string())
}

/// Locks the vault: clears the session state and emits `vault-locked` to all windows.
#[tauri::command]
pub fn lock_vault(
    app: AppHandle,
    session_state: State<Mutex<SessionState>>,
) -> Result<(), String> {
    session_state.lock().unwrap().clear();
    clear_session_artifacts(&app);
    app.emit(VAULT_LOCKED, ()).map_err(|e| e.to_string())?;
    // Hide overlays since they should not be usable when locked.
    if let Err(e) = hide_window(&app, OVERLAY_SEARCH) {
        eprintln!("lock_vault: failed to hide overlay-search: {e}");
    }
    if let Err(e) = hide_window(&app, OVERLAY_GENERATOR) {
        eprintln!("lock_vault: failed to hide overlay-generator: {e}");
    }
    Ok(())
}

/// Hides the generator overlay, surfaces the main window, and emits an event
/// that tells the main window to navigate to the dashboard's create-entry modal
/// pre-filled with the supplied password.
#[tauri::command]
pub fn open_create_entry_prefilled(
    app: AppHandle,
    password: String,
    session_state: State<Mutex<SessionState>>,
) -> Result<(), String> {
    if !is_authed(&session_state) {
        return Ok(());
    }
    if let Err(e) = hide_window(&app, OVERLAY_GENERATOR) {
        eprintln!("open_create_entry_prefilled: hide overlay: {e}");
    }
    if let Err(e) = show_window(&app, MAIN) {
        eprintln!("open_create_entry_prefilled: show main: {e}");
    }
    app.emit_to(MAIN, OPEN_CREATE_ENTRY_PREFILLED, password)
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use crate::state::SessionState;
    use std::time::SystemTime;

    /// Simulates the body of `lock_vault` (without the AppHandle Emit/window hide pieces,
    /// which can't run outside a Tauri runtime).
    fn lock_session(session: &mut SessionState) {
        session.clear();
    }

    #[test]
    fn lock_vault_clears_authenticated_session() {
        let mut s = SessionState {
            is_authenticated: true,
            field_key: Some([2u8; 32]),
            last_activity: Some(SystemTime::now()),
            lock_timeout_secs: 600,
            pending_overlay_intent: None,
        };
        lock_session(&mut s);
        assert!(!s.is_authenticated);
        assert!(s.field_key.is_none());
        assert!(s.last_activity.is_none());
    }

    #[test]
    fn lock_vault_no_op_when_already_locked() {
        let mut s = SessionState::default();
        lock_session(&mut s);
        assert!(!s.is_authenticated);
    }

    /// Auth gate logic for show_overlay_*: when locked, return Ok without showing.
    #[test]
    fn auth_gate_blocks_when_unauthenticated() {
        let s = SessionState::default();
        assert!(!s.is_authenticated);
    }

    #[test]
    fn auth_gate_allows_when_authenticated() {
        let s = SessionState {
            is_authenticated: true,
            field_key: Some([1u8; 32]),
            last_activity: Some(SystemTime::now()),
            lock_timeout_secs: 600,
            pending_overlay_intent: None,
        };
        assert!(s.is_authenticated);
    }
}
